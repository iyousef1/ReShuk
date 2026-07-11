import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SellIndexScreen() {
  const router = useRouter();

  const MAX_IMAGES = 6;

  const handlePickImage = async (useCamera: boolean) => {
    try {
      let result;

      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission Needed", "We need access to your camera to take photos of your items.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'], // Fixed the deprecation warning!
          allowsEditing: true,
          aspect: [1, 1], // square crop — matches how listings are displayed in the grid
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], // Fixed the deprecation warning!
          allowsMultipleSelection: true,
          selectionLimit: MAX_IMAGES,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets.length > 0) {
        // ENCODE each URI so Expo Router doesn't break the string, join into one param
        const safeUris = result.assets.map((asset) => encodeURIComponent(asset.uri)).join(',');

        router.push({
          pathname: '/(tabs)/sell/category',
          params: { imageUri: safeUris }
        });
      }
    } catch (error) {
      console.error("Image picking error:", error);
      Alert.alert("Error", "Could not load the image picker.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark px-5 pt-8" edges={['bottom']}>
      <View className="items-center mb-8">
        <View className="w-24 h-24 bg-brand-primary/10 rounded-full items-center justify-center mb-6">
          <Ionicons name="camera" size={48} color="#0F766E" />
        </View>
        <Text className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary text-center mb-2">
          What are you selling?
        </Text>
        <Text className="text-text-muted dark:text-text-darkMuted text-center px-4">
          Great photos help your items sell faster. Make sure the lighting is bright and clear!
        </Text>
      </View>

      {/* AI Assist — featured option */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/sell/ai-assist')}
        className="flex-row items-center bg-brand-primary p-4 rounded-2xl mb-3"
        style={{ shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
      >
        <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-4">
          <Ionicons name="sparkles" size={24} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-white font-bold text-lg">AI Listing Assistant</Text>
            <View className="bg-white/25 px-2 py-0.5 rounded-full ml-2">
              <Text className="text-white text-[10px] font-bold">NEW</Text>
            </View>
          </View>
          <Text className="text-white/80 text-sm">Auto-fill title, price & description</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <View className="flex-row items-center my-3">
        <View className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        <Text className="text-text-muted dark:text-text-darkMuted text-xs mx-3">or fill in manually</Text>
        <View className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      </View>

      <View className="gap-3">
        <TouchableOpacity
          onPress={() => handlePickImage(true)}
          className="flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 p-4 rounded-2xl"
        >
          <View className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mr-4">
            <Ionicons name="camera-outline" size={24} color="#0F766E" />
          </View>
          <View className="flex-1">
            <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-lg">Take a Photo</Text>
            <Text className="text-text-muted dark:text-text-darkMuted text-sm">Use your camera right now</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handlePickImage(false)}
          className="flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 p-4 rounded-2xl"
        >
          <View className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mr-4">
            <Ionicons name="images-outline" size={24} color="#0F766E" />
          </View>
          <View className="flex-1">
            <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-lg">Upload from Gallery</Text>
            <Text className="text-text-muted dark:text-text-darkMuted text-sm">Pick an existing photo</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}