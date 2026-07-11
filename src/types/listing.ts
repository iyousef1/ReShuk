import type { Timestamp } from 'firebase/firestore';

/**
 * Listing lifecycle states. Only `active` is produced by the current create
 * flows, but search treats every non-active state as hidden so the model can
 * grow (sold / draft / etc.) without leaking hidden items into results.
 */
export type ListingStatus =
  | 'active'
  | 'sold'
  | 'reserved'
  | 'draft'
  | 'hidden'
  | 'deleted'
  | 'unavailable';

/**
 * Free-form per-category attributes (brand, model, color, size, storage, …).
 * Values are always strings in Firestore; keep the index signature loose but
 * typed rather than `any`.
 */
export interface ListingAttributes {
  brand?: string;
  model?: string;
  condition?: string;
  color?: string;
  size?: string;
  storage?: string;
  ram?: string;
  material?: string;
  gender?: string;
  [key: string]: string | undefined;
}

/**
 * The canonical shape of a document in the `listings` collection, as written by
 * both the manual sell flow and the AI-assist flow. Every field except `id` is
 * optional so legacy / partial documents stay compatible.
 */
export interface ListingDocument {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  location?: string;
  category?: string;
  sub_category?: string;
  brand?: string;
  model?: string;
  condition?: string;
  color?: string;
  attributes?: ListingAttributes;
  image_url?: string | string[];
  seller_id?: string;
  status?: ListingStatus | string;
  is_ai_priced?: boolean;
  ai_confidence?: string;
  ai_confidence_reason?: string | null;
  search_terms?: string[];
  created_at?: Timestamp | null;
}
