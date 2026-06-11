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

import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

const MENU_ITEMS = [
  {
    label: 'My Listings',
    icon: 'pricetag-outline' as const,
    iconColor: '#0F766E',
    iconBg: '#CCFBF1',
    route: '/(tabs)/profile/my-listings' as const,
  },
  {
    label: 'Saved Items',
    icon: 'heart-outline' as const,
    iconColor: '#F97316',
    iconBg: '#FFF7ED',
    route: '/(tabs)/profile/favorites' as const,
  },
  {
    label: 'Settings',
    icon: 'settings-outline' as const,
    iconColor: '#3B82F6',
    iconBg: '#EFF6FF',
    route: null,
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, 'profiles', currentUser.uid));
        if (snap.exists()) setProfileData(snap.data());
      } catch (e) {
        console.error('Error fetching profile:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Error signing out', error.message);
    }
  };

  const getJoinedDate = () => {
    if (!profileData?.joined_at) return 'Recently';
    if (profileData.joined_at.toDate) {
      return profileData.joined_at.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return 'Recently';
  };

  const displayName: string = profileData?.full_name || auth.currentUser?.displayName || 'ReShuk User';
  const initials = displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0F766E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 }}>
          Profile
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* User Info Card */}
        <View style={{
          marginHorizontal: 20, marginTop: 10, marginBottom: 24,
          backgroundColor: '#FFFFFF', borderRadius: 20,
          padding: 24, alignItems: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
          borderWidth: 1, borderColor: '#F1F5F9',
        }}>
          {/* Avatar */}
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: '#0F766E',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
            shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '700' }}>{initials}</Text>
          </View>

          <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 14, color: '#94A3B8', marginBottom: 14 }}>
            {auth.currentUser?.email}
          </Text>

          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#F8FAFC', borderRadius: 50,
            paddingHorizontal: 14, paddingVertical: 7,
            gap: 6,
          }}>
            <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
            <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>
              Joined {getJoinedDate()}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => item.route && router.push(item.route as any)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
                borderWidth: 1, borderColor: '#F1F5F9',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: item.iconBg,
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 14,
                }}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.75}
          style={{
            marginHorizontal: 20, marginTop: 28,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingVertical: 15, borderRadius: 16,
            backgroundColor: '#FFF5F5', borderWidth: 1.5, borderColor: '#FECACA',
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 16 }}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
