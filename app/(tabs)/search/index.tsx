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

import ListingCard from '../../../src/features/listings/components/ListingCard';
import { CATEGORY_CONFIG, COLORS } from '../../../src/features/listings/categoryConfig';

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Home', 'Sports', 'Toys', 'Vehicles', 'Books', 'Other'];

const CATEGORY_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }> = {
  All:         { icon: 'grid-outline',           activeIcon: 'grid' },
  Electronics: { icon: 'phone-portrait-outline', activeIcon: 'phone-portrait' },
  Fashion:     { icon: 'shirt-outline',          activeIcon: 'shirt' },
  Home:        { icon: 'home-outline',           activeIcon: 'home' },
  Sports:      { icon: 'football-outline',       activeIcon: 'football' },
  Toys:        { icon: 'happy-outline',          activeIcon: 'happy' },
  Vehicles:    { icon: 'car-outline',            activeIcon: 'car' },
  Books:       { icon: 'book-outline',           activeIcon: 'book' },
  Other:       { icon: 'cube-outline',           activeIcon: 'cube' },
};

const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Fair', 'Parts Only'];

const COLOR_HEX_MAP: Record<string, string> = {
  Black: '#000000', White: '#E5E7EB', Grey: '#9CA3AF', Blue: '#3B82F6',
  Red: '#EF4444', Green: '#22C55E', Yellow: '#EAB308', Orange: '#F97316',
  Pink: '#EC4899', Purple: '#A855F7', Brown: '#92400E', Silver: '#94A3B8',
  Gold: '#D97706', Beige: '#D4B896', Multicolor: '#94A3B8',
};

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [allListings, setAllListings] = useState<any[]>([]);
  const [filteredListings, setFilteredListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const activeCategoryConfig = activeCategory !== 'All'
    ? CATEGORY_CONFIG.find((c) => c.name === activeCategory) ?? null
    : null;

  const activeFilterCount = [filterSubCategory, filterBrand, filterCondition, filterColor, filterMinPrice, filterMaxPrice].filter(Boolean).length;

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'listings'), orderBy('created_at', 'desc')));
        const uid = auth.currentUser?.uid;
        const listings = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter((l: any) => l.seller_id !== uid);
        setAllListings(listings);
        setFilteredListings(listings);
      } catch (e) {
        console.error('Error fetching for search:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  useEffect(() => {
    setFilterSubCategory('');
    setFilterBrand('');
  }, [activeCategory]);

  useEffect(() => {
    let result = allListings;
    if (activeCategory !== 'All') result = result.filter((i) => i.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) =>
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q))
      );
    }
    if (filterSubCategory) result = result.filter((i) => i.sub_category === filterSubCategory);
    if (filterBrand) result = result.filter((i) => i.brand === filterBrand || i.attributes?.brand === filterBrand);
    if (filterCondition) result = result.filter((i) => i.condition === filterCondition || i.attributes?.condition === filterCondition);
    if (filterColor) result = result.filter((i) => i.color === filterColor || i.attributes?.color === filterColor);
    if (filterMinPrice) result = result.filter((i) => Number(i.price) >= Number(filterMinPrice));
    if (filterMaxPrice) result = result.filter((i) => Number(i.price) <= Number(filterMaxPrice));
    setFilteredListings(result);
  }, [searchQuery, activeCategory, allListings, filterSubCategory, filterBrand, filterCondition, filterColor, filterMinPrice, filterMaxPrice]);

  const handleClearAllFilters = () => {
    setFilterSubCategory('');
    setFilterBrand('');
    setFilterCondition('');
    setFilterColor('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, backgroundColor: '#F8FAFC' }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: '#0F766E', letterSpacing: -0.5, marginBottom: 14 }}>
          Discover
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Search input */}
          <View style={{
            flex: 1, flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
            borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
          }}>
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for anything..."
              placeholderTextColor="#94A3B8"
              returnKeyType="search"
              style={{ flex: 1, marginLeft: 10, fontSize: 15, color: '#0F172A' }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter button */}
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={{
              position: 'relative', width: 48, height: 48,
              backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
              borderRadius: 14, alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
            }}
          >
            <Ionicons name="options-outline" size={22} color={activeFilterCount > 0 ? '#0F766E' : '#94A3B8'} />
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
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14 }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          const icons = CATEGORY_ICONS[cat];
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 14, paddingVertical: 9,
                borderRadius: 50, marginRight: 10,
                backgroundColor: isActive ? '#0F766E' : '#FFFFFF',
                borderWidth: 1.5, borderColor: isActive ? '#0F766E' : '#E2E8F0',
              }}
            >
              {icons && (
                <Ionicons
                  name={isActive ? icons.activeIcon : icons.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : '#64748B'}
                />
              )}
              <Text style={{
                marginLeft: icons ? 6 : 0, fontWeight: '600', fontSize: 13,
                color: isActive ? '#FFFFFF' : '#475569',
              }}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results Grid */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          onScrollBeginDrag={Keyboard.dismiss}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 4 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <ListingCard item={item} />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 }}>
              <Ionicons name="search-outline" size={56} color="#E2E8F0" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16, textAlign: 'center' }}>
                No results found
              </Text>
              <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                Try adjusting your search or selecting a different category.
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilters(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top', 'bottom']}>

          {/* Modal Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingVertical: 16,
            borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
          }}>
            <TouchableOpacity onPress={handleClearAllFilters}>
              <Text style={{ color: '#0F766E', fontWeight: '600', fontSize: 15 }}>Clear All</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Sub-category */}
            {activeCategoryConfig && activeCategoryConfig.subCategories.length > 0 && (
              <View style={{ marginTop: 24, marginBottom: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Sub-category
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {activeCategoryConfig.subCategories.map((sub) => {
                    const sel = filterSubCategory === sub.name;
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        onPress={() => setFilterSubCategory((p) => p === sub.name ? '' : sub.name)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
                          backgroundColor: sel ? '#0F766E' : '#FFFFFF',
                          borderWidth: 1.5, borderColor: sel ? '#0F766E' : '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#FFFFFF' : '#475569' }}>{sub.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Brand */}
            {activeCategoryConfig && activeCategoryConfig.brands.length > 0 && (
              <View style={{ marginTop: 24, marginBottom: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Brand
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {activeCategoryConfig.brands.map((brand) => {
                    const sel = filterBrand === brand;
                    return (
                      <TouchableOpacity
                        key={brand}
                        onPress={() => setFilterBrand((p) => p === brand ? '' : brand)}
                        style={{
                          marginRight: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
                          backgroundColor: sel ? '#0F766E' : '#FFFFFF',
                          borderWidth: 1.5, borderColor: sel ? '#0F766E' : '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#FFFFFF' : '#475569' }}>{brand}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Condition */}
            <View style={{ marginTop: 24, marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                Condition
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CONDITION_OPTIONS.map((cond) => {
                  const sel = filterCondition === cond;
                  return (
                    <TouchableOpacity
                      key={cond}
                      onPress={() => setFilterCondition((p) => p === cond ? '' : cond)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
                        backgroundColor: sel ? '#0F766E' : '#FFFFFF',
                        borderWidth: 1.5, borderColor: sel ? '#0F766E' : '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#FFFFFF' : '#475569' }}>{cond}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Price Range */}
            <View style={{ marginTop: 24, marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                Price Range
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { label: 'Min $', value: filterMinPrice, onChange: setFilterMinPrice, placeholder: '0' },
                  { label: 'Max $', value: filterMaxPrice, onChange: setFilterMaxPrice, placeholder: 'Any' },
                ].map((field) => (
                  <View key={field.label} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6, fontWeight: '500' }}>{field.label}</Text>
                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder={field.placeholder}
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      style={{
                        backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
                        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                        fontSize: 15, color: '#0F172A',
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Color */}
            <View style={{ marginTop: 24, marginBottom: 32 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                Color
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {COLORS.map((colorOpt) => {
                  const sel = filterColor === colorOpt.value;
                  const hex = COLOR_HEX_MAP[colorOpt.value];
                  return (
                    <TouchableOpacity
                      key={colorOpt.value}
                      onPress={() => setFilterColor((p) => p === colorOpt.value ? '' : colorOpt.value)}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50,
                        backgroundColor: sel ? '#0F766E' : '#FFFFFF',
                        borderWidth: 1.5, borderColor: sel ? '#0F766E' : '#E2E8F0',
                        gap: 6,
                      }}
                    >
                      {colorOpt.value !== 'Multicolor' ? (
                        <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: hex, borderWidth: 1, borderColor: '#E2E8F0' }} />
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
          <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#F8FAFC' }}>
            <TouchableOpacity
              onPress={() => setShowFilters(false)}
              style={{ backgroundColor: '#0F766E', paddingVertical: 16, borderRadius: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
                Show {filteredListings.length} Result{filteredListings.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
