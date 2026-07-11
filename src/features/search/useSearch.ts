import { useCallback, useEffect, useRef, useState } from 'react';

import { auth } from '@/src/lib/firebase';
import type { ListingDocument } from '@/src/types/listing';

import {
  fetchRawPage,
  OfflineError,
  processBatch,
  type PageCursor,
} from './searchService';
import { tokenize } from './normalize';
import type { SearchFilters, SearchPhase, SearchResult, SortOption } from './types';

/** Matched results collected before a page is handed to the list. */
const VISIBLE_PAGE = 12;
/** Safety cap on raw Firestore batches scanned per load call. */
const MAX_BATCHES_PER_LOAD = 6;
const DEBOUNCE_MS = 300;

interface UseSearchArgs {
  query: string;
  filters: SearchFilters;
  sort: SortOption;
}

interface UseSearchResult {
  phase: SearchPhase;
  results: ListingDocument[];
  hasMore: boolean;
  isRefreshing: boolean;
  loadMore: () => void;
  retry: () => void;
  refresh: () => void;
}

export function useSearch({ query, filters, sort }: UseSearchArgs): UseSearchResult {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [results, setResults] = useState<ListingDocument[]>([]);
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [hasMore, setHasMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Latest inputs mirrored into refs so `runLoad` can stay referentially
  // stable (no stale closures, no dependency-array churn).
  const queryRef = useRef(debouncedQuery);
  const filtersRef = useRef(filters);
  const sortRef = useRef(sort);
  queryRef.current = debouncedQuery;
  filtersRef.current = filters;
  sortRef.current = sort;

  // Mutable pagination state kept in refs so it never triggers renders.
  const cursorRef = useRef<PageCursor>(null);
  const exhaustedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const resultsRef = useRef<SearchResult[]>([]);
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);

  const filtersKey = JSON.stringify(filters);

  // Debounce only the free-text query; filters/sort apply immediately.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const runLoad = useCallback(async (reset: boolean) => {
    // Ignore a concurrent loadMore; a reset always takes over.
    if (loadingRef.current && !reset) return;
    loadingRef.current = true;

    const requestId = ++requestIdRef.current;
    const uid = auth.currentUser?.uid ?? null;
    const activeQuery = queryRef.current;
    const activeFilters = filtersRef.current;
    const activeSort = sortRef.current;
    const hasQuery = tokenize(activeQuery).length > 0;

    if (reset) {
      cursorRef.current = null;
      exhaustedRef.current = false;
      seenIdsRef.current = new Set();
      resultsRef.current = [];
      setPhase('loading');
    } else {
      setPhase('loadingMore');
    }

    const collected: SearchResult[] = [];
    let batches = 0;

    try {
      while (
        collected.length < VISIBLE_PAGE &&
        !exhaustedRef.current &&
        batches < MAX_BATCHES_PER_LOAD
      ) {
        const page = await fetchRawPage(activeSort, cursorRef.current);
        if (requestId !== requestIdRef.current) return; // superseded

        cursorRef.current = page.cursor;
        exhaustedRef.current = page.exhausted;

        const matched = processBatch(
          page.docs,
          activeQuery,
          activeFilters,
          uid,
          seenIdsRef.current,
        );
        for (const m of matched) collected.push(m);
        batches += 1;
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setPhase(err instanceof OfflineError ? 'offline' : 'error');
      loadingRef.current = false;
      setIsRefreshing(false);
      return;
    }

    if (requestId !== requestIdRef.current) return;

    const merged = reset ? collected : [...resultsRef.current, ...collected];
    const ordered =
      activeSort === 'relevance' && hasQuery
        ? [...merged].sort((a, b) => b.score - a.score)
        : merged;

    resultsRef.current = ordered;
    setResults(ordered.map((r) => r.listing));
    setHasMore(!exhaustedRef.current);
    setPhase(ordered.length === 0 ? 'empty' : 'success');
    loadingRef.current = false;
    setIsRefreshing(false);
  }, []);

  // Reset + load whenever the debounced query, filters, or sort change.
  useEffect(() => {
    runLoad(true);
  }, [debouncedQuery, filtersKey, sort, runLoad]);

  const loadMore = useCallback(() => {
    if (loadingRef.current || exhaustedRef.current) return;
    if (phase !== 'success') return;
    runLoad(false);
  }, [phase, runLoad]);

  const retry = useCallback(() => {
    runLoad(true);
  }, [runLoad]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    runLoad(true);
  }, [runLoad]);

  return { phase, results, hasMore, isRefreshing, loadMore, retry, refresh };
}
