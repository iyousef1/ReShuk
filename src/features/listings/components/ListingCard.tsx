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
    condition?: string;
    is_ai_priced?: boolean;
  };
}

const CONDITION_COLORS: Record<string, string> = {
  likenew: '#22C55E',
  good: '#3B82F6',
  fair: '#F97316',
  poor: '#EF4444',
};

function getConditionColor(condition?: string) {
  if (!condition) return null;
  return CONDITION_COLORS[condition.toLowerCase().replace(/\s+/g, '')] ?? null;
}

function getConditionLabel(condition?: string) {
  if (!condition) return null;
  const key = condition.toLowerCase().replace(/\s+/g, '');
  if (key === 'likenew') return 'Like New';
  if (key === 'good') return 'Good';
  if (key === 'fair') return 'Fair';
  if (key === 'poor') return 'Poor';
  return condition;
}

export default function ListingCard({ item }: ListingCardProps) {
  const router = useRouter();

  const imageUrl = Array.isArray(item.image_url) && item.image_url.length > 0
    ? item.image_url[0]
    : (typeof item.image_url === 'string' ? item.image_url : 'https://color-hex.org/colors/e2e8f0.png');

  const conditionColor = getConditionColor(item.condition);
  const conditionLabel = getConditionLabel(item.condition);

  const isAiVerified = !!item.is_ai_priced;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/home/${item.id}`)}
      style={{
        backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
        borderWidth: 1, borderColor: '#F1F5F9',
      }}
    >
      <View style={{ aspectRatio: 1, width: '100%', backgroundColor: '#F1F5F9', position: 'relative' }}>
        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        {conditionColor && conditionLabel && (
          <View style={{
            position: 'absolute', top: 8, left: 8,
            backgroundColor: conditionColor, borderRadius: 20,
            paddingHorizontal: 8, paddingVertical: 3,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
              {conditionLabel}
            </Text>
          </View>
        )}
        {isAiVerified && (
          <View style={{
            position: 'absolute', top: 8, right: 8,
            backgroundColor: '#0F766E', borderRadius: 20,
            paddingHorizontal: 7, paddingVertical: 3,
            flexDirection: 'row', alignItems: 'center', gap: 3,
          }}>
            <Ionicons name="sparkles" size={9} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>AI</Text>
          </View>
        )}
      </View>
      <View style={{ padding: 11 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A', marginBottom: 2 }} numberOfLines={1}>
          {item.title || 'Untitled Item'}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F766E', marginBottom: 7 }}>
          ${item.price || 0}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="pricetag-outline" size={11} color="#94A3B8" />
          <Text style={{ fontSize: 11, fontWeight: '500', color: '#94A3B8', marginLeft: 4 }} numberOfLines={1}>
            {item.category || 'Other'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
