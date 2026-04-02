import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Your Architecture Imports
import ListingCard from '../../../src/features/listings/components/ListingCard';

// Firebase Imports
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../../src/lib/firebase';

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Home', 'Sports', 'Toys', 'Vehicles', 'Other'];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [allListings, setAllListings] = useState<any[]>([]);
  const [filteredListings, setFilteredListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all listings once when the screen loads
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const q = query(collection(db, 'listings'), orderBy('created_at', 'desc'));
        const snapshot = await getDocs(q);
        
        const listings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setAllListings(listings);
        setFilteredListings(listings);
      } catch (error) {
        console.error("Error fetching for search:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  // Filter the listings whenever the search query or category changes
  useEffect(() => {
    let result = allListings;

    // 1. Filter by Category
    if (activeCategory !== 'All') {
      result = result.filter(item => item.category === activeCategory);
    }

    // 2. Filter by Search Text (checking title and description)
    if (searchQuery.trim() !== '') {
      const lowerCaseQuery = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.title && item.title.toLowerCase().includes(lowerCaseQuery)) ||
        (item.description && item.description.toLowerCase().includes(lowerCaseQuery))
      );
    }

    setFilteredListings(result);
  }, [searchQuery, activeCategory, allListings]);

  // Dismiss keyboard when scrolling
  const handleScroll = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      
      {/* 1. Header & Search Bar */}
      <View className="px-5 pt-4 pb-2 bg-surface-light dark:bg-surface-dark z-10">
        <Text className="text-3xl font-extrabold text-brand-primary tracking-tight mb-4">
          Discover
        </Text>
        
        <View className="flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 mb-4 shadow-sm">
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
      </View>

      {/* 2. Category Filter Pills */}
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
                <Text className={`font-semibold ${isActive ? 'text-white' : 'text-text-primary dark:text-text-darkPrimary'}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Search Results Grid */}
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
    </SafeAreaView>
  );
}