import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { collection, doc, onSnapshot, orderBy, query, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const q = query(
      collection(db, 'profiles', uid, 'notifications'),
      orderBy('created_at', 'desc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);

      // Mark all unread as read in one batch
      const unread = snap.docs.filter((d) => !d.data().read);
      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach((d) =>
          batch.update(doc(db, 'profiles', uid, 'notifications', d.id), { read: true })
        );
        await batch.commit();
      }
    });

    return () => unsub();
  }, []);

  const handlePress = (item: any) => {
    if (item.type === 'price_drop') {
      router.push(`/home/${item.listingId}`);
    } else if (item.type === 'wanted_match') {
      router.push(`/(tabs)/wanted/${item.wantedPostId}`);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isPriceDrop = item.type === 'price_drop';
    return (
      <TouchableOpacity
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
        className={`flex-row items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 ${
          !item.read ? 'bg-brand-primary/5 dark:bg-brand-primary/10' : ''
        }`}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className="w-12 h-12 rounded-xl mr-3"
            resizeMode="cover"
          />
        ) : (
          <View
            className={`w-12 h-12 rounded-xl mr-3 items-center justify-center ${
              isPriceDrop ? 'bg-green-100 dark:bg-green-900/30' : 'bg-brand-primary/10'
            }`}
          >
            <Ionicons
              name={isPriceDrop ? 'trending-down' : 'search-circle-outline'}
              size={24}
              color={isPriceDrop ? '#16A34A' : '#0F766E'}
            />
          </View>
        )}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text
              className="text-text-primary dark:text-text-darkPrimary font-bold text-sm flex-1 mr-2"
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.read && (
              <View className="w-2 h-2 bg-brand-primary rounded-full" />
            )}
          </View>
          <Text className="text-text-muted dark:text-text-darkMuted text-xs" numberOfLines={2}>
            {item.body}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#0F766E" />
        </TouchableOpacity>
        <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-lg">
          Notifications
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-24 px-8">
              <View className="w-20 h-20 bg-brand-primary/10 rounded-full items-center justify-center mb-4">
                <Ionicons name="notifications-outline" size={36} color="#0F766E" />
              </View>
              <Text className="text-xl font-bold text-text-primary dark:text-text-darkPrimary text-center mb-2">
                No notifications yet
              </Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-center">
                We'll notify you when saved items drop in price or someone wants what you're selling.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
