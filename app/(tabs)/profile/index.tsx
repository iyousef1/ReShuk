import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Firebase Imports
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

export default function ProfileScreen() {
  const router = useRouter();
  
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch the user's data when the screen loads
  useEffect(() => {
    const fetchUserProfile = async () => {
      // Double check that we actually have a logged-in user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Find the document in the 'profiles' collection that matches their UID
        const docRef = doc(db, 'profiles', currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfileData(docSnap.data());
        } else {
          console.log("No profile found!");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // 2. Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Kick them back to the Home feed as a guest once logged out
      router.replace('/(tabs)/home'); 
    } catch (error: any) {
      Alert.alert("Error signing out", error.message);
    }
  };

  // 3. Format the Date safely
  const getJoinedDate = () => {
    if (!profileData?.joined_at) return 'Recently';
    // If it's a Firebase Timestamp, convert it to a readable date string
    if (profileData.joined_at.toDate) {
      return profileData.joined_at.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return 'Recently';
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0F766E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      
      {/* Header */}
      <View className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark">
        <Text className="text-xl font-bold text-text-primary dark:text-text-darkPrimary">
          My Profile
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* User Info Card */}
        <View className="m-5 p-6 bg-surface-cardLight dark:bg-surface-cardDark rounded-3xl border border-slate-200 dark:border-slate-800 items-center shadow-sm">
          <View className="w-24 h-24 bg-brand-primary/10 rounded-full items-center justify-center mb-4 border-4 border-surface-light dark:border-surface-dark shadow-sm">
            <Ionicons name="person" size={40} color="#0F766E" />
          </View>
          
          <Text className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary mb-1">
            {profileData?.full_name || 'ReShuk User'}
          </Text>
          <Text className="text-text-muted dark:text-text-darkMuted mb-4">
            {auth.currentUser?.email}
          </Text>

          <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">
            <Ionicons name="calendar-outline" size={16} color="#94A3B8" className="mr-2" />
            <Text className="text-text-muted dark:text-text-darkMuted font-medium text-sm">
              Joined {getJoinedDate()}
            </Text>
          </View>
        </View>

        {/* Menu Options */}
        <View className="px-5 space-y-3 mt-2">
          
          <TouchableOpacity className="flex-row items-center justify-between bg-surface-cardLight dark:bg-surface-cardDark p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-brand-primary/10 rounded-full items-center justify-center mr-4">
                <Ionicons name="pricetag-outline" size={20} color="#0F766E" />
              </View>
              <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-base">My Listings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between bg-surface-cardLight dark:bg-surface-cardDark p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-orange-500/10 rounded-full items-center justify-center mr-4">
                <Ionicons name="heart-outline" size={20} color="#F97316" />
              </View>
              <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-base">Saved Items</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between bg-surface-cardLight dark:bg-surface-cardDark p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-500/10 rounded-full items-center justify-center mr-4">
                <Ionicons name="settings-outline" size={20} color="#3B82F6" />
              </View>
              <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-base">Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

        </View>

        {/* Sign Out Button */}
        <TouchableOpacity 
          onPress={handleSignOut}
          className="mx-5 mt-8 p-4 rounded-2xl items-center flex-row justify-center border-2 border-red-500/20 bg-red-500/10"
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" className="mr-2" />
          <Text className="text-red-500 font-bold text-lg">Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}