import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { collection, doc, getDoc, onSnapshot, or, query, where } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

type Chat = {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  lastMessage: string;
  lastMessageTime: any;
  otherUserName: string;
};

export default function InboxListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const uid = auth.currentUser.uid;
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      or(
        where('buyerId', '==', uid),
        where('sellerId', '==', uid)
      )
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rawChats = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Collect unique other-user IDs
      const otherIds = [...new Set(rawChats.map((c: any) =>
        c.buyerId === uid ? c.sellerId : c.buyerId
      ))] as string[];

      // Batch-fetch their names
      const nameMap: Record<string, string> = {};
      await Promise.all(
        otherIds.map(async (otherId) => {
          try {
            const profileSnap = await getDoc(doc(db, 'profiles', otherId));
            nameMap[otherId] = profileSnap.exists()
              ? profileSnap.data().full_name ?? 'Unknown'
              : 'Unknown';
          } catch {
            nameMap[otherId] = 'Unknown';
          }
        })
      );

      const enriched: Chat[] = rawChats
        .map((c: any) => {
          const otherId = c.buyerId === uid ? c.sellerId : c.buyerId;
          return { ...c, otherUserName: nameMap[otherId] ?? 'Unknown' };
        })
        .sort((a: Chat, b: Chat) => {
          const aTime = a.lastMessageTime?.toMillis?.() ?? 0;
          const bTime = b.lastMessageTime?.toMillis?.() ?? 0;
          return bTime - aTime;
        });

      setChats(enriched);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderChatRow = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/inbox/${item.id}`)}
      className="flex-row items-center px-5 py-4 bg-surface-light dark:bg-surface-dark border-b border-slate-100 dark:border-slate-800"
    >
      <View className="w-14 h-14 bg-brand-primary/10 rounded-full items-center justify-center mr-4">
        <Ionicons name="person" size={24} color="#0F766E" />
      </View>

      <View className="flex-1">
        <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-1">
          {item.otherUserName}
        </Text>
        <Text
          className="text-text-muted dark:text-text-darkMuted"
          numberOfLines={1}
        >
          {item.lastMessage || 'Tap to start chatting'}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0F766E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      <View className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark">
        <Text className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary">
          Messages
        </Text>
      </View>

      {chats.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="chatbubbles-outline" size={64} color="#E2E8F0" />
          <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mt-4 mb-2">
            No messages yet
          </Text>
          <Text className="text-center text-text-muted dark:text-text-darkMuted">
            When you contact a seller or someone asks about your items, the chats will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatRow}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
