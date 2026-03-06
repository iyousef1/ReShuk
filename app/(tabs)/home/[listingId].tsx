import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Your Architecture Imports
import { startOrGetChat } from '../../../src/features/chat/api';

// Firebase Imports
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { listingId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStartingChat, setIsStartingChat] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (!listingId) return;
      
      try {
        const docRef = doc(db, 'listings', listingId as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setListing({ id: docSnap.id, ...docSnap.data() });
        } else {
          Alert.alert("Error", "This listing no longer exists.");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching listing:", error);
        Alert.alert("Error", "Could not load item details.");
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [listingId]);

  const handleMessageSeller = async () => {
    if (!auth.currentUser) {
      router.push('/(auth)/login');
      return;
    }

    // MATCHED TO YOUR DB SCHEMA: looking for seller_id
    const sellerId = listing.seller_id; 
    if (!sellerId) {
      Alert.alert("Error", "This item doesn't have a seller profile attached to it yet.");
      return;
    }

    if (auth.currentUser.uid === sellerId) {
      Alert.alert("Oops!", "You can't buy your own item!");
      return;
    }

    setIsStartingChat(true);
    try {
      const chatId = await startOrGetChat(listing.id, sellerId);
      router.push(`/(tabs)/inbox/${chatId}`);
    } catch (error: any) {
      Alert.alert("Error", "Could not start chat.");
      console.error(error);
    } finally {
      setIsStartingChat(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  if (!listing) return null;

  // MATCHED TO YOUR DB SCHEMA: Grabbing the first image from the image_url array
  const imageUrl = listing.image_url && listing.image_url.length > 0 
    ? listing.image_url[0] 
    : 'https://via.placeholder.com/400';

  return (
    <View className="flex-1 bg-surface-light dark:bg-surface-dark">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* HERO IMAGE SECTION */}
        <View className="relative w-full bg-slate-200 dark:bg-slate-800" style={{ height: width }}>
          <Image 
            source={{ uri: imageUrl }} 
            className="w-full h-full"
            resizeMode="cover"
          />
          
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ top: Math.max(insets.top, 20) }}
            className="absolute left-4 w-10 h-10 bg-black/40 rounded-full items-center justify-center backdrop-blur-md z-10"
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* DETAILS SECTION */}
        <View className="px-5 py-6">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary mb-2">
                {listing.title}
              </Text>
              {listing.category && (
                <View className="self-start bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full mb-2">
                  <Text className="text-text-muted dark:text-text-darkMuted text-xs font-semibold">
                    {listing.category}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-3xl font-extrabold text-brand-primary">
              ${listing.price}
            </Text>
          </View>

          <View className="flex-row items-center mb-6 py-4 border-y border-slate-100 dark:border-slate-800">
            <View className="w-12 h-12 bg-brand-primary/10 rounded-full items-center justify-center mr-4">
              <Ionicons name="location" size={24} color="#0F766E" />
            </View>
            <View>
              <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-base">
                {listing.location || 'Location not specified'}
              </Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-sm">
                Meetup or Delivery
              </Text>
            </View>
          </View>

          <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-2">
            Description
          </Text>
          <Text className="text-text-secondary dark:text-text-darkSecondary text-base leading-relaxed mb-8">
            {listing.description || 'No description provided by the seller.'}
          </Text>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM ACTION BAR */}
      <View 
        className="px-5 py-4 bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 flex-row items-center"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity className="w-14 h-14 bg-surface-cardLight dark:bg-surface-cardDark rounded-2xl border border-slate-200 dark:border-slate-800 items-center justify-center mr-3 shadow-sm">
          <Ionicons name="heart-outline" size={28} color="#94A3B8" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleMessageSeller}
          disabled={isStartingChat}
          className={`flex-1 h-14 rounded-2xl items-center justify-center flex-row shadow-sm ${
            isStartingChat ? 'bg-brand-primary/60' : 'bg-brand-primary shadow-brand-primary/30'
          }`}
        >
          {isStartingChat ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="chatbubbles-outline" size={20} color="#FFFFFF" className="mr-2" />
              <Text className="text-white font-bold text-lg">Message Seller</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}