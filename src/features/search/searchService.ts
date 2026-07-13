import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/src/lib/firebase';
import type { ListingDocument } from '@/src/types/listing';

import {
  expandTokens,
  normalizeText,
  tokenize,
  withinEditDistance,
} from './normalize';
import type { SearchFilters, SearchResult, SortOption } from './types';

/**
 * Number of raw documents pulled from Firestore per network round-trip. The
 * screen paginates on *matched* results; the hook keeps requesting raw batches
 * until it has collected a screen page worth of matches (or the collection is
 * exhausted), so this is a network batch size, not the visible page size.
 */
export const RAW_BATCH_SIZE = 40;

/** Statuses that should never appear in search results. */
const HIDDEN_STATUSES = new Set<string>([
  'sold',
  'reserved',
  'draft',
  'hidden',
  'deleted',
  'unavailable',
]);

type FirestoreSort = { field: 'created_at' | 'price'; dir: 'asc' | 'desc' };

const SORT_CONFIG: Record<Exclude<SortOption, 'relevance'>, FirestoreSort> = {
  newest: { field: 'created_at', dir: 'desc' },
  oldest: { field: 'created_at', dir: 'asc' },
  price_asc: { field: 'price', dir: 'asc' },
  price_desc: { field: 'price', dir: 'desc' },
};

export type PageCursor = QueryDocumentSnapshot<DocumentData> | null;

export interface RawPage {
  docs: ListingDocument[];
  cursor: PageCursor;
  exhausted: boolean;
}

export class OfflineError extends Error {
  constructor(message = 'offline') {
    super(message);
    this.name = 'OfflineError';
  }
}

function hasErrorCode(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === code
  );
}

/**
 * Fetch one raw batch of listings ordered by the sort field, resuming after
 * `cursor`. Uses single-field `orderBy` only, so it relies on Firestore's
 * automatic single-field indexes — no composite index is required to run.
 *
 * Throws `OfflineError` when the device has no connectivity and Firestore
 * cannot serve the request.
 */
export async function fetchRawPage(
  sort: SortOption,
  cursor: PageCursor,
): Promise<RawPage> {
  const cfg = sort === 'relevance' ? SORT_CONFIG.newest : SORT_CONFIG[sort];

  const constraints: QueryConstraint[] = [orderBy(cfg.field, cfg.dir)];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(RAW_BATCH_SIZE));

  try {
    const snap = await getDocs(query(collection(db, 'listings'), ...constraints));
    const docs: ListingDocument[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ListingDocument, 'id'>),
    }));
    const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : cursor;
    return { docs, cursor: last, exhausted: snap.docs.length < RAW_BATCH_SIZE };
  } catch (err) {
    if (hasErrorCode(err, 'unavailable') || hasErrorCode(err, 'failed-precondition')) {
      throw new OfflineError();
    }
    throw err;
  }
}

/** Non-active listings are hidden; an absent status is treated as active. */
function isVisibleStatus(listing: ListingDocument): boolean {
  const status = listing.status;
  if (!status || status === 'active') return true;
  return !HIDDEN_STATUSES.has(status);
}

function toMillis(value: ListingDocument['created_at']): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  return null;
}

const DATE_WINDOWS: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

function attributeValue(listing: ListingDocument, key: string): string {
  const direct = (listing as unknown as Record<string, unknown>)[key];
  if (typeof direct === 'string' && direct) return direct;
  const attr = listing.attributes?.[key];
  return typeof attr === 'string' ? attr : '';
}

/**
 * Apply every non-text facet. Returns true when the listing passes the filters,
 * status, ownership, and date rules. Text matching is handled separately by the
 * scorer so it can drive relevance ranking.
 */
export function passesFilters(
  listing: ListingDocument,
  filters: SearchFilters,
  currentUid: string | null,
): boolean {
  // Ownership — never show the searcher their own listings (matches feed).
  if (currentUid && listing.seller_id === currentUid) return false;

  // Status
  if (filters.status === 'available' && !isVisibleStatus(listing)) return false;
  if (filters.status === 'sold' && listing.status !== 'sold') return false;
  // 'all' still hides deleted/draft/hidden — those are never user-facing.
  if (
    filters.status === 'all' &&
    listing.status &&
    listing.status !== 'active' &&
    listing.status !== 'sold' &&
    listing.status !== 'reserved'
  ) {
    return false;
  }

  if (filters.category && listing.category !== filters.category) return false;
  if (filters.subCategory && listing.sub_category !== filters.subCategory) return false;

  if (filters.brand) {
    const brand = attributeValue(listing, 'brand');
    if (brand !== filters.brand) return false;
  }

  if (filters.condition) {
    const condition = attributeValue(listing, 'condition');
    if (condition !== filters.condition) return false;
  }

  if (filters.color) {
    const color = attributeValue(listing, 'color');
    if (color !== filters.color) return false;
  }

  if (filters.size) {
    const size = attributeValue(listing, 'size');
    if (size !== filters.size) return false;
  }

  if (filters.location) {
    const target = normalizeText(filters.location);
    const loc = normalizeText(listing.location);
    if (!loc.includes(target)) return false;
  }

  const price = typeof listing.price === 'number' ? listing.price : null;
  if (filters.minPrice) {
    const min = Number(filters.minPrice);
    if (!Number.isNaN(min) && (price === null || price < min)) return false;
  }
  if (filters.maxPrice) {
    const max = Number(filters.maxPrice);
    if (!Number.isNaN(max) && (price === null || price > max)) return false;
  }

  if (filters.date) {
    const window = DATE_WINDOWS[filters.date];
    const created = toMillis(listing.created_at);
    if (window) {
      if (created === null) return false;
      if (Date.now() - created > window) return false;
    }
  }

  return true;
}

