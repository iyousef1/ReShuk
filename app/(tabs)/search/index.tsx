import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ListingCard from '../../../src/features/listings/components/ListingCard';
import CityPicker from '../../../src/components/ui/CityPicker';
import {
  CATEGORY_CONFIG,
  COLORS,
  resolveAttributes,
  type CategoryConfig,
} from '../../../src/features/listings/categoryConfig';

import { useSearch } from '../../../src/features/search/useSearch';
import {
  countActiveFilters,
  EMPTY_FILTERS,
  SORT_LABELS,
  type DatePreset,
  type RecentSearch,
  type SearchFilters,
  type SortOption,
  type StatusFilter,
} from '../../../src/features/search/types';
import {
  addRecentSearch,
  clearRecentSearches,
  loadRecentSearches,
  removeRecentSearch,
} from '../../../src/features/search/recentSearches';

// ---- Design tokens (match the rest of the app) ----
const TEAL = '#0F766E';
const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const MUTED = '#94A3B8';
const INK = '#0F172A';

// Category list is derived from CATEGORY_CONFIG — no duplicate list.
const CATEGORY_PILLS: { name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'All', icon: 'grid-outline' },
  ...CATEGORY_CONFIG.map((c) => ({ name: c.name, icon: c.icon as keyof typeof Ionicons.glyphMap })),
];

const SORT_OPTIONS: SortOption[] = ['relevance', 'newest', 'oldest', 'price_asc', 'price_desc'];

const DATE_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: '', label: 'Any time' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'all', label: 'All' },
];

const COLOR_HEX_MAP: Record<string, string> = {
  Black: '#000000', White: '#E5E7EB', Grey: '#9CA3AF', Blue: '#3B82F6',
  Red: '#EF4444', Green: '#22C55E', Yellow: '#EAB308', Orange: '#F97316',
  Pink: '#EC4899', Purple: '#A855F7', Brown: '#92400E', Silver: '#94A3B8',
  Gold: '#D97706', Beige: '#D4B896', Multicolor: '#94A3B8',
};

// Union of all condition option values across categories (single source: config).
const ALL_CONDITIONS: string[] = Array.from(
  new Set(
    CATEGORY_CONFIG.flatMap((c) =>
      (c.attributes.find((a) => a.key === 'condition')?.options ?? []).map((o) => o.value),
    ),
  ),
);

function isRtlText(text: string): boolean {
  return /[֐-׿؀-ۿ]/.test(text);
}

function activeIcon(icon: keyof typeof Ionicons.glyphMap): keyof typeof Ionicons.glyphMap {
  return icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap;
}

// ---------------------------------------------------------------------------

