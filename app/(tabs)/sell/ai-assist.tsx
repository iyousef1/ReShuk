import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../../../src/lib/firebase';

import ListingAssistant, {
  ListingResult,
} from '../../../src/features/listings/components/ListingAssistant';



async function uploadUri(uri: string, uid: string): Promise<string> {
  // URIs coming from the AI flow are already resized to 1280px during analysis — no need to resize again.
  const response = await fetch(uri);
  const blob = await response.blob();
  const filename = `listings/${uid}/ai_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export default function AiAssistScreen() {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async (listing: ListingResult, imageUris: string[], location: string) => {
    if (!auth.currentUser) {
      Alert.alert('Sign in required', 'Please sign in before posting a listing.');
      router.push('/(auth)/login');
      return;
    }

    setPublishing(true);
    try {
      // Upload all images in parallel
      const uid = auth.currentUser.uid;
      const uploadedUrls = await Promise.all(imageUris.map((uri) => uploadUri(uri, uid)));

      const searchTerms = [
        ...listing.title.toLowerCase().split(' ').filter((w) => w.length > 2),
        listing.brand.toLowerCase(),
        listing.model.toLowerCase(),
        listing.condition,
      ].filter(Boolean);

      const newRef = doc(collection(db, 'listings'));
      await setDoc(newRef, {
        id: newRef.id,
        title: listing.title,
        price: listing.price_estimate.suggested,
        description: listing.description,
        location: location.trim(),
        category: listing.category,
        sub_category: listing.sub_category ?? '',
        brand: listing.brand,
        model: listing.model,
        condition: listing.condition,
        color: listing.attributes?.color ?? '',
        attributes: {
          ...listing.attributes,
          brand: listing.brand,
          model: listing.model,
          condition: listing.condition,
        },
        image_url: uploadedUrls,
        seller_id: auth.currentUser.uid,
        status: 'active',
        is_ai_priced: true,
        ai_confidence: listing.confidence,
        ai_confidence_reason: listing.confidence !== 'high' ? (listing.confidence_reason ?? null) : null,
        search_terms: [...new Set(searchTerms)],
        created_at: serverTimestamp(),
      });

      Alert.alert('Posted!', 'Your listing is now live.', [
        { text: 'OK', onPress: () => { router.dismissAll(); router.replace('/(tabs)/home'); } },
      ]);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['bottom']}>
      {publishing && (
        <View className="absolute inset-0 z-50 bg-black/40 items-center justify-center">
          <View className="bg-white dark:bg-slate-900 rounded-2xl px-8 py-6 items-center mx-8">
            <ActivityIndicator size="large" color="#0F766E" />
            <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-base mt-3">
              Publishing listing...
            </Text>
            <Text className="text-text-muted dark:text-text-darkMuted text-sm mt-1 text-center">
              Uploading photos and saving your listing
            </Text>
          </View>
        </View>
      )}
      <ListingAssistant onPublish={handlePublish} />
    </SafeAreaView>
  );
}
