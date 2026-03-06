import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = [
  { id: 'electronics', name: 'Electronics', icon: 'hardware-chip-outline', color: '#3B82F6' },
  { id: 'fashion', name: 'Fashion & Clothing', icon: 'shirt-outline', color: '#EC4899' },
  { id: 'home', name: 'Home & Garden', icon: 'home-outline', color: '#10B981' },
  { id: 'sports', name: 'Sports & Outdoors', icon: 'bicycle-outline', color: '#F59E0B' },
  { id: 'toys', name: 'Toys & Games', icon: 'game-controller-outline', color: '#8B5CF6' },
  { id: 'vehicles', name: 'Vehicles', icon: 'car-sport-outline', color: '#EF4444' },
  { id: 'other', name: 'Other', icon: 'cube-outline', color: '#64748B' },
];

export default function SellCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Safely extract the image URI, ensuring it stays a string
  const safeImageUri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;

  const handleSelectCategory = (categoryName: string) => {
    router.push({
      pathname: '/(tabs)/sell/details',
      params: { 
        imageUri: safeImageUri, 
        category: categoryName 
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['bottom']}>
      <View className="px-5 mb-6 pt-4">
        <Text className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary">
          Choose a Category
        </Text>
        <Text className="text-text-muted dark:text-text-darkMuted mt-1">
          Help buyers find your item faster.
        </Text>
      </View>

      <ScrollView className="flex-1 px-5">
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => handleSelectCategory(cat.name)}
            className="flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 p-4 rounded-2xl mb-3"
          >
            <View 
              className="w-12 h-12 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: `${cat.color}15` }} 
            >
              <Ionicons name={cat.icon as any} size={24} color={cat.color} />
            </View>
            <Text className="flex-1 text-text-primary dark:text-text-darkPrimary font-bold text-lg">
              {cat.name}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}