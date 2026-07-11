import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeText } from './normalize';
import type { RecentSearch } from './types';

const STORAGE_KEY = 'reshuk.recentSearches.v1';
const MAX_RECENTS = 8;

function isRecentSearch(value: unknown): value is RecentSearch {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RecentSearch).term === 'string' &&
    typeof (value as RecentSearch).at === 'number'
  );
}

export async function loadRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentSearch).slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

/**
 * Add a term to the front of the recents list, de-duplicating case/spacing/
 * language variants via `normalizeText`. Returns the updated list so callers
 * can update state without a re-read.
 */
export async function addRecentSearch(term: string): Promise<RecentSearch[]> {
  const trimmed = term.trim();
  if (!trimmed) return loadRecentSearches();

  const key = normalizeText(trimmed);
  if (!key) return loadRecentSearches();

  const existing = await loadRecentSearches();
  const deduped = existing.filter((r) => normalizeText(r.term) !== key);
  const next = [{ term: trimmed, at: Date.now() }, ...deduped].slice(0, MAX_RECENTS);

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best-effort persistence; ignore write failures
  }
  return next;
}

export async function removeRecentSearch(term: string): Promise<RecentSearch[]> {
  const key = normalizeText(term);
  const existing = await loadRecentSearches();
  const next = existing.filter((r) => normalizeText(r.term) !== key);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
