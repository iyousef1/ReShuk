// AI Seller Assistant — safety validator
//
// Runs AFTER the model returns its structured result. The model's own risk
// assessment is never trusted on its own: this validator can only make the
// outcome MORE restrictive (force seller approval / flag risk), never less.

import { AiReplyResult, ListingAiInfo, SellerAiSettings } from './types';

const MIN_AUTO_CONFIDENCE = 0.8;

// Heuristics are intentionally conservative — a false positive just means the
// seller has to approve a draft, a false negative could auto-send a bad reply.
const PHONE_REGEX = /(\+?\d[\d\s\-().]{7,}\d)/;
const WHATSAPP_REGEX = /whats\s?app|wa\.me/i;
const URL_REGEX = /https?:\/\/\S+|www\.\S+|\S+\.(com|net|io|me|ly|app)\/\S*/i;
const DEAL_CONFIRMATION_REGEX = /\b(deal|sold|it'?s yours|i accept|we have an agreement|confirmed)\b/i;
const MEETUP_CONFIRMATION_REGEX = /\b(see you (at|on)|meet (you )?(at|on) \d|tomorrow at \d|today at \d|\d{1,2}(:\d{2})?\s?(am|pm)\b.*\b(at|in)\b)/i;
const OFF_PLATFORM_PAYMENT_REGEX = /\b(bank transfer|wire|western union|paypal( friends)?|crypto|bitcoin|gift ?card|pay (outside|off) (the )?(app|platform)|send (me )?money first|deposit)\b/i;

type ValidatorInput = {
  result: AiReplyResult;
  buyerMessage: string;
  settings: SellerAiSettings;
  aiInfo: ListingAiInfo;
};

/**
 * Returns a (possibly) downgraded copy of the AI result. Each triggered rule
 * appends its reason so the seller can see why approval is required.
 */
export function validateAiReply({ result, buyerMessage, settings, aiInfo }: ValidatorInput): AiReplyResult {
  const reasons: string[] = [];
  let flagRisk = false;

  const reply = result.reply ?? '';

  // 1. Reply offers a price below the seller's minimum
  if (aiInfo.minimumPrice != null) {
    const pricesInReply = (reply.match(/\d[\d,]*(\.\d+)?/g) ?? [])
      .map((n) => Number(n.replace(/,/g, '')))
      .filter((n) => n > 0 && n < 1_000_000); // ignore years/phone fragments already caught elsewhere
    if (pricesInReply.some((p) => p < aiInfo.minimumPrice!)) {
      reasons.push(`Reply mentions a price below your minimum (${aiInfo.minimumPrice})`);
    }
  }

  // 2. Reply agrees to a final deal
  if (DEAL_CONFIRMATION_REGEX.test(reply)) {
    reasons.push('Reply appears to confirm a final deal');
  }

  // 3. Reply confirms an exact meetup time/place
  if (result.intent === 'meetup_question' && MEETUP_CONFIRMATION_REGEX.test(reply)) {
    reasons.push('Reply appears to confirm an exact meetup time/place');
  }

  // 4. Reply shares phone/WhatsApp when disabled
  if (!settings.allowPhoneSharing && PHONE_REGEX.test(reply)) {
    reasons.push('Reply contains a phone number but phone sharing is disabled');
  }
  if (!settings.allowWhatsAppSharing && WHATSAPP_REGEX.test(reply)) {
    reasons.push('Reply mentions WhatsApp but WhatsApp sharing is disabled');
  }

  // 5. Buyer asks for off-platform payment
  if (settings.blockOffPlatformPayment && OFF_PLATFORM_PAYMENT_REGEX.test(buyerMessage)) {
    reasons.push('Buyer message suggests off-platform payment');
    flagRisk = true;
  }

  // 6. Suspicious payment links in the buyer message or reply
  if (URL_REGEX.test(buyerMessage)) {
    reasons.push('Buyer message contains a link');
    flagRisk = settings.flagSuspiciousMessages;
  }
  if (URL_REGEX.test(reply)) {
    reasons.push('AI reply contains a link');
  }

  // 7. Low confidence
  if (result.confidence < MIN_AUTO_CONFIDENCE) {
    reasons.push(`Confidence ${result.confidence.toFixed(2)} is below ${MIN_AUTO_CONFIDENCE}`);
  }

  // 8. Model-reported risk
  if (result.riskLevel !== 'low') {
    reasons.push(`Model rated risk as ${result.riskLevel}`);
    if (result.riskLevel === 'high') flagRisk = true;
  }

  // 9. The model itself asked for approval or flagged something
  if (result.needsSellerApproval || result.action === 'ask_seller' || result.action === 'flag_risk') {
    if (result.action === 'flag_risk') flagRisk = true;
    if (reasons.length === 0) reasons.push(result.reason || 'Model requested seller review');
  }

  // 10. Intents that must never auto-send regardless of model output
  const NEVER_AUTO_INTENTS = new Set([
    'price_negotiation',
    'meetup_question',
    'contact_request',
    'payment_question',
    'suspicious_message',
  ]);
  if (NEVER_AUTO_INTENTS.has(result.intent)) {
    reasons.push(`Intent "${result.intent}" always requires seller approval`);
    if (result.intent === 'suspicious_message') flagRisk = true;
  }

  if (reasons.length === 0) {
    // Safe — keep the model's action, allow auto-send eligibility
    return { ...result, shouldAutoSend: result.action === 'auto_reply' };
  }

  return {
    ...result,
    action: flagRisk ? 'flag_risk' : result.action === 'ask_seller' ? 'ask_seller' : 'draft_reply',
    needsSellerApproval: true,
    shouldAutoSend: false,
    reason: reasons.join(' · '),
  };
}
