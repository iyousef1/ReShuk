import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl // <-- Added RefreshControl here
  ,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import the Reusable Card we built earlier
import ListingCard from '../../../src/features/listings/components/ListingCard';

// Firebase Imports
import { Timestamp, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

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
  
  const [realListings, setRealListings] = useState<any[]>([]);
  const [recommendedListings, setRecommendedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Subscribe to unread notification count
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, 'profiles', uid, 'notifications'), where('read', '==', false)),
      (snap) => setUnreadCount(snap.size)
    );
    return () => unsub();
  }, []);

  const checkNotifications = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      // 1. Price drops — compare saved price vs current listing price
      const savedSnap = await getDocs(collection(db, 'profiles', uid, 'saved'));
      for (const savedDoc of savedSnap.docs.slice(0, 20)) {
        const saved = savedDoc.data();
        const listingSnap = await getDoc(doc(db, 'listings', savedDoc.id));
        if (!listingSnap.exists()) continue;
        const listing = listingSnap.data();
        if (Number(listing.price) < Number(saved.price)) {
          await setDoc(doc(db, 'profiles', uid, 'notifications', `price_drop_${savedDoc.id}`), {
            type: 'price_drop',
            title: 'Price Drop!',
            body: `"${listing.title}" dropped from $${saved.price} to $${listing.price}`,
            listingId: savedDoc.id,
            imageUrl: Array.isArray(listing.image_url) ? listing.image_url[0] : listing.image_url ?? null,
            read: false,
            created_at: serverTimestamp(),
          });
        }
      }

      // 2. Wanted matches — check new wanted posts against user's own listings
      const myListingsSnap = await getDocs(
        query(collection(db, 'listings'), where('seller_id', '==', uid))
      );
      const myListings = myListingsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

      if (myListings.length > 0) {
        const wantedSnap = await getDocs(
          query(collection(db, 'wanted_posts'), where('status', '==', 'open'), orderBy('created_at', 'desc'), limit(15))
        );
        const wantedPosts = wantedSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter((p) => p.buyer_id !== uid);

        for (const post of wantedPosts) {
          for (const myListing of myListings) {
            const categoryMatch = post.category === myListing.category;
            const termsOverlap = (post.search_terms ?? []).some((t: string) =>
              (myListing.search_terms ?? []).includes(t)
            );
            if (categoryMatch || termsOverlap) {
              const notifId = `wanted_match_${post.id}_${myListing.id}`;
              const exists = await getDoc(doc(db, 'profiles', uid, 'notifications', notifId));
              if (!exists.exists()) {
                await setDoc(doc(db, 'profiles', uid, 'notifications', notifId), {
                  type: 'wanted_match',
                  title: "Someone wants what you're selling!",
                  body: `"${post.title}" — your listing "${myListing.title}" might be a match`,
                  listingId: myListing.id,
                  wantedPostId: post.id,
                  imageUrl: Array.isArray(myListing.image_url) ? myListing.image_url[0] : myListing.image_url ?? null,
                  read: false,
                  created_at: serverTimestamp(),
                });
              }
            }
          }
        }
      }

      await updateDoc(doc(db, 'profiles', uid), { last_notif_check: serverTimestamp() });
    } catch (e) {
      console.error('Notification check error:', e);
    }
  };

  // <-- Extracted algorithm fetcher so we can call it on refresh
  const fetchRecommendations = async () => {
    try {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;

      const userSnap = await getDoc(doc(db, 'profiles', uid));
      if (!userSnap.exists()) return;

      const data = userSnap.data();
      const keywordScores: Record<string, number> = data.keyword_scores ?? {};
      const categoryScores: Record<string, number> = data.category_scores ?? {};
      const lastUpdated: Timestamp | null = data.keyword_scores_updated_at ?? null;

      // Apply time decay: scores lose 5% of value per day so old interests fade out
      const decayFactor = lastUpdated
        ? Math.pow(0.95, (Date.now() - lastUpdated.toMillis()) / 86_400_000)
        : 1;

      const decayed = Object.fromEntries(
        Object.entries(keywordScores).map(([k, v]) => [k, v * decayFactor])
      );

      const topKeywords = Object.keys(decayed)
        .sort((a, b) => decayed[b] - decayed[a])
        .slice(0, 5);

      const topCategories = Object.keys(categoryScores)
        .sort((a, b) => categoryScores[b] - categoryScores[a])
        .slice(0, 2);

      if (topKeywords.length === 0 && topCategories.length === 0) return;

      const seen = new Set<string>();
      const results: any[] = [];

      // Query by top keywords
      if (topKeywords.length > 0) {
        const snap = await getDocs(query(
          collection(db, 'listings'),
          where('search_terms', 'array-contains-any', topKeywords),
          limit(15)
        ));
        snap.docs
          .filter(d => d.data().seller_id !== uid)
          .forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); } });
      }

      // Query by top categories to fill in gaps
      if (topCategories.length > 0) {
        const snap = await getDocs(query(
          collection(db, 'listings'),
          where('category', 'in', topCategories),
          limit(10)
        ));
        snap.docs
          .filter(d => d.data().seller_id !== uid)
          .forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); } });
      }

      setRecommendedListings(results);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };

  // <-- The actual Refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations(); // Re-run the algorithm
    setRefreshing(false);
  };

  useEffect(() => {
    // Run algorithm once on initial load
    fetchRecommendations();
    checkNotifications();

    // STANDARD FEED: Fetch Recent Items (Real-time listener)
    const q = query(collection(db, 'listings'), orderBy('created_at', 'desc'), limit(30));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uid = auth.currentUser?.uid;
      const fetchedListings = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter((listing: any) => listing.seller_id !== uid);
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

      {/* ---------------------------------------------------- */}
      {/* ALGORITHM UI: "For You" Section                      */}
      {/* ---------------------------------------------------- */}
      {recommendedListings.length > 0 && (
        <View className="mb-8">
          <View className="px-5">
            <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-4 flex-row items-center">
              For You ✨
            </Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {recommendedListings.map((item) => (
              <View key={`rec-${item.id}`} className="w-48 mr-4">
                <ListingCard item={item} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Finds Header */}
      <View className="px-5">
        <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-4">
          Recent Finds
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
          <TouchableOpacity className="relative" onPress={() => router.push('/home/notifications')}>
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 min-w-[16px] h-4 rounded-full border border-brand-primary items-center justify-center px-0.5">
                <Text className="text-white text-[9px] font-bold leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
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
          
          // <-- Added the RefreshControl prop here
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#0F766E" 
              colors={['#0F766E']} 
            />
          }

          renderItem={({ item }) => (
            <View className="flex-1 px-2">
              <ListingCard item={item} />
            </View>
          )}
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