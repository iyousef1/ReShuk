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

// Firebase Imports
import { collection, getDocs, or, query, where } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

export default function InboxListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const uid = auth.currentUser.uid;

      try {
        // Fetch chats where the user is EITHER the buyer OR the seller
        const chatsRef = collection(db, 'chats');
        const q = query(
          chatsRef,
          or(
            where('buyerId', '==', uid),
            where('sellerId', '==', uid)
          ),
          // orderBy('lastMessageTime', 'desc') // <-- We will enable this once you send your first message!
        );

        const snapshot = await getDocs(q);
        const fetchedChats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setChats(fetchedChats);
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  // What each chat row looks like
  const renderChatRow = ({ item }: { item: any }) => {
    // Determine if we are talking to the buyer or the seller
    const isBuyer = item.buyerId === auth.currentUser?.uid;
    const otherUserId = isBuyer ? item.sellerId : item.buyerId;

    return (
      <TouchableOpacity 
        onPress={() => router.push(`/(tabs)/inbox/${item.id}`)}
        className="flex-row items-center px-5 py-4 bg-surface-light dark:bg-surface-dark border-b border-slate-100 dark:border-slate-800"
      >
        <View className="w-14 h-14 bg-brand-primary/10 rounded-full items-center justify-center mr-4">
          <Ionicons name="person" size={24} color="#0F766E" />
        </View>
        
        <View className="flex-1">
          <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-1">
            User {otherUserId.substring(0, 5)}... {/* We will replace this with their real name later! */}
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
  };

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