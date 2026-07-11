import type { ListingDocument } from '@/src/types/listing';

export type SortOption =
  | 'relevance'
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc';

export const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Relevance',
  newest: 'Newest',
  oldest: 'Oldest',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
};

export type StatusFilter = 'available' | 'sold' | 'all';
export type DatePreset = '' | '24h' | '7d' | '30d';

export interface SearchFilters {
  /** '' means "All categories". Otherwise a category name from CATEGORY_CONFIG. */
  category: string;
  subCategory: string;
  brand: string;
  condition: string;
  color: string;
  location: string;
  minPrice: string;
  maxPrice: string;
  status: StatusFilter;
  date: DatePreset;
}

export const EMPTY_FILTERS: SearchFilters = {
  category: '',
  subCategory: '',
  brand: '',
  condition: '',
  color: '',
  location: '',
  minPrice: '',
  maxPrice: '',
  status: 'available',
  date: '',
};

/**
 * Which filters are "active" for the chip row / badge count. `status:
 * 'available'` and empty category are the defaults, so they don't count.
 */
export function countActiveFilters(f: SearchFilters): number {
  let n = 0;
  if (f.category) n++;
  if (f.subCategory) n++;
  if (f.brand) n++;
  if (f.condition) n++;
  if (f.color) n++;
  if (f.location) n++;
  if (f.minPrice) n++;
  if (f.maxPrice) n++;
  if (f.status !== 'available') n++;
  if (f.date) n++;
  return n;
}

export type SearchPhase =
  | 'idle' // no query, no filters — show recent searches / prompt
  | 'loading' // first page in flight
  | 'loadingMore' // appending a subsequent page
  | 'success' // have results
  | 'empty' // finished, zero results
  | 'error' // request failed (generic)
  | 'offline'; // request failed due to no connectivity

export interface SearchResult {
  listing: ListingDocument;
  score: number;
}

export interface RecentSearch {
  term: string;
  at: number;
}
