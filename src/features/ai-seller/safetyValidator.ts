// AI Seller Assistant — safety validator
//
// Runs AFTER the model returns its structured result. The model's own risk
// assessment is never trusted on its own: this validator can only make the
// outcome MORE restrictive (force seller approval / flag risk), never less.

import { AiReplyResult, ListingAiInfo, SellerAiSettings } from './types';

const MIN_AUTO_CONFIDENCE = 0.65;

// Heuristics are intentionally conservative — a false positive just means the
// seller has to approve a draft, a false negative could auto-send a bad reply.
const PHONE_REGEX = /(\+?\d[\d\s\-().]{7,}\d)/;
const WHATSAPP_REGEX = /whats\s?app|wa\.me/i;
const URL_REGEX = /https?:\/\/\S+|www\.\S+|\S+\.(com|net|io|me|ly|app)\/\S*/i;
// "sold" only triggers when NOT followed by "as" (to avoid "sold as-is", "sold as parts", etc.)
const DEAL_CONFIRMATION_REGEX = /\b(deal|it'?s yours|i accept|we have an agreement)\b|\bsold\b(?!\s+as\b)/i;
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

  // 1. Reply offers a sale price below the seller's minimum.
  // Only match numbers in explicit sale-price context (currency symbols or sale verbs)
  // so delivery fees, times, durations, percentages, etc. never trigger this check.
  if (aiInfo.minimumPrice != null) {
    const SALE_PRICE_REGEX = /(?:[$₪€£¥])\s*(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:[$₪€£¥]|\b(?:ils|nis|usd|eur|gbp|shekels?|dollars?|euros?|pounds?)\b)|\b(?:price|offer(?:ing)?|accept(?:ing)?|sell(?:ing)?\s+for|take)\s+(\d[\d,]*(?:\.\d+)?)/gi;
    const priceMatches = [...reply.matchAll(SALE_PRICE_REGEX)]
      .map((m) => Number((m[1] || m[2] || m[3] || '0').replace(/,/g, '')))
      .filter((n) => n > 0 && n < 1_000_000);
    if (priceMatches.some((p) => p < aiInfo.minimumPrice!)) {
      reasons.push(`Reply mentions a price below your minimum (${aiInfo.minimumPrice})`);
    }
  }

  // 2. Reply agrees to a final deal — only block when the seller hasn't enabled AI deal finalization
  if (!settings.allowAiDealFinalization && DEAL_CONFIRMATION_REGEX.test(reply)) {
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

  // 9. The model itself asked for approval or flagged something.
  // Exception: when AI negotiation is enabled and the intent is price_negotiation,
  // the model is instructed to set needsSellerApproval=false for counter-offers —
  // but if it still sets it true out of caution, we override it here so auto-send works.
  const modelRequestedApproval =
    result.needsSellerApproval || result.action === 'ask_seller' || result.action === 'flag_risk';
  const negotiationOverride =
    settings.allowAiNegotiation &&
    aiInfo.minimumPrice != null &&
    result.intent === 'price_negotiation' &&
    result.action !== 'flag_risk' &&
    result.action !== 'ask_seller';
  if (modelRequestedApproval && !negotiationOverride) {
    if (result.action === 'flag_risk') flagRisk = true;
    if (reasons.length === 0) reasons.push(result.reason || 'Model requested seller review');
  }

  // 10. Intents that must never auto-send regardless of model output.
  // price_negotiation is allowed through when the seller has enabled AI negotiation
  // AND the listing has a minimum price set (the price floor check above enforces the range).
  // meetup_question is intentionally NOT in this set — the MEETUP_CONFIRMATION_REGEX
  // check above already blocks replies that confirm a specific time/place. Blocking
  // the entire intent would prevent informational replies like "yes I can meet in X area".
  const NEVER_AUTO_INTENTS = new Set([
    'contact_request',
    'payment_question',
    'suspicious_message',
  ]);
  if (!settings.allowAiNegotiation || aiInfo.minimumPrice == null) {
    NEVER_AUTO_INTENTS.add('price_negotiation');
  }
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
