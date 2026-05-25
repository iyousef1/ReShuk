import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

const CATEGORIES = ['Electronics', 'Fashion', 'Home', 'Sports', 'Books', 'Vehicles', 'Other'];

export default function CreateWantedScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !category || !location.trim()) {
      Alert.alert('Missing Info', 'Please fill in title, category, and location.');
      return;
    }

    setSubmitting(true);
    try {
      const uid = auth.currentUser!.uid;
      const profileSnap = await getDoc(doc(db, 'profiles', uid));
      const buyerName = profileSnap.exists()
        ? profileSnap.data().name ?? 'Anonymous'
        : 'Anonymous';

      const searchTerms = title
        .toLowerCase()
        .split(' ')
        .filter((w) => w.length > 2);

      const ref = doc(collection(db, 'wanted_posts'));
      await setDoc(ref, {
        id: ref.id,
        buyer_id: uid,
        buyer_name: buyerName,
        title: title.trim(),
        category,
        max_budget: maxBudget ? Number(maxBudget) : null,
        location: location.trim(),
        description: description.trim(),
        status: 'open',
        created_at: serverTimestamp(),
        search_terms: searchTerms,
      });

      router.back();
      // Navigate to the new post to see matches immediately
      router.push(`/(tabs)/wanted/${ref.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="close" size={24} color="#94A3B8" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text-primary dark:text-text-darkPrimary flex-1">
            Post a Request
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className={`px-4 py-2 rounded-full ${submitting ? 'bg-brand-primary/50' : 'bg-brand-primary'}`}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-bold text-sm">Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 uppercase tracking-wider">
              What are you looking for? *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. iPhone 13 Pro Max, Blue Nike Shoes..."
              placeholderTextColor="#94A3B8"
              className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-text-primary dark:text-text-darkPrimary text-base"
            />
          </View>

          {/* Category */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-2 uppercase tracking-wider">
              Category *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full border ${
                    category === cat
                      ? 'bg-brand-primary border-brand-primary'
                      : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      category === cat
                        ? 'text-white'
                        : 'text-text-primary dark:text-text-darkPrimary'
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Budget + Location row */}
          <View className="flex-row gap-3 mb-4">
            <View className="w-1/3">
              <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 uppercase tracking-wider">
                Max Budget ($)
              </Text>
              <TextInput
                value={maxBudget}
                onChangeText={setMaxBudget}
                placeholder="Any"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-brand-primary font-bold text-base"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 uppercase tracking-wider">
                Location *
              </Text>
              <View className="relative justify-center">
                <Ionicons
                  name="location-outline"
                  size={18}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: 12, zIndex: 1 }}
                />
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Jerusalem"
                  placeholderTextColor="#94A3B8"
                  className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-text-primary dark:text-text-darkPrimary text-base"
                />
              </View>
            </View>
          </View>

          {/* Description */}
          <View className="mb-10">
            <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 uppercase tracking-wider">
              More Details (optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Condition, colour, size, anything specific..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-text-primary dark:text-text-darkPrimary text-base min-h-[100px]"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
