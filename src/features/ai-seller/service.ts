// AI Seller Assistant — reply generation service
//
// Client-side equivalent of POST /api/ai/seller-reply (this app has no backend;
// Firestore is accessed directly and the Anthropic API is called with the same
// fetch pattern used elsewhere in the codebase — see src/lib/places.ts).
//
// ⚠️ The API key comes from EXPO_PUBLIC_ANTHROPIC_API_KEY, which is bundled
// into the client. This matches the existing app pattern but means the key IS
// exposed to anyone who unpacks the app. For production, move this call into a
// Firebase Cloud Function and keep the key server-side.

import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import {
  getListingAiInfo,
  getListingQAs,
  getRecentMessages,
  getSellerAiSettings,
  getSellerQAs,
  logAiReply,
} from './api';
import { validateAiReply } from './safetyValidator';
import { AiReplyResult, CustomQA, ListingAiInfo, SellerAiSettings } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-8';

const SELLER_REPLY_TOOL = {
  name: 'seller_reply',
  description: 'Return the structured analysis and reply draft for the buyer message.',
  input_schema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: [
          'availability_question',
          'price_question',
          'price_negotiation',
          'product_detail_question',
          'meetup_question',
          'delivery_question',
          'payment_question',
          'contact_request',
          'suspicious_message',
          'other',
        ],
      },
      riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
      action: { type: 'string', enum: ['draft_reply', 'auto_reply', 'ask_seller', 'flag_risk'] },
      reply: { type: 'string', description: 'The reply to the buyer. Empty string when action is flag_risk or ask_seller and no safe reply exists.' },
      confidence: { type: 'number', description: '0 to 1. How certain you are the reply is fully supported by the provided facts.' },
      matchedQAId: { type: ['string', 'null'], description: 'ID of the saved Q&A used, or null.' },
      needsSellerApproval: { type: 'boolean' },
      reason: { type: 'string', description: 'One short sentence explaining your action choice.' },
    },
    required: ['intent', 'riskLevel', 'action', 'reply', 'confidence', 'matchedQAId', 'needsSellerApproval', 'reason'],
  },
};

const TONE_GUIDE: Record<string, string> = {
  short: 'Very short. One or two sentences, no pleasantries.',
  friendly_short: 'Short and friendly. One to three sentences, warm but efficient.',
  professional: 'Polite and professional. Complete sentences, no slang.',
  casual: 'Casual and relaxed, like texting a friend. Still respectful.',
};

function buildSystemPrompt(settings: SellerAiSettings): string {
  return `You are an AI assistant helping sellers reply to buyer messages in reShuk, a second-hand marketplace app.

STRICT RULES — never break these:
- Use ONLY the facts provided in the context below (listing data, listing AI info, saved Q&A, seller settings, conversation history). NEVER invent details — if a fact is missing, do not guess; set action to "ask_seller" and explain what is missing.
- NEVER offer or agree to a price below the seller's minimum price.
- NEVER share a phone number${settings.allowPhoneSharing ? ' unless the seller settings allow it' : ' — sharing is disabled'}.
- NEVER mention WhatsApp${settings.allowWhatsAppSharing ? ' unless the seller settings allow it' : ' — sharing is disabled'}.
- NEVER encourage or accept off-platform payment. If the buyer pushes for it, set intent to "suspicious_message" and action to "flag_risk".
- If the buyer message contains links, requests for deposits/gift cards/wires, or anything that looks like a scam, set intent "suspicious_message", riskLevel "high", action "flag_risk".
- Never confirm a final deal or an exact meetup time/place yourself — draft the reply but set needsSellerApproval to true.
${settings.replyInBuyerLanguage ? '- Reply in the same language the buyer wrote in.' : '- Always reply in English.'}

PRIORITY ORDER when answering (highest first):
1. Listing-specific saved Q&A
2. Listing AI info
3. Listing fields (title, price, category, description)
4. Seller-wide saved Q&A
5. Seller AI settings (payment, meetup, delivery)
6. Conversation history

If a saved Q&A is semantically similar to the buyer's question (e.g. "Can I test it?" matches "Can I try it before I pay?"), use its answer and set matchedQAId. Only set action "auto_reply" when a matched Q&A has autoReplyAllowed=true OR the answer is a plain low-risk fact fully covered by the listing data.

TONE: ${TONE_GUIDE[settings.tone] ?? TONE_GUIDE.friendly_short}
Keep replies natural — write like the seller, not like a bot. Never mention that you are an AI.

Always call the seller_reply tool exactly once.`;
}

