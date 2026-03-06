import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import the Reusable Card we built earlier
import ListingCard from '../../../src/features/listings/components/ListingCard';

// Firebase Imports
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../../src/lib/firebase';

// Your Mock Data
const FEATURED_LISTINGS = [
  {
    id: '1',
    title: 'iPhone 12 Pro',
    price: '$450',
    image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=500&q=80',
    badge: 'SMART DEAL',
    badgeColor: 'bg-badge-ai', 
  },
  {
    id: '2',
    title: 'Vintage Record Player',
    price: '$120',
    image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=500&q=80',
    badge: 'NEW',
    badgeColor: 'bg-brand-primary', 
  },
  {
    id: '3',
    title: 'Nike Air Max Sneakers',
    price: '$60',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
    badge: 'POPULAR',
    badgeColor: 'bg-action-warning', 
  }
];

export default function HomeScreen() {
  const router = useRouter();
  
  // Real Firebase State
  const [realListings, setRealListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Real Items from Firebase
  useEffect(() => {
    const q = query(collection(db, 'listings'), orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedListings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRealListings(fetchedListings);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching listings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // This function contains all your beautiful custom UI up top
  const renderHeader = () => (
    <View className="pb-6">
      <View className="px-5 pt-5 pb-2">
        {/* Greeting */}
        <Text className="text-xl font-bold text-text-primary dark:text-text-darkPrimary mb-1">
          Hi, Yousef 👋
        </Text>
        <Text className="text-text-muted dark:text-text-darkMuted mb-5">
          Find the best deals near you!
        </Text>

        {/* Search Bar (Now Routes to Search Tab) */}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/search')}
          className="flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 mb-6"
        >
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <Text className="flex-1 ml-2 text-text-muted dark:text-text-darkMuted text-base">
            Search for items...
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills (Horizontal Scroll) */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 20 }}
        className="mb-6"
      >
        <TouchableOpacity className="bg-brand-primary flex-row items-center px-4 py-2 rounded-full mr-3">
          <Ionicons name="home" size={16} color="#FFFFFF" />
          <Text className="text-white font-semibold ml-2">All</Text>
        </TouchableOpacity>
        
        {['Electronics', 'Fashion', 'Home', 'Sports'].map((cat) => (
          <TouchableOpacity key={cat} className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 flex-row items-center px-4 py-2 rounded-full mr-3">
            <Ionicons name="desktop-outline" size={16} color="#0F766E" />
            <Text className="text-text-primary dark:text-text-darkPrimary font-semibold ml-2">{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="px-5">
        {/* Eco-Friendly Banner */}
        <View className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex-row items-center justify-between mb-8">
          <View className="flex-row items-center flex-1">
            <Ionicons name="leaf" size={28} color="#65A30D" />
            <View className="ml-3">
              <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-base">
                Eco-Friendly Finds ♻️
              </Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-xs mt-0.5">
                Save money & reduce waste
              </Text>
            </View>
          </View>
          <TouchableOpacity className="bg-green-600 px-4 py-2 rounded-full">
            <Text className="text-white font-bold text-xs">Shop Green</Text>
          </TouchableOpacity>
        </View>

        {/* Featured Listings Header */}
        <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-4">
          Featured Listings
        </Text>
      </View>

      {/* Featured Cards (Horizontal Scroll) */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 20 }}
        className="mb-8"
      >
        {FEATURED_LISTINGS.map((item) => (
          <TouchableOpacity 
            key={item.id}
            onPress={() => console.log('Mock item tapped')}
            className="w-36 bg-surface-cardLight dark:bg-surface-cardDark rounded-2xl overflow-hidden mr-4 shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <View className="h-36 relative">
              <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
              <View className={`absolute top-0 right-0 ${item.badgeColor || 'bg-brand-primary'} px-2 py-1 rounded-bl-lg`}>
                <Text className="text-white text-[10px] font-bold">{item.badge}</Text>
              </View>
            </View>
            <View className="p-3">
              <Text className="text-text-primary dark:text-text-darkPrimary font-bold mb-1" numberOfLines={1}>
                {item.price}
              </Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-xs mb-2" numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="px-5">
        <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-4">
          Recent Finds (Real Data)
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      
      {/* Custom Top Bar */}
      <View className="px-5 py-4 flex-row justify-between items-center bg-brand-primary dark:bg-surface-dark">
        <Text className="text-white text-2xl font-extrabold tracking-tight">
          ReShuk
        </Text>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Ionicons name="search" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity className="relative">
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            <View className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border border-brand-primary" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Real Data Grid with your UI on top */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <FlatList
          data={realListings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => <ListingCard item={item} />}
          ListEmptyComponent={
            <View className="items-center justify-center mt-10 px-5">
              <Ionicons name="cube-outline" size={64} color="#E2E8F0" />
              <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mt-4 text-center">
                No items yet
              </Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-center">
                Be the first to upload an item!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}