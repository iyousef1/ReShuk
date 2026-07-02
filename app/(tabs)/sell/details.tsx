import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Firebase Imports
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../../../src/lib/firebase';

import { CATEGORY_CONFIG } from '../../../src/features/listings/categoryConfig';
import CityPicker from '../../../src/components/ui/CityPicker';

export default function SellDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Safely extract the strings
  const rawImageUri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;
  const rawCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const rawSubCategory = Array.isArray(params.subCategory) ? params.subCategory[0] : params.subCategory;

  // DECODE the image URL back to normal so the phone can read the file path
  const imageUri = rawImageUri ? decodeURIComponent(rawImageUri) : null;
  const category = rawCategory ?? '';
  const subCategory = rawSubCategory ?? '';

  // Find the category config for this category
  const categoryConfig = CATEGORY_CONFIG.find((c) => c.name === category) ?? null;

  // Form State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [attributes, setAttributes] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAttributeToggle = (key: string, value: string) => {
    setAttributes((prev) => {
      // Toggle: if already selected, deselect
      if (prev[key] === value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  };

  const handleAttributeText = (key: string, value: string) => {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const uploadImageAsync = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `listings/${auth.currentUser!.uid}/item_${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handlePublish = async () => {
    if (!title || !price || !location || !imageUri) {
      Alert.alert('Missing Info', 'Please fill out all required fields.');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Authentication Required', 'You must be logged in to post an item.');
      router.push('/(auth)/login');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedImageUrl = await uploadImageAsync(imageUri as string);
      const newListingRef = doc(collection(db, 'listings'));

      // Generate search terms from title
      const generatedSearchTerms = title
        .toLowerCase()
        .split(' ')
        .filter((word) => word.length > 2);

      // Append brand and condition to search terms if set
      const brand = attributes.brand ?? '';
      const condition = attributes.condition ?? '';
      const color = attributes.color ?? '';

      if (brand) generatedSearchTerms.push(brand.toLowerCase());
      if (condition) generatedSearchTerms.push(condition.toLowerCase());

      await setDoc(newListingRef, {
        id: newListingRef.id,
        title: title,
        price: Number(price),
        description: description,
        location: location,
        category: category || 'Other',
        sub_category: subCategory || '',
        brand: brand,
        condition: condition,
        color: color,
        attributes: attributes,
        image_url: [uploadedImageUrl],
        seller_id: auth.currentUser.uid,
        status: 'active',
        is_ai_priced: false,
        created_at: serverTimestamp(),
        search_terms: generatedSearchTerms,
      });

      Alert.alert('Success!', 'Your item is now live.');
      router.dismissAll();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>

          {/* Image + Category Preview Card */}
          <View className="flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark p-3 rounded-2xl mb-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            {imageUri ? (
              <Image source={{ uri: imageUri as string }} className="w-16 h-16 rounded-xl" />
            ) : (
              <View className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-xl items-center justify-center">
                <Ionicons name="image-outline" size={24} color="#94A3B8" />
              </View>
            )}
            <View className="ml-4 flex-1">
              <Text className="text-text-primary dark:text-text-darkPrimary font-bold">
                Selected Image
              </Text>
              <Text className="text-brand-primary text-sm font-medium">{category}</Text>
              {subCategory ? (
                <View className="mt-1 self-start bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-text-muted dark:text-text-darkMuted font-medium">
                    {subCategory}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Title + Price */}
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 uppercase tracking-wider">
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What is it?"
                placeholderTextColor="#94A3B8"
                className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-text-primary dark:text-text-darkPrimary text-base"
              />
            </View>
            <View className="w-1/3">
              <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 uppercase tracking-wider">
                Price ($)
              </Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-brand-primary font-bold text-base"
              />
            </View>
          </View>

          {/* Location */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 uppercase tracking-wider">
              Location
            </Text>
            <CityPicker value={location} onChange={setLocation} />
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 uppercase tracking-wider">
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe condition, size, reason for selling..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-text-primary dark:text-text-darkPrimary text-base min-h-[100px]"
            />
          </View>

          {/* Item Details Section */}
          {categoryConfig && categoryConfig.attributes.length > 0 && (
            <>
              {/* Divider */}
              <View className="flex-row items-center mb-5">
                <View className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <View className="mx-3">
                  <Text className="text-base font-bold text-text-primary dark:text-text-darkPrimary">
                    Item Details
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-text-darkMuted text-center">
                    (Optional)
                  </Text>
                </View>
                <View className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </View>

              {/* Brand pills (if category has brands) */}
              {categoryConfig.brands.length > 0 && (
                <View className="mb-5">
                  <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-2 uppercase tracking-wider">
                    Brand
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 4 }}
                  >
                    {categoryConfig.brands.map((brand) => {
                      const isSelected = attributes['brand'] === brand;
                      return (
                        <TouchableOpacity
                          key={brand}
                          onPress={() => handleAttributeToggle('brand', brand)}
                          className={`mr-2 px-4 py-2 rounded-full border ${
                            isSelected
                              ? 'bg-brand-primary border-brand-primary'
                              : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              isSelected
                                ? 'text-white'
                                : 'text-text-primary dark:text-text-darkPrimary'
                            }`}
                          >
                            {brand}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Dynamic attributes */}
              {categoryConfig.attributes.map((attr) => (
                <View key={attr.key} className="mb-5">
                  <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-2 uppercase tracking-wider">
                    {attr.label}
                  </Text>

                  {attr.type === 'pills' && attr.options ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: 4 }}
                    >
                      {attr.options.map((opt) => {
                        const isSelected = attributes[attr.key] === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            onPress={() => handleAttributeToggle(attr.key, opt.value)}
                            className={`mr-2 px-4 py-2 rounded-full border ${
                              isSelected
                                ? 'bg-brand-primary border-brand-primary'
                                : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <Text
                              className={`text-sm font-medium ${
                                isSelected
                                  ? 'text-white'
                                  : 'text-text-primary dark:text-text-darkPrimary'
                              }`}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : attr.type === 'text' ? (
                    <TextInput
                      value={attributes[attr.key] ?? ''}
                      onChangeText={(val) => handleAttributeText(attr.key, val)}
                      placeholder={attr.placeholder ?? ''}
                      placeholderTextColor="#94A3B8"
                      className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-text-primary dark:text-text-darkPrimary text-base"
                    />
                  ) : null}
                </View>
              ))}
            </>
          )}

          {/* Publish Button */}
          <TouchableOpacity
            onPress={handlePublish}
            disabled={isSubmitting}
            className={`py-4 rounded-xl items-center justify-center flex-row mb-10 ${
              isSubmitting ? 'bg-brand-primary/60' : 'bg-brand-primary'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" className="mr-2" />
            ) : (
              <Ionicons name="rocket-outline" size={20} color="#FFFFFF" className="mr-2" />
            )}
            <Text className="text-white font-bold text-lg">
              {isSubmitting ? 'Publishing...' : 'Publish Listing'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