function buildContextMessage(args: {
  listing: any;
  aiInfo: ListingAiInfo;
  settings: SellerAiSettings;
  sellerQAs: CustomQA[];
  listingQAs: CustomQA[];
  history: { senderId: string; text: string }[];
  sellerId: string;
  buyerMessage: string;
}): string {
  const { listing, aiInfo, settings, sellerQAs, listingQAs, history, sellerId, buyerMessage } = args;

  const qaBlock = (qas: CustomQA[]) =>
    qas.filter((q) => q.enabled).length === 0
      ? '(none)'
      : qas
          .filter((q) => q.enabled)
          .map((q) => `- [id=${q.id}] [autoReplyAllowed=${q.autoReplyAllowed}] Q: ${q.question} → A: ${q.answer}`)
          .join('\n');

  const historyBlock =
    history.length === 0
      ? '(no prior messages)'
      : history.map((m) => `${m.senderId === sellerId ? 'SELLER' : 'BUYER'}: ${m.text}`).join('\n');

  return `LISTING:
Title: ${listing.title ?? '(unknown)'}
Price: ${listing.price ?? '(unknown)'}
Category: ${listing.category ?? '(unknown)'}${listing.sub_category ? ` / ${listing.sub_category}` : ''}
Description: ${listing.description ?? '(none)'}

LISTING AI INFO:
Condition: ${aiInfo.condition || '(not provided)'}
Defects: ${aiInfo.defects.length ? aiInfo.defects.join(', ') : '(none listed)'}
Included items: ${aiInfo.includedItems.length ? aiInfo.includedItems.join(', ') : '(not provided)'}
Missing items: ${aiInfo.missingItems.length ? aiInfo.missingItems.join(', ') : '(none listed)'}
Warranty: ${aiInfo.warranty || '(not provided)'}
Reason for selling: ${aiInfo.reasonForSelling || '(not provided)'}
Negotiable: ${aiInfo.negotiable}
Minimum price (NEVER go below, NEVER reveal to buyer): ${aiInfo.minimumPrice ?? '(not set)'}
Preferred price: ${aiInfo.preferredPrice ?? '(not set)'}
Pickup areas: ${aiInfo.pickupAreas.length ? aiInfo.pickupAreas.join(', ') : '(not provided)'}
Delivery: ${aiInfo.deliveryAvailable ? `yes, fee: ${aiInfo.deliveryFee ?? 'unspecified'}` : 'no'}
Extra notes: ${aiInfo.extraNotes || '(none)'}

LISTING-SPECIFIC SAVED Q&A:
${qaBlock(listingQAs)}

SELLER-WIDE SAVED Q&A:
${qaBlock(sellerQAs.filter((q) => q.scope === 'seller'))}

SELLER SETTINGS:
Accepted payment methods: ${settings.acceptedPaymentMethods.join(', ') || '(not set)'}
Preferred meetup areas: ${settings.preferredMeetupAreas.join(', ') || '(not set)'}
Public meetup only: ${settings.publicMeetupOnly}
Delivery available: ${settings.deliveryAvailable}${settings.deliveryAreas.length ? ` (areas: ${settings.deliveryAreas.join(', ')})` : ''}

CONVERSATION HISTORY (oldest first):
${historyBlock}

NEW BUYER MESSAGE:
${buyerMessage}`;
}

export type SellerReplyRequest = {
  conversationId: string;
  listingId: string;
  buyerMessage: string;
};

/**
 * Generates an AI reply suggestion for a buyer message.
 * Returns null when AI is disabled (mode "off" or aiEnabled false).
 * Throws when the caller is not the seller of this conversation.
 */
export async function generateSellerReply({
  conversationId,
  listingId,
  buyerMessage,
}: SellerReplyRequest): Promise<AiReplyResult | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Must be logged in');

  // --- Authorization: caller must be the seller in this conversation ---
  const chatSnap = await getDoc(doc(db, 'chats', conversationId));
  if (!chatSnap.exists()) throw new Error('Conversation not found');
  const chat = chatSnap.data();
  if (chat.sellerId !== uid) throw new Error('Only the seller can use the AI assistant in this chat');

  // --- Settings gate ---
  const settings = await getSellerAiSettings();
  if (!settings.aiEnabled || settings.mode === 'off') return null;

  // --- Gather context ---
  const listingSnap = await getDoc(doc(db, 'listings', listingId));
  if (!listingSnap.exists()) throw new Error('Listing not found');
  const listing = listingSnap.data();
  if (listing.seller_id !== uid) throw new Error('You are not the seller of this listing');

  const [aiInfo, sellerQAs, listingQAs, history] = await Promise.all([
    getListingAiInfo(listingId),
    getSellerQAs(),
    getListingQAs(listingId),
    getRecentMessages(conversationId),
  ]);

  // --- Call Claude ---
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set in .env');

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(settings),
      tools: [SELLER_REPLY_TOOL],
      tool_choice: { type: 'tool', name: 'seller_reply' },
      messages: [
        {
          role: 'user',
          content: buildContextMessage({ listing, aiInfo, settings, sellerQAs, listingQAs, history, sellerId: uid, buyerMessage }),
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Claude API error ${response.status}: ${data?.error?.message ?? 'Unknown error'}`);
  }

  const toolUse = (data.content ?? []).find((b: any) => b.type === 'tool_use' && b.name === 'seller_reply');
  if (!toolUse) throw new Error('AI did not return a structured reply');

  const raw = toolUse.input as Omit<AiReplyResult, 'shouldAutoSend'>;

  // --- Safety validation (can only make the result more restrictive) ---
  let result = validateAiReply({
    result: { ...raw, shouldAutoSend: false },
    buyerMessage,
    settings,
    aiInfo,
  });

  // --- Mode rules ---
  if (settings.mode === 'draft_only') {
    // never auto-send in draft mode
    result = { ...result, shouldAutoSend: false, needsSellerApproval: true };
  }
  // auto_safe: shouldAutoSend stays true only if the validator left it true

  // --- Log ---
  await logAiReply({
    sellerId: uid,
    buyerId: chat.buyerId,
    listingId,
    conversationId,
    buyerMessage,
    aiReply: result.reply,
    intent: result.intent,
    riskLevel: result.riskLevel,
    action: result.action,
    confidence: result.confidence,
    matchedQAId: result.matchedQAId,
    needsSellerApproval: result.needsSellerApproval,
    wasAutoSent: result.shouldAutoSend,
    sellerEditedReply: null,
  });

  return result;
}
