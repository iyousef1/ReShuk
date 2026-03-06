import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SellIndexScreen() {
  const router = useRouter();

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
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], // Fixed the deprecation warning!
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        // ENCODE the URL so Expo Router doesn't break the string
        const safeUri = encodeURIComponent(result.assets[0].uri);
        
        router.push({
          pathname: '/(tabs)/sell/category',
          params: { imageUri: safeUri }
        });
      }
    } catch (error) {
      console.error("Image picking error:", error);
      Alert.alert("Error", "Could not load the image picker.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark px-5 pt-8" edges={['bottom']}>
      <View className="items-center mb-10">
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

      <View className="space-y-4 mt-4">
        <TouchableOpacity 
          onPress={() => handlePickImage(true)}
          className="flex-row items-center bg-brand-primary p-4 rounded-2xl shadow-sm shadow-brand-primary/30"
        >
          <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-4">
            <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">Take a Photo</Text>
            <Text className="text-brand-primary-light text-sm text-white/80">Use your camera right now</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
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