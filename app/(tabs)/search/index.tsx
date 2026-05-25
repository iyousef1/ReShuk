import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Architecture Imports
import ListingCard from '../../../src/features/listings/components/ListingCard';
import { CATEGORY_CONFIG, COLORS } from '../../../src/features/listings/categoryConfig';

// Firebase Imports
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Home', 'Sports', 'Toys', 'Vehicles', 'Books', 'Other'];

const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Fair', 'Parts Only'];

// Map color names to hex values for the color dot UI
const COLOR_HEX_MAP: Record<string, string> = {
  Black: '#000000',
  White: '#E5E7EB',
  Grey: '#9CA3AF',
  Blue: '#3B82F6',
  Red: '#EF4444',
  Green: '#22C55E',
  Yellow: '#EAB308',
  Orange: '#F97316',
  Pink: '#EC4899',
  Purple: '#A855F7',
  Brown: '#92400E',
  Silver: '#94A3B8',
  Gold: '#D97706',
  Beige: '#D4B896',
  Multicolor: '#94A3B8',
};

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const [allListings, setAllListings] = useState<any[]>([]);
  const [filteredListings, setFilteredListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Compute the active category config (null when 'All')
  const activeCategoryConfig =
    activeCategory !== 'All'
      ? CATEGORY_CONFIG.find((c) => c.name === activeCategory) ?? null
      : null;

  // Active filter count (excluding category, which has its own pill UI)
  const activeFilterCount = [
    filterSubCategory,
    filterBrand,
    filterCondition,
    filterColor,
    filterMinPrice,
    filterMaxPrice,
  ].filter(Boolean).length;

  // Fetch all listings once when the screen loads
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const q = query(collection(db, 'listings'), orderBy('created_at', 'desc'));
        const snapshot = await getDocs(q);

        const uid = auth.currentUser?.uid;
        const listings = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as any))
          .filter((listing: any) => listing.seller_id !== uid);

        setAllListings(listings);
        setFilteredListings(listings);
      } catch (error) {
        console.error('Error fetching for search:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  // Reset sub-category and brand filters when the active category changes
  useEffect(() => {
    setFilterSubCategory('');
    setFilterBrand('');
  }, [activeCategory]);

  // Filter the listings whenever any filter state changes
  useEffect(() => {
    let result = allListings;

    // 1. Category filter
    if (activeCategory !== 'All') {
      result = result.filter((item) => item.category === activeCategory);
    }

    // 2. Text search (title + description)
    if (searchQuery.trim() !== '') {
      const lowerCaseQuery = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(lowerCaseQuery)) ||
          (item.description && item.description.toLowerCase().includes(lowerCaseQuery)),
      );
    }

    // 3. Advanced filters
    if (filterSubCategory) {
      result = result.filter((i) => i.sub_category === filterSubCategory);
    }
    if (filterBrand) {
      result = result.filter(
        (i) => i.brand === filterBrand || i.attributes?.brand === filterBrand,
      );
    }
    if (filterCondition) {
      result = result.filter(
        (i) => i.condition === filterCondition || i.attributes?.condition === filterCondition,
      );
    }
    if (filterColor) {
      result = result.filter(
        (i) => i.color === filterColor || i.attributes?.color === filterColor,
      );
    }
    if (filterMinPrice) {
      result = result.filter((i) => Number(i.price) >= Number(filterMinPrice));
    }
    if (filterMaxPrice) {
      result = result.filter((i) => Number(i.price) <= Number(filterMaxPrice));
    }

    setFilteredListings(result);
  }, [
    searchQuery,
    activeCategory,
    allListings,
    filterSubCategory,
    filterBrand,
    filterCondition,
    filterColor,
    filterMinPrice,
    filterMaxPrice,
  ]);

  const handleClearAllFilters = () => {
    setFilterSubCategory('');
    setFilterBrand('');
    setFilterCondition('');
    setFilterColor('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
  };

  const handleScroll = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>

      {/* Header & Search Bar */}
      <View className="px-5 pt-4 pb-2 bg-surface-light dark:bg-surface-dark z-10">
        <Text className="text-3xl font-extrabold text-brand-primary tracking-tight mb-4">
          Discover
        </Text>

        <View className="flex-row items-center gap-3 mb-4">
          {/* Search input */}
          <View className="flex-1 flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-sm">
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for anything..."
              placeholderTextColor="#94A3B8"
              returnKeyType="search"
              className="flex-1 ml-2 text-text-primary dark:text-text-darkPrimary text-base"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter button with badge */}
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            className="relative w-12 h-12 bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl items-center justify-center shadow-sm"
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={activeFilterCount > 0 ? '#0F766E' : '#94A3B8'}
            />
            {activeFilterCount > 0 && (
              <View className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full items-center justify-center">
                <Text className="text-white text-xs font-bold">{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter Pills */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`flex-row items-center px-4 py-2 rounded-full mr-3 border ${
                  isActive
                    ? 'bg-brand-primary border-brand-primary'
                    : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-800'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    isActive ? 'text-white' : 'text-text-primary dark:text-text-darkPrimary'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Grid */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          onScrollBeginDrag={handleScroll}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ListingCard item={item} />}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20 px-5">
              <Ionicons name="search-outline" size={64} color="#E2E8F0" />
              <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mt-4 text-center">
                No results found
              </Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-center mt-2">
                Try adjusting your search or selecting a different category.
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <TouchableOpacity onPress={handleClearAllFilters}>
              <Text className="text-action-cta font-semibold text-base">Clear All</Text>
            </TouchableOpacity>
            <Text className="text-xl font-bold text-text-primary dark:text-text-darkPrimary">
              Filters
            </Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Scrollable filter content */}
          <ScrollView
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Sub-category section (only when a non-All category is selected) */}
            {activeCategoryConfig && activeCategoryConfig.subCategories.length > 0 && (
              <View className="mt-6 mb-2">
                <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-3 uppercase tracking-wider">
                  Sub-category
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {activeCategoryConfig.subCategories.map((sub) => {
                    const isSelected = filterSubCategory === sub.name;
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        onPress={() =>
                          setFilterSubCategory((prev) => (prev === sub.name ? '' : sub.name))
                        }
                        className={`px-4 py-2 rounded-full border ${
                          isSelected
                            ? 'bg-brand-primary border-brand-primary'
                            : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            isSelected
                              ? 'text-white'
                              : 'text-text-primary dark:text-text-darkPrimary'
                          }`}
                        >
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Brand section (only when a non-All category is selected and has brands) */}
            {activeCategoryConfig && activeCategoryConfig.brands.length > 0 && (
              <View className="mt-6 mb-2">
                <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-3 uppercase tracking-wider">
                  Brand
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 4 }}
                >
                  {activeCategoryConfig.brands.map((brand) => {
                    const isSelected = filterBrand === brand;
                    return (
                      <TouchableOpacity
                        key={brand}
                        onPress={() =>
                          setFilterBrand((prev) => (prev === brand ? '' : brand))
                        }
                        className={`mr-2 px-4 py-2 rounded-full border ${
                          isSelected
                            ? 'bg-brand-primary border-brand-primary'
                            : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            isSelected
                              ? 'text-white'
                              : 'text-text-primary dark:text-text-darkPrimary'
                          }`}
                        >
                          {brand}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Condition section */}
            <View className="mt-6 mb-2">
              <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-3 uppercase tracking-wider">
                Condition
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {CONDITION_OPTIONS.map((cond) => {
                  const isSelected = filterCondition === cond;
                  return (
                    <TouchableOpacity
                      key={cond}
                      onPress={() =>
                        setFilterCondition((prev) => (prev === cond ? '' : cond))
                      }
                      className={`px-4 py-2 rounded-full border ${
                        isSelected
                          ? 'bg-brand-primary border-brand-primary'
                          : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          isSelected
                            ? 'text-white'
                            : 'text-text-primary dark:text-text-darkPrimary'
                        }`}
                      >
                        {cond}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Price Range section */}
            <View className="mt-6 mb-2">
              <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-3 uppercase tracking-wider">
                Price Range
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-xs text-text-muted dark:text-text-darkMuted mb-1">
                    Min $
                  </Text>
                  <TextInput
                    value={filterMinPrice}
                    onChangeText={setFilterMinPrice}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-text-primary dark:text-text-darkPrimary text-base"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-text-muted dark:text-text-darkMuted mb-1">
                    Max $
                  </Text>
                  <TextInput
                    value={filterMaxPrice}
                    onChangeText={setFilterMaxPrice}
                    placeholder="Any"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-text-primary dark:text-text-darkPrimary text-base"
                  />
                </View>
              </View>
            </View>

            {/* Color section */}
            <View className="mt-6 mb-8">
              <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-3 uppercase tracking-wider">
                Color
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {COLORS.map((colorOpt) => {
                  const isSelected = filterColor === colorOpt.value;
                  const hexColor = COLOR_HEX_MAP[colorOpt.value];
                  return (
                    <TouchableOpacity
                      key={colorOpt.value}
                      onPress={() =>
                        setFilterColor((prev) => (prev === colorOpt.value ? '' : colorOpt.value))
                      }
                      className={`flex-row items-center px-3 py-2 rounded-full border ${
                        isSelected
                          ? 'bg-brand-primary border-brand-primary'
                          : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {/* Color dot */}
                      {colorOpt.value !== 'Multicolor' ? (
                        <View
                          style={{ backgroundColor: hexColor }}
                          className="w-3.5 h-3.5 rounded-full mr-1.5 border border-slate-200"
                        />
                      ) : (
                        <View className="w-3.5 h-3.5 rounded-full mr-1.5 border border-slate-300 overflow-hidden flex-row">
                          <View className="flex-1 bg-red-400" />
                          <View className="flex-1 bg-green-400" />
                          <View className="flex-1 bg-blue-400" />
                        </View>
                      )}
                      <Text
                        className={`text-sm font-medium ${
                          isSelected
                            ? 'text-white'
                            : 'text-text-primary dark:text-text-darkPrimary'
                        }`}
                      >
                        {colorOpt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Sticky Show Results button */}
          <View className="px-5 pb-5 pt-3 border-t border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark">
            <TouchableOpacity
              onPress={() => setShowFilters(false)}
              className="bg-brand-primary py-4 rounded-xl items-center justify-center"
            >
              <Text className="text-white font-bold text-lg">
                Show {filteredListings.length} Result{filteredListings.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
