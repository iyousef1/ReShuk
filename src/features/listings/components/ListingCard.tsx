import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface ListingCardProps {
  item: {
    id: string;
    title: string;
    price: number | string;
    image_url: string | string[];
    category: string;
  };
}

export default function ListingCard({ item }: ListingCardProps) {
  const router = useRouter();

  const imageUrl = Array.isArray(item.image_url) && item.image_url.length > 0 
    ? item.image_url[0] 
    : (typeof item.image_url === 'string' ? item.image_url : 'https://color-hex.org/colors/e2e8f0.png');

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => router.push(`/home/${item.id}`)}
      className="bg-surface-cardLight dark:bg-surface-cardDark rounded-2xl mb-4 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
    >
      <View className="aspect-square w-full bg-slate-100 dark:bg-slate-800">
        <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
      </View>
      <View className="p-3">
        <Text className="text-base font-semibold text-text-primary dark:text-text-darkPrimary mb-1" numberOfLines={1}>
          {item.title || 'Untitled Item'}
        </Text>
        <Text className="text-lg font-bold text-brand-primary mb-2">
          ${item.price || 0}
        </Text>
        <View className="flex-row items-center">
          <Ionicons name="pricetag-outline" size={12} color="#94A3B8" />
          <Text className="text-xs font-medium text-text-muted dark:text-text-darkMuted ml-1" numberOfLines={1}>
            {item.category || 'Other'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}