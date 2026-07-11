import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

export default function MyListingsScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'listings'),
      where('seller_id', '==', uid),
      orderBy('created_at', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'listings', id));
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const imageUrl =
      Array.isArray(item.image_url) && item.image_url.length > 0
        ? item.image_url[0]
        : typeof item.image_url === 'string'
        ? item.image_url
        : null;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/home/${item.id}`)}
        className="flex-1 m-2 bg-surface-cardLight dark:bg-surface-cardDark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <View className="aspect-square w-full bg-slate-100 dark:bg-slate-800">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Ionicons name="image-outline" size={32} color="#94A3B8" />
            </View>
          )}
        </View>
        <View className="p-3">
          <Text
            className="text-text-primary dark:text-text-darkPrimary font-semibold text-sm mb-1"
            numberOfLines={1}
          >
            {item.title || 'Untitled'}
          </Text>
          <Text className="text-brand-primary font-bold text-base mb-2">₪{item.price}</Text>
          <View className="flex-row items-center justify-between">
            <View className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              <Text className="text-text-muted dark:text-text-darkMuted text-[10px] font-semibold">
                {item.category}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.title)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* AI Assistant shortcuts */}
          <View className="flex-row gap-2 mt-3">
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/profile/listing-ai-info',
                  params: { listingId: item.id, listingTitle: item.title ?? '' },
                })
              }
              className="flex-1 flex-row items-center justify-center gap-1 bg-brand-primary/10 rounded-full py-1.5"
            >
              <Ionicons name="sparkles" size={11} color="#0F766E" />
              <Text className="text-brand-primary text-[11px] font-bold">AI Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/profile/saved-answers',
                  params: { listingId: item.id, listingTitle: item.title ?? '' },
                })
              }
              className="flex-1 flex-row items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full py-1.5"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={11} color="#64748B" />
              <Text className="text-text-muted dark:text-text-darkMuted text-[11px] font-bold">Q&A</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#0F766E" />
        </TouchableOpacity>
        <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-lg flex-1">
          My Listings
        </Text>
        {!loading && (
          <Text className="text-text-muted dark:text-text-darkMuted text-sm">
            {listings.length} item{listings.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 6, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-24 px-8">
              <View className="w-20 h-20 bg-brand-primary/10 rounded-full items-center justify-center mb-4">
                <Ionicons name="pricetag-outline" size={36} color="#0F766E" />
              </View>
              <Text className="text-xl font-bold text-text-primary dark:text-text-darkPrimary text-center mb-2">
                No listings yet
              </Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-center mb-6">
                Tap the + button to sell your first item!
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/sell')}
                className="bg-brand-primary px-6 py-3 rounded-full"
              >
                <Text className="text-white font-bold">Start Selling</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