export default function SearchScreen() {
  const [queryInput, setQueryInput] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [recents, setRecents] = useState<RecentSearch[]>([]);

  const { phase, results, hasMore, isRefreshing, loadMore, retry, refresh } = useSearch({
    query: queryInput,
    filters,
    sort,
  });

  useEffect(() => {
    let mounted = true;
    loadRecentSearches().then((r) => {
      if (mounted) setRecents(r);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const activeFilterCount = countActiveFilters(filters);
  const rtl = isRtlText(queryInput);

  const selectedCategoryConfig: CategoryConfig | null = useMemo(
    () => (filters.category ? CATEGORY_CONFIG.find((c) => c.name === filters.category) ?? null : null),
    [filters.category],
  );

  const conditionOptions = useMemo(() => {
    if (selectedCategoryConfig) {
      return (selectedCategoryConfig.attributes.find((a) => a.key === 'condition')?.options ?? []).map(
        (o) => o.value,
      );
    }
    return ALL_CONDITIONS;
  }, [selectedCategoryConfig]);

  // Size options depend on the selected category + sub-category (e.g. footwear
  // shows EU shoe sizes). Only shown when the current selection has a size facet.
  const sizeOptions = useMemo(() => {
    if (!filters.category) return [];
    return resolveAttributes(filters.category, filters.subCategory).find((a) => a.key === 'size')?.options ?? [];
  }, [filters.category, filters.subCategory]);

  const patchFilters = useCallback((patch: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSelectCategory = useCallback(
    (name: string) => {
      // Selecting a category resets category-scoped facets (sizes differ per category).
      patchFilters({ category: name === 'All' ? '' : name, subCategory: '', brand: '', size: '' });
    },
    [patchFilters],
  );

  const handleSubmitSearch = useCallback(async () => {
    const term = queryInput.trim();
    if (!term) return;
    const next = await addRecentSearch(term);
    setRecents(next);
  }, [queryInput]);

  const handleTapRecent = useCallback((term: string) => {
    setQueryInput(term);
    Keyboard.dismiss();
  }, []);

  const handleRemoveRecent = useCallback(async (term: string) => {
    const next = await removeRecentSearch(term);
    setRecents(next);
  }, []);

  const handleClearRecents = useCallback(async () => {
    await clearRecentSearches();
    setRecents([]);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const showRecents = queryInput.trim().length === 0 && recents.length > 0;

  // ---- Active filter chips ----
  const chips = useMemo(() => {
    const out: { key: string; label: string; onRemove: () => void }[] = [];
    if (filters.category)
      out.push({ key: 'category', label: filters.category, onRemove: () => patchFilters({ category: '', subCategory: '', brand: '' }) });
    if (filters.subCategory)
      out.push({ key: 'sub', label: filters.subCategory, onRemove: () => patchFilters({ subCategory: '' }) });
    if (filters.brand)
      out.push({ key: 'brand', label: filters.brand, onRemove: () => patchFilters({ brand: '' }) });
    if (filters.condition)
      out.push({ key: 'condition', label: filters.condition, onRemove: () => patchFilters({ condition: '' }) });
    if (filters.color)
      out.push({ key: 'color', label: filters.color, onRemove: () => patchFilters({ color: '' }) });
    if (filters.size)
      out.push({ key: 'size', label: filters.size, onRemove: () => patchFilters({ size: '' }) });
    if (filters.location)
      out.push({ key: 'location', label: filters.location, onRemove: () => patchFilters({ location: '' }) });
    if (filters.minPrice || filters.maxPrice) {
      const label = `₪${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}`;
      out.push({ key: 'price', label, onRemove: () => patchFilters({ minPrice: '', maxPrice: '' }) });
    }
    if (filters.status !== 'available')
      out.push({ key: 'status', label: filters.status === 'sold' ? 'Sold' : 'All items', onRemove: () => patchFilters({ status: 'available' }) });
    if (filters.date) {
      const label = DATE_OPTIONS.find((d) => d.value === filters.date)?.label ?? '';
      out.push({ key: 'date', label, onRemove: () => patchFilters({ date: '' }) });
    }
    return out;
  }, [filters, patchFilters]);

  // ---- Render helpers ----
  const renderHeader = () => (
    <View>
      {/* Sort + count row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
        <Text style={{ fontSize: 13, color: MUTED, fontWeight: '600' }}>
          {phase === 'loading' ? 'Searching…' : `${results.length}${hasMore ? '+' : ''} result${results.length !== 1 ? 's' : ''}`}
        </Text>
        <TouchableOpacity
          onPress={() => setShowSort(true)}
          accessibilityRole="button"
          accessibilityLabel={`Sort by ${SORT_LABELS[sort]}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 }}
        >
          <Ionicons name="swap-vertical-outline" size={16} color={TEAL} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: TEAL }}>{SORT_LABELS[sort]}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    if (showRecents) return renderRecents();
    if (phase === 'loading' || phase === 'idle') return <SkeletonGrid />;
    if (phase === 'offline') return <StateView icon="cloud-offline-outline" title="You're offline" subtitle="Check your connection and try again." actionLabel="Retry" onAction={retry} />;
    if (phase === 'error') return <StateView icon="warning-outline" title="Something went wrong" subtitle="We couldn't load results. Please try again." actionLabel="Retry" onAction={retry} />;

    return (
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        numColumns={2}
        onScrollBeginDrag={Keyboard.dismiss}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: 4 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={TEAL} colors={[TEAL]} />}
        renderItem={({ item }) => (
          <View style={{ flex: 1, paddingHorizontal: 4 }}>
            <ListingCard item={item} />
          </View>
        )}
        ListEmptyComponent={
          phase === 'empty' ? (
            <StateView
              icon="search-outline"
              title="No results found"
              subtitle="Try different keywords, or clear some filters."
              actionLabel={activeFilterCount > 0 ? 'Clear filters' : undefined}
              onAction={activeFilterCount > 0 ? handleClearAllFilters : undefined}
            />
          ) : null
        }
        ListFooterComponent={
          phase === 'loadingMore' ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator color={TEAL} />
            </View>
          ) : null
        }
      />
    );
  };

  const renderRecents = () => (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: MUTED, letterSpacing: 1, textTransform: 'uppercase' }}>
          Recent Searches
        </Text>
        <TouchableOpacity onPress={handleClearRecents} accessibilityRole="button" accessibilityLabel="Clear all recent searches">
          <Text style={{ color: TEAL, fontWeight: '700', fontSize: 13 }}>Clear all</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {recents.map((r) => (
          <View
            key={r.term}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER,
              borderRadius: 50, paddingLeft: 12, paddingRight: 8, paddingVertical: 8,
            }}
          >
            <TouchableOpacity onPress={() => handleTapRecent(r.term)} accessibilityRole="button" accessibilityLabel={`Search ${r.term}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time-outline" size={15} color={MUTED} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: INK }}>{r.term}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemoveRecent(r.term)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Remove ${r.term}`}>
              <Ionicons name="close" size={15} color={MUTED} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      {/* Header — compact eBay-style search bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
        backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER,
      }}>
        {/* Search input */}
        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: BORDER,
          borderRadius: 10, paddingHorizontal: 12, height: 40,
        }}>
          <Ionicons name="search-outline" size={19} color={MUTED} />
          <TextInput
            value={queryInput}
            onChangeText={setQueryInput}
            onSubmitEditing={handleSubmitSearch}
            placeholder="Search for anything"
            placeholderTextColor={MUTED}
            returnKeyType="search"
            accessibilityLabel="Search listings"
            style={{
              flex: 1, marginLeft: 8, fontSize: 15, color: INK, paddingVertical: 0,
              textAlign: rtl ? 'right' : 'left',
              writingDirection: rtl ? 'rtl' : 'ltr',
            }}
          />
          {queryInput.length > 0 && (
            <TouchableOpacity onPress={() => setQueryInput('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={19} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter button */}
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          accessibilityRole="button"
          accessibilityLabel={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
          style={{
            position: 'relative', width: 40, height: 40,
            backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER,
            borderRadius: 10, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? TEAL : INK} />
          {activeFilterCount > 0 && (
            <View style={{
              position: 'absolute', top: -5, right: -5,
              width: 18, height: 18, borderRadius: 9,
              backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
        >
          {CATEGORY_PILLS.map((cat) => {
            const isActive = (cat.name === 'All' && !filters.category) || filters.category === cat.name;
            return (
              <TouchableOpacity
                key={cat.name}
                onPress={() => handleSelectCategory(cat.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 13, paddingVertical: 7,
                  borderRadius: 50, marginRight: 8,
                  backgroundColor: isActive ? TEAL : '#F1F5F9',
                  borderWidth: 1, borderColor: isActive ? TEAL : BORDER,
                }}
              >
                <Ionicons
                  name={isActive ? activeIcon(cat.icon) : cat.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : '#64748B'}
                />
                <Text style={{ marginLeft: 6, fontWeight: '600', fontSize: 13, color: isActive ? '#FFFFFF' : '#475569' }}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, backgroundColor: BG }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', gap: 8 }}
        >
          {chips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              onPress={chip.onRemove}
              accessibilityRole="button"
              accessibilityLabel={`Remove filter ${chip.label}`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: '#CCFBF1', borderRadius: 50,
                paddingLeft: 12, paddingRight: 9, paddingVertical: 7,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: TEAL }}>{chip.label}</Text>
              <Ionicons name="close" size={13} color={TEAL} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={handleClearAllFilters} accessibilityRole="button" accessibilityLabel="Clear all filters" style={{ paddingHorizontal: 6, paddingVertical: 7 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: BG }}>{renderContent()}</View>

      {/* Sort Modal */}
      <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowSort(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 34, paddingTop: 8 }}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' }} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: INK, paddingHorizontal: 20, paddingVertical: 12 }}>Sort by</Text>
            {SORT_OPTIONS.map((opt) => {
              const sel = sort === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => { setSort(opt); setShowSort(false); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: sel ? '700' : '500', color: sel ? TEAL : INK }}>{SORT_LABELS[opt]}</Text>
                  {sel && <Ionicons name="checkmark" size={20} color={TEAL} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilters(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <TouchableOpacity onPress={handleClearAllFilters} accessibilityRole="button" accessibilityLabel="Clear all filters">
              <Text style={{ color: TEAL, fontWeight: '600', fontSize: 15 }}>Clear All</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '800', color: INK }}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)} accessibilityRole="button" accessibilityLabel="Close filters">
              <Ionicons name="close" size={24} color={MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Category */}
            <FilterSection label="Category">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORY_CONFIG.map((c) => (
                  <SelectPill key={c.id} label={c.name} selected={filters.category === c.name} onPress={() => handleSelectCategory(filters.category === c.name ? 'All' : c.name)} />
                ))}
              </View>
            </FilterSection>

            {/* Sub-category */}
            {selectedCategoryConfig && selectedCategoryConfig.subCategories.length > 0 && (
              <FilterSection label="Sub-category">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {selectedCategoryConfig.subCategories.map((sub) => (
                    <SelectPill key={sub.id} label={sub.name} selected={filters.subCategory === sub.name} onPress={() => patchFilters({ subCategory: filters.subCategory === sub.name ? '' : sub.name, size: '' })} />
                  ))}
                </View>
              </FilterSection>
            )}

            {/* Brand */}
            {selectedCategoryConfig && selectedCategoryConfig.brands.length > 0 && (
              <FilterSection label="Brand">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedCategoryConfig.brands.map((brand) => (
                    <View key={brand} style={{ marginRight: 8 }}>
                      <SelectPill label={brand} selected={filters.brand === brand} onPress={() => patchFilters({ brand: filters.brand === brand ? '' : brand })} />
                    </View>
                  ))}
                </ScrollView>
              </FilterSection>
            )}

            {/* Condition */}
            {conditionOptions.length > 0 && (
              <FilterSection label="Condition">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {conditionOptions.map((cond) => (
                    <SelectPill key={cond} label={cond} selected={filters.condition === cond} onPress={() => patchFilters({ condition: filters.condition === cond ? '' : cond })} />
                  ))}
                </View>
              </FilterSection>
            )}

            {/* Size (category/sub-category specific, e.g. EU shoe sizes for footwear) */}
            {sizeOptions.length > 0 && (
              <FilterSection label="Size">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {sizeOptions.map((opt) => (
                    <SelectPill
                      key={opt.value}
                      label={opt.label}
                      selected={filters.size === opt.value}
                      onPress={() => patchFilters({ size: filters.size === opt.value ? '' : opt.value })}
                    />
                  ))}
                </View>
              </FilterSection>
            )}

            {/* Status */}
            <FilterSection label="Availability">
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {STATUS_OPTIONS.map((s) => (
                  <SelectPill key={s.value} label={s.label} selected={filters.status === s.value} onPress={() => patchFilters({ status: s.value })} />
                ))}
              </View>
            </FilterSection>

            {/* Date */}
            <FilterSection label="Date Posted">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DATE_OPTIONS.map((d) => (
                  <SelectPill key={d.value || 'any'} label={d.label} selected={filters.date === d.value} onPress={() => patchFilters({ date: d.value })} />
                ))}
              </View>
            </FilterSection>

            {/* Location */}
            <FilterSection label="Location">
              <CityPicker value={filters.location} onChange={(city) => patchFilters({ location: city })} placeholder="Any location" />
              {filters.location.length > 0 && (
                <TouchableOpacity onPress={() => patchFilters({ location: '' })} style={{ marginTop: 8 }} accessibilityRole="button" accessibilityLabel="Clear location">
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>Clear location</Text>
                </TouchableOpacity>
              )}
            </FilterSection>

            {/* Price Range */}
            <FilterSection label="Price Range (₪)">
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { label: 'Min', value: filters.minPrice, key: 'minPrice' as const, placeholder: '0' },
                  { label: 'Max', value: filters.maxPrice, key: 'maxPrice' as const, placeholder: 'Any' },
                ].map((field) => (
                  <View key={field.key} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: '500' }}>{field.label}</Text>
                    <TextInput
                      value={field.value}
                      onChangeText={(t) => patchFilters({ [field.key]: t.replace(/[^0-9.]/g, '') })}
                      placeholder={field.placeholder}
                      placeholderTextColor={MUTED}
                      keyboardType="numeric"
                      accessibilityLabel={`${field.label} price`}
                      style={{ backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: INK }}
                    />
                  </View>
                ))}
              </View>
            </FilterSection>

            {/* Color */}
            <View style={{ marginTop: 24, marginBottom: 32 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>Color</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {COLORS.map((colorOpt) => {
                  const sel = filters.color === colorOpt.value;
                  const hex = COLOR_HEX_MAP[colorOpt.value];
                  return (
                    <TouchableOpacity
                      key={colorOpt.value}
                      onPress={() => patchFilters({ color: sel ? '' : colorOpt.value })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50, backgroundColor: sel ? TEAL : '#FFFFFF', borderWidth: 1.5, borderColor: sel ? TEAL : BORDER, gap: 6 }}
                    >
                      {colorOpt.value !== 'Multicolor' ? (
                        <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: hex, borderWidth: 1, borderColor: BORDER }} />
                      ) : (
                        <View style={{ width: 13, height: 13, borderRadius: 7, overflow: 'hidden', flexDirection: 'row' }}>
                          <View style={{ flex: 1, backgroundColor: '#F87171' }} />
                          <View style={{ flex: 1, backgroundColor: '#4ADE80' }} />
                          <View style={{ flex: 1, backgroundColor: '#60A5FA' }} />
                        </View>
                      )}
                      <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#FFFFFF' : '#475569' }}>{colorOpt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Show Results */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: BG }}>
            <TouchableOpacity onPress={() => setShowFilters(false)} accessibilityRole="button" style={{ backgroundColor: TEAL, paddingVertical: 16, borderRadius: 14, alignItems: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
                Show {results.length}{hasMore ? '+' : ''} Result{results.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Presentational sub-components (UI only — all search logic lives in the hook)
// ---------------------------------------------------------------------------

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 24, marginBottom: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function SelectPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
        backgroundColor: selected ? TEAL : '#FFFFFF',
        borderWidth: 1.5, borderColor: selected ? TEAL : BORDER,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#FFFFFF' : '#475569' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function SkeletonGrid() {
  const placeholders = Array.from({ length: 6 }, (_, i) => i);
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8 }} scrollEnabled={false}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {placeholders.map((i) => (
          <View key={i} style={{ width: '50%', paddingHorizontal: 4, marginBottom: 12 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ aspectRatio: 1, width: '100%', backgroundColor: '#EEF2F6' }} />
              <View style={{ padding: 11, gap: 8 }}>
                <View style={{ height: 12, borderRadius: 6, backgroundColor: '#EEF2F6', width: '80%' }} />
                <View style={{ height: 14, borderRadius: 6, backgroundColor: '#EEF2F6', width: '40%' }} />
                <View style={{ height: 10, borderRadius: 5, backgroundColor: '#EEF2F6', width: '55%' }} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function StateView({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 }}>
      <Ionicons name={icon} size={56} color="#E2E8F0" />
      <Text style={{ fontSize: 18, fontWeight: '700', color: INK, marginTop: 16, textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: MUTED, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{subtitle}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} accessibilityRole="button" style={{ marginTop: 18, backgroundColor: TEAL, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 50 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
