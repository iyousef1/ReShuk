import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

export type WantedPost = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  title: string;
  category: string;
  max_budget: number | null;
  location: string;
  description: string;
  status: 'open' | 'fulfilled';
  created_at: any;
  search_terms: string[];
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Electronics: 'phone-portrait-outline',
  Fashion: 'shirt-outline',
  Home: 'home-outline',
  Sports: 'football-outline',
  Books: 'book-outline',
  Vehicles: 'car-outline',
  Other: 'cube-outline',
};

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function WantedPostCard({ post, onPress }: { post: WantedPost; onPress: () => void }) {
  const isOwn = post.buyer_id === auth.currentUser?.uid;
  const icon = CATEGORY_ICONS[post.category] ?? 'cube-outline';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: '#FFFFFF', borderRadius: 16,
        padding: 16, marginBottom: 10, marginHorizontal: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
        borderWidth: 1, borderColor: '#F1F5F9',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Category icon */}
        <View style={{
          width: 42, height: 42, borderRadius: 21,
          backgroundColor: '#CCFBF1',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 12, marginTop: 2,
        }}>
          <Ionicons name={icon} size={20} color="#0F766E" />
        </View>

        <View style={{ flex: 1 }}>
          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#0F172A', flex: 1, marginRight: 8 }} numberOfLines={1}>
              {post.title}
            </Text>
            {isOwn && (
              <View style={{ backgroundColor: '#CCFBF1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#0F766E', fontSize: 10, fontWeight: '800' }}>YOURS</Text>
              </View>
            )}
          </View>

          {/* Tags row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            <View style={{ backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
              <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>{post.category}</Text>
            </View>
            {post.max_budget != null && (
              <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
                <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '600' }}>Budget: ₪{post.max_budget}</Text>
              </View>
            )}
          </View>

          {/* Footer row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="location-outline" size={12} color="#94A3B8" />
              <Text style={{ fontSize: 12, color: '#94A3B8' }}>{post.location}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="person-outline" size={12} color="#94A3B8" />
                <Text style={{ fontSize: 12, color: '#94A3B8' }}>{post.buyer_name}</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#CBD5E1' }}>{timeAgo(post.created_at)}</Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={17} color="#CBD5E1" style={{ marginTop: 2, marginLeft: 6 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function WantedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<WantedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'wanted_posts'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WantedPost)).filter((p) => p.status === 'open'));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handlePost = () => {
    if (!auth.currentUser) { router.push('/(auth)/login'); return; }
    router.push('/(tabs)/wanted/create');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>

      {/* Header */}
      <View style={{
        paddingHorizontal: 20, paddingVertical: 14,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#0F766E',
      }}>
        <View>
          <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
            Wanted
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 }}>
            Find what buyers are looking for
          </Text>
        </View>
        <TouchableOpacity
          onPress={handlePost}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50,
          }}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Post Request</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <WantedPostCard post={item} onPress={() => router.push(`/(tabs)/wanted/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Ionicons name="search-circle-outline" size={36} color="#0F766E" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>
                No requests yet
              </Text>
              <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 26 }}>
                Be the first to post what you're looking for and get matched with sellers!
              </Text>
              <TouchableOpacity
                onPress={handlePost}
                style={{ backgroundColor: '#0F766E', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 50 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Post Your First Request</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
