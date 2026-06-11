// AI Seller Assistant — example/seed data for demos and testing.
//
// Call seedAiAssistantExampleData() once from anywhere (e.g. a dev-only button)
// while logged in as a seller. It enables the assistant in draft mode and adds
// a few seller-wide Q&As. Optionally pass a listingId to also seed listing AI
// info and a listing-specific Q&A.

import { createQA, updateListingAiInfo, updateSellerAiSettings } from './api';

export async function seedAiAssistantExampleData(listingId?: string): Promise<void> {
  await updateSellerAiSettings({
    aiEnabled: true,
    mode: 'draft_only',
    replyInBuyerLanguage: true,
    tone: 'friendly_short',
    allowPhoneSharing: false,
    allowWhatsAppSharing: false,
    acceptedPaymentMethods: ['Cash', 'Bit'],
    preferredMeetupAreas: ['Tel Aviv center', 'Dizengoff Mall'],
    publicMeetupOnly: true,
    deliveryAvailable: false,
    deliveryAreas: [],
    blockOffPlatformPayment: true,
    flagSuspiciousMessages: true,
  });

  await createQA({
    question: 'Can I test it before buying?',
    answer: 'Of course! You can check it when we meet, before you pay.',
    scope: 'seller',
    autoReplyAllowed: true,
    enabled: true,
  });

  await createQA({
    question: 'Is the price negotiable?',
    answer: "There's a little room, but the price is close to final.",
    scope: 'seller',
    autoReplyAllowed: false, // negotiation always needs seller approval
    enabled: true,
  });

  await createQA({
    question: 'Where can we meet?',
    answer: 'I prefer public places around Tel Aviv center — Dizengoff Mall works great.',
    scope: 'seller',
    autoReplyAllowed: false,
    enabled: true,
  });

  if (listingId) {
    await updateListingAiInfo(listingId, {
      condition: 'Used for about a year, works perfectly, battery health 92%.',
      defects: ['small scratch on the back corner'],
      includedItems: ['original box', 'charging cable'],
      missingItems: ['earphones'],
      warranty: 'No warranty remaining',
      reasonForSelling: 'Upgraded to a newer model',
      negotiable: true,
      minimumPrice: 380,
      preferredPrice: 450,
      pickupAreas: ['Tel Aviv center'],
      deliveryAvailable: false,
      deliveryFee: null,
      extraNotes: 'Always kept in a case with a screen protector.',
    });

    await createQA({
      question: 'Does it come with the original box?',
      answer: 'Yes, original box and charging cable are included. Earphones are not.',
      scope: 'listing',
      listingId,
      autoReplyAllowed: true,
      enabled: true,
    });
  }
}

/*
Example buyer messages to demo each AI behavior path:

  "Is this still available?"            → low risk, may auto-reply in auto_safe mode
  "Can I try it before I pay?"          → matches saved Q&A semantically (different wording)
  "Would you take 300 for it?"          → price_negotiation → draft, never auto-sent;
                                          below minimumPrice (380) → forced approval
  "What's your phone number?"           → contact_request → draft only, no number shared
  "I'll pay by bank transfer, click
   this link to receive the money:
   http://sketchy.example/pay"          → suspicious_message → flag_risk warning card
  "Does it have any scratches?"         → answered from listing AI info defects
  "Does it work with 220V?"             → fact not in any data → ask_seller (missing info)
*/
