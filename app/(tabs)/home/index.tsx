import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ListingCard from '../../../src/features/listings/components/ListingCard';

import { Timestamp, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

const CATEGORIES = [
  { label: 'All', icon: 'grid-outline' as const, activeIcon: 'grid' as const },
  { label: 'Electronics', icon: 'phone-portrait-outline' as const, activeIcon: 'phone-portrait' as const },
  { label: 'Fashion', icon: 'shirt-outline' as const, activeIcon: 'shirt' as const },
  { label: 'Home', icon: 'home-outline' as const, activeIcon: 'home' as const },
  { label: 'Sports', icon: 'football-outline' as const, activeIcon: 'football' as const },
  { label: 'Books', icon: 'book-outline' as const, activeIcon: 'book' as const },
];

export default function HomeScreen() {
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState('All');
  const [realListings, setRealListings] = useState<any[]>([]);
  const [recommendedListings, setRecommendedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null);
  const [userName, setUserName] = useState('Yousef');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, 'profiles', uid, 'notifications'), where('read', '==', false)),
      (snap) => setUnreadCount(snap.size)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      if (user.photoURL) setUserPhotoURL(user.photoURL);
      if (user.displayName) setUserName(user.displayName.split(' ')[0]);
    }
  }, []);

  const checkNotifications = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
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
      console.error('Error fetching recommendations:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRecommendations();
    checkNotifications();

    const q = query(collection(db, 'listings'), orderBy('created_at', 'desc'), limit(30));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uid = auth.currentUser?.uid;
      const fetchedListings = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter((listing: any) => listing.seller_id !== uid);
      setRealListings(fetchedListings);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching listings:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredListings = activeCategory === 'All'
    ? realListings
    : realListings.filter(item => item.category?.toLowerCase() === activeCategory.toLowerCase());

  const renderHeader = () => (
    <View style={{ paddingBottom: 8 }}>

      {/* Greeting Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 }}>
            Hi, {userName} 👋
          </Text>
          <Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 3 }}>
            Find the best deals near you!
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <View style={{
            width: 46, height: 46, borderRadius: 23,
            backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', borderWidth: 2, borderColor: '#0F766E',
          }}>
            {userPhotoURL ? (
              <Image source={{ uri: userPhotoURL }} style={{ width: 46, height: 46 }} />
            ) : (
              <Ionicons name="person" size={22} color="#0F766E" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/search')}
        style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
          borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
          marginHorizontal: 20, marginTop: 16, marginBottom: 20,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
        }}
      >
        <Ionicons name="search-outline" size={20} color="#94A3B8" />
        <Text style={{ flex: 1, marginLeft: 10, color: '#94A3B8', fontSize: 15 }}>
          Search for items...
        </Text>
        <Ionicons name="camera-outline" size={20} color="#0F766E" />
      </TouchableOpacity>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        style={{ marginBottom: 20 }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.label;
          return (
            <TouchableOpacity
              key={cat.label}
              onPress={() => setActiveCategory(cat.label)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 10,
                borderRadius: 50, marginRight: 10,
                backgroundColor: isActive ? '#0F766E' : '#FFFFFF',
                borderWidth: 1.5, borderColor: isActive ? '#0F766E' : '#E2E8F0',
              }}
            >
              <Ionicons
                name={isActive ? cat.activeIcon : cat.icon}
                size={15}
                color={isActive ? '#FFFFFF' : '#64748B'}
              />
              <Text style={{
                marginLeft: 6, fontWeight: '600', fontSize: 13,
                color: isActive ? '#FFFFFF' : '#475569',
              }}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* AI Banner */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/sell')}
        style={{
          marginHorizontal: 20, marginBottom: 28,
          backgroundColor: '#0F766E', borderRadius: 18,
          padding: 18, flexDirection: 'row', alignItems: 'center',
        }}
        activeOpacity={0.85}
      >
        <View style={{
          width: 46, height: 46, borderRadius: 23,
          backgroundColor: 'rgba(255,255,255,0.2)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="camera" size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Sell faster with AI</Text>
          <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 2 }}>
            Photo → listing in seconds
          </Text>
        </View>
        <View style={{
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: 'rgba(255,255,255,0.2)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* For You Section */}
      {recommendedListings.length > 0 && (
        <View style={{ marginBottom: 28 }}>
          <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 }}>
              For You ✨
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {recommendedListings.map((item) => (
              <View key={`rec-${item.id}`} style={{ width: 172, marginRight: 14 }}>
                <ListingCard item={item} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Finds Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 }}>
          Recent Finds
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>

      {/* Top Bar */}
      <View style={{
        paddingHorizontal: 20, paddingVertical: 14,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#0F766E',
      }}>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
          ReShuk
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Ionicons name="search" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={{ position: 'relative' }} onPress={() => router.push('/home/notifications')}>
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute', top: -4, right: -4,
                backgroundColor: '#EF4444', minWidth: 16, height: 16,
                borderRadius: 8, borderWidth: 1.5, borderColor: '#0F766E',
                alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700', lineHeight: 12 }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 4 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0F766E"
              colors={['#0F766E']}
            />
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <ListingCard item={item} />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 40, paddingHorizontal: 20 }}>
              <Ionicons name="cube-outline" size={64} color="#E2E8F0" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16, textAlign: 'center' }}>
                No items yet
              </Text>
              <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 6 }}>
                Be the first to upload an item!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
