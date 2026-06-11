// AI Seller Assistant — shared types

export type AiMode = 'off' | 'draft_only' | 'auto_safe';
export type AiTone = 'short' | 'friendly_short' | 'professional' | 'casual';

export type SellerAiSettings = {
  aiEnabled: boolean;
  mode: AiMode;
  replyInBuyerLanguage: boolean;
  tone: AiTone;
  allowPhoneSharing: boolean;
  allowWhatsAppSharing: boolean;
  acceptedPaymentMethods: string[];
  preferredMeetupAreas: string[];
  publicMeetupOnly: boolean;
  deliveryAvailable: boolean;
  deliveryAreas: string[];
  blockOffPlatformPayment: boolean;
  flagSuspiciousMessages: boolean;
  allowAiNegotiation: boolean;
};

export const DEFAULT_AI_SETTINGS: SellerAiSettings = {
  aiEnabled: false,
  mode: 'off',
  replyInBuyerLanguage: true,
  tone: 'friendly_short',
  allowPhoneSharing: false,
  allowWhatsAppSharing: false,
  acceptedPaymentMethods: ['Cash'],
  preferredMeetupAreas: [],
  publicMeetupOnly: true,
  deliveryAvailable: false,
  deliveryAreas: [],
  blockOffPlatformPayment: true,
  flagSuspiciousMessages: true,
  allowAiNegotiation: false,
};

export type ListingAiInfo = {
  condition: string;
  defects: string[];
  includedItems: string[];
  missingItems: string[];
  warranty: string;
  reasonForSelling: string;
  negotiable: boolean;
  minimumPrice: number | null;
  preferredPrice: number | null;
  pickupAreas: string[];
  deliveryAvailable: boolean;
  deliveryFee: number | null;
  extraNotes: string;
};

export const DEFAULT_LISTING_AI_INFO: ListingAiInfo = {
  condition: '',
  defects: [],
  includedItems: [],
  missingItems: [],
  warranty: '',
  reasonForSelling: '',
  negotiable: true,
  minimumPrice: null,
  preferredPrice: null,
  pickupAreas: [],
  deliveryAvailable: false,
  deliveryFee: null,
  extraNotes: '',
};

export type QAScope = 'seller' | 'listing';

export type CustomQA = {
  id: string;
  sellerId: string;
  question: string;
  answer: string;
  scope: QAScope;
  listingId: string | null;
  autoReplyAllowed: boolean;
  enabled: boolean;
  createdAt: any;
  updatedAt: any;
};

export type AiIntent =
  | 'availability_question'
  | 'price_question'
  | 'price_negotiation'
  | 'product_detail_question'
  | 'meetup_question'
  | 'delivery_question'
  | 'payment_question'
  | 'contact_request'
  | 'suspicious_message'
  | 'other';

export type AiRiskLevel = 'low' | 'medium' | 'high';
export type AiAction = 'draft_reply' | 'auto_reply' | 'ask_seller' | 'flag_risk';

export type AiReplyResult = {
  intent: AiIntent;
  riskLevel: AiRiskLevel;
  action: AiAction;
  reply: string;
  confidence: number;
  matchedQAId: string | null;
  needsSellerApproval: boolean;
  reason: string;
  // computed locally after safety validation, never by the model
  shouldAutoSend: boolean;
};

export type AiReplyLog = {
  sellerId: string;
  buyerId: string;
  listingId: string;
  conversationId: string;
  buyerMessage: string;
  aiReply: string;
  intent: AiIntent;
  riskLevel: AiRiskLevel;
  action: AiAction;
  confidence: number;
  matchedQAId: string | null;
  needsSellerApproval: boolean;
  wasAutoSent: boolean;
  sellerEditedReply: string | null;
  createdAt: any;
};
