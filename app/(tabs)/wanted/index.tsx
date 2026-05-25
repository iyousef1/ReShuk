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
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
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
      activeOpacity={0.7}
      className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-3 mx-4"
    >
      <View className="flex-row items-start">
        <View className="w-10 h-10 bg-brand-primary/10 rounded-full items-center justify-center mr-3 mt-0.5">
          <Ionicons name={icon} size={20} color="#0F766E" />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-text-primary dark:text-text-darkPrimary font-bold text-base flex-1 mr-2"
              numberOfLines={1}
            >
              {post.title}
            </Text>
            {isOwn && (
              <View className="bg-brand-primary/10 px-2 py-0.5 rounded-full">
                <Text className="text-brand-primary text-[10px] font-bold">YOURS</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center flex-wrap gap-2 mb-2">
            <View className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              <Text className="text-text-muted dark:text-text-darkMuted text-xs font-semibold">
                {post.category}
              </Text>
            </View>
            {post.max_budget != null && (
              <View className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                <Text className="text-green-700 dark:text-green-400 text-xs font-semibold">
                  Budget: ${post.max_budget}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={12} color="#94A3B8" />
              <Text className="text-text-muted dark:text-text-darkMuted text-xs ml-1">
                {post.location}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={12} color="#94A3B8" />
              <Text className="text-text-muted dark:text-text-darkMuted text-xs ml-1 mr-3">
                {post.buyer_name}
              </Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-xs">
                {timeAgo(post.created_at)}
              </Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={{ marginTop: 2, marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function WantedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<WantedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'wanted_posts'),
      orderBy('created_at', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as WantedPost))
          .filter((p) => p.status === 'open')
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handlePost = () => {
    if (!auth.currentUser) {
      router.push('/(auth)/login');
      return;
    }
    router.push('/(tabs)/wanted/create');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      {/* Header */}
      <View className="px-5 py-4 flex-row justify-between items-center bg-brand-primary dark:bg-surface-dark">
        <View>
          <Text className="text-white text-2xl font-extrabold tracking-tight">Wanted</Text>
          <Text className="text-white/70 text-xs mt-0.5">Find what buyers are looking for</Text>
        </View>
        <TouchableOpacity
          onPress={handlePost}
          className="bg-white/20 flex-row items-center px-3 py-2 rounded-full"
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text className="text-white font-bold text-sm ml-1">Post Request</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <WantedPostCard
              post={item}
              onPress={() => router.push(`/(tabs)/wanted/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center mt-20 px-8">
              <View className="w-20 h-20 bg-brand-primary/10 rounded-full items-center justify-center mb-4">
                <Ionicons name="search-circle-outline" size={40} color="#0F766E" />
              </View>
              <Text className="text-xl font-bold text-text-primary dark:text-text-darkPrimary text-center mb-2">
                No requests yet
              </Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-center mb-6">
                Be the first to post what you're looking for and get matched with sellers!
              </Text>
              <TouchableOpacity
                onPress={handlePost}
                className="bg-brand-primary px-6 py-3 rounded-full"
              >
                <Text className="text-white font-bold">Post Your First Request</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
