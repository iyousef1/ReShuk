import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORY_CONFIG, CategoryConfig } from '../../../src/features/listings/categoryConfig';

export default function SellCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const safeImageUri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCategoryPress = (cat: CategoryConfig) => {
    if (cat.subCategories.length === 0) {
      router.push({
        pathname: '/(tabs)/sell/details',
        params: { imageUri: safeImageUri, category: cat.name, subCategory: '' },
      });
      return;
    }
    setExpandedId((prev) => (prev === cat.id ? null : cat.id));
  };

  const handleSubCategoryPress = (cat: CategoryConfig, subCatName: string) => {
    router.push({
      pathname: '/(tabs)/sell/details',
      params: { imageUri: safeImageUri, category: cat.name, subCategory: subCatName },
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

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {CATEGORY_CONFIG.map((cat) => {
          const isExpanded = expandedId === cat.id;
          const hasSubCategories = cat.subCategories.length > 0;

          return (
            <View key={cat.id} className="mb-3">
              {/* Main Category Card */}
              <TouchableOpacity
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.75}
                style={
                  isExpanded
                    ? {
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                      }
                    : undefined
                }
                className="flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 p-4 rounded-2xl"
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: `${cat.color}18` }}
                >
                  <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                </View>
                <Text className="flex-1 text-text-primary dark:text-text-darkPrimary font-bold text-lg">
                  {cat.name}
                </Text>
                {hasSubCategories ? (
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#94A3B8"
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                )}
              </TouchableOpacity>

              {/* Sub-category accordion panel */}
              {isExpanded && hasSubCategories && (
                <View
                  style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                  className="bg-surface-cardLight dark:bg-surface-cardDark border border-t-0 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
                >
                  {cat.subCategories.map((sub, index) => (
                    <TouchableOpacity
                      key={sub.id}
                      onPress={() => handleSubCategoryPress(cat, sub.name)}
                      activeOpacity={0.65}
                      className={`flex-row items-center px-4 py-3 ${
                        index < cat.subCategories.length - 1
                          ? 'border-b border-slate-100 dark:border-slate-800'
                          : ''
                      }`}
                    >
                      {/* Colored dot */}
                      <View
                        className="w-2.5 h-2.5 rounded-full mr-3"
                        style={{ backgroundColor: cat.color }}
                      />
                      <Text className="flex-1 text-text-primary dark:text-text-darkPrimary font-medium text-base">
                        {sub.name}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Bottom padding */}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