interface WeightedField {
  text: string;
  weight: number;
}

function collectFields(listing: ListingDocument): WeightedField[] {
  const attrs = listing.attributes ?? {};
  const attrText = Object.values(attrs)
    .filter((v): v is string => typeof v === 'string')
    .join(' ');

  return [
    { text: normalizeText(listing.title), weight: 10 },
    { text: normalizeText((listing.search_terms ?? []).join(' ')), weight: 8 },
    { text: normalizeText(listing.brand ?? attributeValue(listing, 'brand')), weight: 7 },
    { text: normalizeText(listing.model ?? attributeValue(listing, 'model')), weight: 7 },
    { text: normalizeText(listing.category), weight: 5 },
    { text: normalizeText(listing.sub_category), weight: 5 },
    { text: normalizeText(listing.condition ?? attributeValue(listing, 'condition')), weight: 4 },
    { text: normalizeText(listing.location), weight: 4 },
    { text: normalizeText(listing.color ?? attributeValue(listing, 'color')), weight: 3 },
    { text: normalizeText(attrText), weight: 3 },
    { text: normalizeText(listing.description), weight: 2 },
  ].filter((f) => f.text.length > 0);
}

/** Best per-token score across all weighted fields. */
function tokenScore(token: string, fields: WeightedField[]): number {
  const fuzzy = token.length >= 4; // only tolerate typos on longer tokens
  let best = 0;

  for (const field of fields) {
    if (field.text.includes(token)) {
      // Whole-word hit ranks above a mid-word substring hit.
      const wholeWord = field.text.split(' ').some((w) => w === token);
      const score = field.weight * (wholeWord ? 1 : 0.7);
      if (score > best) best = score;
      continue;
    }
    if (fuzzy) {
      const words = field.text.split(' ');
      for (const w of words) {
        if (w.length >= 3 && withinEditDistance(token, w, 1)) {
          const score = field.weight * 0.5;
          if (score > best) best = score;
          break;
        }
      }
    }
  }

  return best;
}

/**
 * Score a listing against a query. Returns 0 when any query token fails to
 * match anywhere (AND across tokens, OR across fields), so non-matches are
 * dropped. A listing with no query passed in scores 0 — callers should skip
 * scoring entirely when the query is empty.
 */
export function scoreListing(listing: ListingDocument, queryText: string): number {
  const tokens = tokenize(queryText);
  if (tokens.length === 0) return 0;

  const fields = collectFields(listing);
  if (fields.length === 0) return 0;

  const fullPhrase = normalizeText(queryText);
  let total = 0;

  for (const token of tokens) {
    // Expand this single token with synonyms and take the best matching form.
    const forms = expandTokens([token]);
    let bestForToken = 0;
    for (const form of forms) {
      const s = tokenScore(form, fields);
      if (s > bestForToken) bestForToken = s;
    }
    if (bestForToken === 0) return 0; // required token missing -> no match
    total += bestForToken;
  }

  // Phrase bonus: reward listings whose title/high-weight field contains the
  // full query as a contiguous substring.
  for (const field of fields) {
    if (field.weight >= 5 && fullPhrase.length > 0 && field.text.includes(fullPhrase)) {
      total += field.weight;
      break;
    }
  }

  return total;
}

/**
 * Filter + (optionally) score a raw batch. When `queryText` is empty every
 * passing listing is returned with score 0 (browse mode). When present, only
 * text matches survive. Dedupe is handled by the caller via `seenIds`.
 */
export function processBatch(
  docs: ListingDocument[],
  queryText: string,
  filters: SearchFilters,
  currentUid: string | null,
  seenIds: Set<string>,
): SearchResult[] {
  const out: SearchResult[] = [];
  const hasQuery = tokenize(queryText).length > 0;

  for (const listing of docs) {
    if (seenIds.has(listing.id)) continue;
    if (!passesFilters(listing, filters, currentUid)) continue;

    if (hasQuery) {
      const score = scoreListing(listing, queryText);
      if (score <= 0) continue;
      seenIds.add(listing.id);
      out.push({ listing, score });
    } else {
      seenIds.add(listing.id);
      out.push({ listing, score: 0 });
    }
  }

  return out;
}
