import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';
import { WantedPost } from './index';

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

// Start or reuse a chat between two users about a wanted post
async function startWantedChat(wantedPostId: string, buyerId: string): Promise<string> {
  const sellerId = auth.currentUser!.uid;

  const q = query(
    collection(db, 'chats'),
    where('wanted_post_id', '==', wantedPostId),
    where('buyerId', '==', buyerId),
    where('sellerId', '==', sellerId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) return existing.docs[0].id;

  const ref = await addDoc(collection(db, 'chats'), {
    wanted_post_id: wantedPostId,
    listingId: null,
    buyerId,
    sellerId,
    createdAt: serverTimestamp(),
    lastMessage: '',
    lastMessageTime: serverTimestamp(),
  });
  return ref.id;
}

function MatchedListingCard({
  item,
  onPress,
}: {
  item: any;
  onPress: () => void;
}) {
  const imageUrl =
    Array.isArray(item.image_url) && item.image_url.length > 0
      ? item.image_url[0]
      : typeof item.image_url === 'string'
      ? item.image_url
      : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mr-3"
      style={{ width: 150 }}
    >
      <View className="h-36 bg-slate-100 dark:bg-slate-800">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="image-outline" size={32} color="#94A3B8" />
          </View>
        )}
      </View>
      <View className="p-2.5">
        <Text
          className="text-text-primary dark:text-text-darkPrimary font-semibold text-sm mb-1"
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text className="text-brand-primary font-bold text-base">${item.price}</Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="location-outline" size={11} color="#94A3B8" />
          <Text className="text-text-muted dark:text-text-darkMuted text-[11px] ml-0.5" numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function WantedDetailScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const [post, setPost] = useState<WantedPost | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [contacting, setContacting] = useState(false);

  const currentUid = auth.currentUser?.uid;
  const isOwner = post?.buyer_id === currentUid;

  useEffect(() => {
    if (!postId) return;
    getDoc(doc(db, 'wanted_posts', postId)).then((snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as WantedPost;
        setPost(data);
        fetchMatches(data);
      }
      setLoadingPost(false);
    });
  }, [postId]);

  const fetchMatches = async (p: WantedPost) => {
    setLoadingMatches(true);
    try {
      const terms = p.search_terms ?? [];
      const results: any[] = [];
      const seen = new Set<string>();

      // Query by keyword match
      if (terms.length > 0) {
        const snap = await getDocs(
          query(
            collection(db, 'listings'),
            where('search_terms', 'array-contains-any', terms.slice(0, 10)),
            limit(20)
          )
        );
        snap.docs.forEach((d) => {
          if (seen.has(d.id)) return;
          const listing = { id: d.id, ...d.data() } as { id: string; seller_id?: string; price?: number; [k: string]: any };
          // Filter out own listings and respect budget
          if (listing.seller_id === currentUid) return;
          if (p.max_budget != null && listing.price != null && listing.price > p.max_budget) return;
          seen.add(d.id);
          results.push(listing);
        });
      }

      // Fill gaps with category match if we have fewer than 6
      if (results.length < 6) {
        const snap = await getDocs(
          query(
            collection(db, 'listings'),
            where('category', '==', p.category),
            limit(10)
          )
        );
        snap.docs.forEach((d) => {
          if (seen.has(d.id)) return;
          const listing = { id: d.id, ...d.data() } as { id: string; seller_id?: string; price?: number; [k: string]: any };
          if (listing.seller_id === currentUid) return;
          if (p.max_budget != null && listing.price != null && listing.price > p.max_budget) return;
          seen.add(d.id);
          results.push(listing);
        });
      }

      setMatches(results);
    } catch (e) {
      console.error('Match fetch error:', e);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleIHaveThis = async () => {
    if (!auth.currentUser) {
      router.push('/(auth)/login');
      return;
    }
    if (!post) return;

    setContacting(true);
    try {
      const chatId = await startWantedChat(post.id, post.buyer_id);

      // Send an opening message automatically
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        text: `Hi! I saw your request for "${post.title}" and I think I can help. Are you still looking?`,
        senderId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        type: 'text',
      });

      // Update chat last message
      const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'chats', chatId), {
        lastMessage: `Hi! I saw your request for "${post.title}"...`,
        lastMessageTime: serverTimestamp(),
      });

      router.push(`/(tabs)/inbox/${chatId}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setContacting(false);
    }
  };

  if (loadingPost) {
    return (
      <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0F766E" />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
        <Text className="text-text-muted dark:text-text-darkMuted text-center mt-4">
          This request no longer exists.
        </Text>
      </SafeAreaView>
    );
  }

  const ListHeader = (
    <View>
      {/* Post detail card */}
      <View className="mx-4 mt-4 bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-5">
        <View className="flex-row items-center mb-3">
          <View className="w-10 h-10 bg-brand-primary rounded-full items-center justify-center mr-3">
            <Ionicons name="search" size={18} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-lg" numberOfLines={2}>
              {post.title}
            </Text>
            <Text className="text-text-muted dark:text-text-darkMuted text-xs">{timeAgo(post.created_at)} · {post.buyer_name}</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2 mb-3">
          <View className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            <Text className="text-text-muted dark:text-text-darkMuted text-xs font-semibold">{post.category}</Text>
          </View>
          {post.max_budget != null && (
            <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
              <Text className="text-green-700 dark:text-green-400 text-xs font-semibold">
                Budget: up to ${post.max_budget}
              </Text>
            </View>
          )}
          <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            <Ionicons name="location-outline" size={12} color="#94A3B8" />
            <Text className="text-text-muted dark:text-text-darkMuted text-xs font-semibold ml-1">{post.location}</Text>
          </View>
        </View>

        {post.description ? (
          <Text className="text-text-primary dark:text-text-darkPrimary text-sm leading-relaxed">
            {post.description}
          </Text>
        ) : null}
      </View>

      {/* Matched listings header */}
      <View className="px-4 mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="sparkles" size={16} color="#0F766E" />
          <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-base ml-1.5">
            {loadingMatches ? 'Finding matches...' : `${matches.length} Matching Listings`}
          </Text>
        </View>
        {!loadingMatches && matches.length > 0 && (
          <Text className="text-text-muted dark:text-text-darkMuted text-xs">Tap to view</Text>
        )}
      </View>

      {loadingMatches ? (
        <View className="items-center py-8">
          <ActivityIndicator color="#0F766E" />
          <Text className="text-text-muted dark:text-text-darkMuted text-sm mt-2">Scanning listings...</Text>
        </View>
      ) : matches.length === 0 ? (
        <View className="mx-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 items-center mb-4">
          <Ionicons name="cube-outline" size={36} color="#94A3B8" />
          <Text className="text-text-muted dark:text-text-darkMuted text-sm text-center mt-2">
            No listings match this request yet.
          </Text>
          <Text className="text-text-muted dark:text-text-darkMuted text-xs text-center mt-1">
            If you have this item, tap "I have this!" below.
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          horizontal
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <MatchedListingCard
              item={item}
              onPress={() => router.push(`/home/${item.id}`)}
            />
          )}
          style={{ marginBottom: 16 }}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top', 'bottom']}>
      {/* Nav */}
      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#0F766E" />
        </TouchableOpacity>
        <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-base flex-1" numberOfLines={1}>
          {post.title}
        </Text>
        <View className={`px-2 py-0.5 rounded-full ${post.status === 'open' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
          <Text className={`text-[10px] font-bold ${post.status === 'open' ? 'text-green-700 dark:text-green-400' : 'text-text-muted dark:text-text-darkMuted'}`}>
            {post.status === 'open' ? 'OPEN' : 'FULFILLED'}
          </Text>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: isOwner ? 20 : 100 }}
      />

      {/* "I have this!" CTA - only shown to non-owners */}
      {!isOwner && post.status === 'open' && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800">
          <TouchableOpacity
            onPress={handleIHaveThis}
            disabled={contacting}
            className={`py-4 rounded-2xl items-center justify-center flex-row ${
              contacting ? 'bg-brand-primary/60' : 'bg-brand-primary'
            }`}
          >
            {contacting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="hand-left-outline" size={20} color="#fff" />
                <Text className="text-white font-bold text-base ml-2">
                  I have this! Contact Buyer
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
