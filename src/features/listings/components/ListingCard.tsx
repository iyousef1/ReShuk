import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

export default function ListingCard({ item }: { item: any }) {
  const router = useRouter();

  // Safely grab the first image from your Firebase array
  const imageUrl = item.image_url && item.image_url.length > 0 
    ? item.image_url[0] 
    : 'https://via.placeholder.com/150'; 

  return (
    <TouchableOpacity 
      onPress={() => router.push(`/(tabs)/home/${item.id}`)}
      className="flex-1 m-2 bg-surface-cardLight dark:bg-surface-cardDark rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <Image 
        source={{ uri: imageUrl }} 
        className="w-full h-40 bg-slate-200 dark:bg-slate-800"
        resizeMode="cover"
      />
      
      <View className="p-3">
        <Text 
          className="font-bold text-base text-text-primary dark:text-text-darkPrimary" 
          numberOfLines={1}
        >
          {item.title}
        </Text>
        
        <Text className="text-brand-primary font-extrabold text-lg mt-1">
          ${item.price}
        </Text>
        
        <View className="flex-row items-center mt-2">
          <Ionicons name="location-outline" size={14} color="#94A3B8" />
          <Text 
            className="text-text-muted dark:text-text-darkMuted text-xs ml-1 flex-1" 
            numberOfLines={1}
          >
            {item.location}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}