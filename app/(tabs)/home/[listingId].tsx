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

// Firebase Imports (Added updateDoc, increment, setDoc for the algorithm)
import { deleteDoc, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { listingId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchListing = async () => {
      if (!listingId) return;
      
      try {
        const docRef = doc(db, 'listings', listingId as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const itemData = docSnap.data();
          setListing({ id: docSnap.id, ...itemData });

          // ---------------------------------------------------------
          // ALGORITHM: TRACKER
          // ---------------------------------------------------------
          if (auth.currentUser && itemData.search_terms) {
            const userRef = doc(db, 'profiles', auth.currentUser.uid);

            const updates: Record<string, any> = {
              keyword_scores_updated_at: serverTimestamp(),
            };

            // +1 per keyword view
            itemData.search_terms.forEach((word: string) => {
              updates[`keyword_scores.${word}`] = increment(1);
            });

            // +2 for category (stronger signal than individual words)
            if (itemData.category) {
              updates[`category_scores.${itemData.category}`] = increment(2);
            }

            try {
              await updateDoc(userRef, updates);
            } catch {
              // Document doesn't exist yet — create it
              const initialKeywords: Record<string, number> = {};
              itemData.search_terms.forEach((word: string) => { initialKeywords[word] = 1; });
              await setDoc(userRef, {
                keyword_scores: initialKeywords,
                keyword_scores_updated_at: serverTimestamp(),
                ...(itemData.category ? { category_scores: { [itemData.category]: 2 } } : {}),
              }, { merge: true });
            }
          }
          // ---------------------------------------------------------

          // Check if already saved
          if (auth.currentUser) {
            const savedSnap = await getDoc(doc(db, 'profiles', auth.currentUser.uid, 'saved', docSnap.id));
            setIsSaved(savedSnap.exists());
          }
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

  const handleToggleSave = async () => {
    if (!auth.currentUser) {
      router.push('/(auth)/login');
      return;
    }
    const savedRef = doc(db, 'profiles', auth.currentUser.uid, 'saved', listing.id);
    if (isSaved) {
      await deleteDoc(savedRef);
      setIsSaved(false);
    } else {
      await setDoc(savedRef, {
        title: listing.title,
        price: listing.price,
        image_url: listing.image_url,
        category: listing.category,
        saved_at: serverTimestamp(),
      });
      setIsSaved(true);
    }
  };

  const handleMessageSeller = async () => {
    if (!auth.currentUser) {
      router.push('/(auth)/login');
      return;
    }

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

  const images: string[] = Array.isArray(listing.image_url) && listing.image_url.length > 0
    ? listing.image_url
    : (typeof listing.image_url === 'string' && listing.image_url
        ? [listing.image_url]
        : ['https://via.placeholder.com/400']);

  return (
    <View className="flex-1 bg-surface-light dark:bg-surface-dark">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* HERO IMAGE SECTION */}
        <View className="relative w-full bg-slate-200 dark:bg-slate-800" style={{ height: width }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(index);
            }}
          >
            {images.map((uri, index) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                style={{ width, height: width }}
                resizeMode="contain"
              />
            ))}
          </ScrollView>

          {images.length > 1 && (
            <View className="absolute bottom-3 w-full flex-row justify-center" style={{ gap: 6 }}>
              {images.map((_, index) => (
                <View
                  key={index}
                  className={`h-1.5 rounded-full ${index === activeImageIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </View>
          )}

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
              ₪{listing.price}
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
          <Text className="text-text-muted dark:text-text-darkMuted text-base leading-relaxed mb-8">
            {listing.description || 'No description provided by the seller.'}
          </Text>

          {/* AI CONFIDENCE NOTE */}
          {listing.is_ai_priced && listing.ai_confidence_reason && (
            <View style={{
              flexDirection: 'row', alignItems: 'flex-start',
              backgroundColor: '#FEFCE8', borderWidth: 1, borderColor: '#FEF08A',
              borderRadius: 14, padding: 14, marginBottom: 20,
            }}>
              <Ionicons name="information-circle-outline" size={18} color="#CA8A04" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, marginLeft: 10, fontSize: 13, color: '#854D0E', lineHeight: 20 }}>
                {listing.ai_confidence_reason}
              </Text>
            </View>
          )}

          {/* AI ASSESSMENT SECTION */}
          {(() => {
            const ai = listing.ai_info;
            if (!ai) return null;
            const hasContent =
              ai.condition || ai.defects?.length || ai.includedItems?.length ||
              ai.missingItems?.length || ai.warranty || ai.pickupAreas?.length ||
              ai.deliveryAvailable || ai.extraNotes || ai.negotiable != null;
            if (!hasContent) return null;

            const CONDITION_STYLE: Record<string, { bg: string; text: string }> = {
              'like new': { bg: '#DCFCE7', text: '#15803D' },
              'likenew':  { bg: '#DCFCE7', text: '#15803D' },
              'good':     { bg: '#DBEAFE', text: '#1D4ED8' },
              'fair':     { bg: '#FEF3C7', text: '#B45309' },
              'poor':     { bg: '#FEE2E2', text: '#DC2626' },
              'new':      { bg: '#DCFCE7', text: '#15803D' },
            };
            const condStyle = CONDITION_STYLE[ai.condition?.toLowerCase()] ?? { bg: '#F1F5F9', text: '#475569' };

            return (
              <View style={{ marginBottom: 32 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <Ionicons name="sparkles" size={14} color="#0F766E" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }} className="dark:text-text-darkPrimary">
                    Item Details
                  </Text>
                  <View style={{ marginLeft: 8, backgroundColor: '#CCFBF1', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#0F766E' }}>AI VERIFIED</Text>
                  </View>
                </View>

                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' }}
                      className="dark:bg-surface-cardDark dark:border-slate-800">

                  {/* Condition */}
                  {!!ai.condition && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#0F766E" />
                        <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#475569' }} className="dark:text-text-darkMuted">Condition</Text>
                      </View>
                      <View style={{ backgroundColor: condStyle.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: condStyle.text }}>{ai.condition}</Text>
                      </View>
                    </View>
                  )}

                  {/* Negotiable */}
                  {ai.negotiable != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="pricetag-outline" size={16} color="#0F766E" />
                        <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#475569' }} className="dark:text-text-darkMuted">Price</Text>
                      </View>
                      <View style={{ backgroundColor: ai.negotiable ? '#DCFCE7' : '#FEE2E2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: ai.negotiable ? '#15803D' : '#DC2626' }}>
                          {ai.negotiable ? 'Negotiable' : 'Fixed Price'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Delivery */}
                  {ai.deliveryAvailable != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="bicycle-outline" size={16} color="#0F766E" />
                        <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#475569' }} className="dark:text-text-darkMuted">Delivery</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }} className="dark:text-text-darkPrimary">
                        {ai.deliveryAvailable
                          ? ai.deliveryFee != null ? `Available · ₪${ai.deliveryFee}` : 'Available'
                          : 'Pickup only'}
                      </Text>
                    </View>
                  )}

                  {/* Pickup areas */}
                  {ai.pickupAreas?.length > 0 && (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="location-outline" size={16} color="#0F766E" />
                        <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#475569' }} className="dark:text-text-darkMuted">Pickup Areas</Text>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {ai.pickupAreas.map((area: string) => (
                          <View key={area} style={{ backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}
                                className="dark:bg-slate-800">
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }} className="dark:text-text-darkMuted">{area}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Included items */}
                  {ai.includedItems?.length > 0 && (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#15803D" />
                        <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#475569' }} className="dark:text-text-darkMuted">Included</Text>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {ai.includedItems.map((item: string) => (
                          <View key={item} style={{ backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#15803D' }}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Missing items */}
                  {ai.missingItems?.length > 0 && (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                        <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#475569' }} className="dark:text-text-darkMuted">Not Included</Text>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {ai.missingItems.map((item: string) => (
                          <View key={item} style={{ backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626' }}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Defects */}
                  {ai.defects?.length > 0 && (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="warning-outline" size={16} color="#B45309" />
                        <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#475569' }} className="dark:text-text-darkMuted">Known Issues</Text>
                      </View>
                      {ai.defects.map((defect: string) => (
                        <View key={defect} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                          <Text style={{ color: '#B45309', marginRight: 6, marginTop: 1 }}>•</Text>
                          <Text style={{ fontSize: 13, color: '#475569', flex: 1 }} className="dark:text-text-darkMuted">{defect}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Warranty */}
                  {!!ai.warranty && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="ribbon-outline" size={16} color="#0F766E" />
                        <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#475569' }} className="dark:text-text-darkMuted">Warranty</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A', maxWidth: 180, textAlign: 'right' }} className="dark:text-text-darkPrimary">{ai.warranty}</Text>
                    </View>
                  )}

                  {/* Extra notes */}
                  {!!ai.extraNotes && (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 13 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="information-circle-outline" size={16} color="#0F766E" />
                        <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#475569' }} className="dark:text-text-darkMuted">Seller Note</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20 }} className="dark:text-text-darkMuted">{ai.extraNotes}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })()}
        </View>
      </ScrollView>

      {/* STICKY BOTTOM ACTION BAR */}
      <View 
        className="px-5 py-4 bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 flex-row items-center"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          onPress={handleToggleSave}
          className="w-14 h-14 bg-surface-cardLight dark:bg-surface-cardDark rounded-2xl border border-slate-200 dark:border-slate-800 items-center justify-center mr-3 shadow-sm"
        >
          <Ionicons name={isSaved ? "heart" : "heart-outline"} size={28} color={isSaved ? "#EF4444" : "#94A3B8"} />
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