import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { collection, doc, getDoc, onSnapshot, or, query, where } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

type Chat = {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  listingTitle?: string;
  lastMessage: string;
  lastMessageTime: any;
  lastSenderId?: string;
  otherUserName: string;
  unreadCount?: number;
};

const AVATAR_COLORS = ['#0F766E', '#7C3AED', '#DC2626', '#2563EB', '#D97706', '#0891B2'];
const FILTER_TABS = ['All', 'Buying', 'Selling'];

function getAvatarColor(name: string) {
  if (!name) return AVATAR_COLORS[0];
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatTime(ts: any) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function InboxListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      or(where('buyerId', '==', uid), where('sellerId', '==', uid))
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rawChats = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const otherIds = [...new Set(rawChats.map((c: any) =>
        c.buyerId === uid ? c.sellerId : c.buyerId
      ))] as string[];

      const listingIds = [...new Set(rawChats.map((c: any) => c.listingId).filter(Boolean))] as string[];

      const [nameMap, titleMap] = await Promise.all([
        Promise.all(otherIds.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, 'profiles', id));
            return [id, snap.exists() ? (snap.data().full_name ?? 'Unknown') : 'Unknown'] as [string, string];
          } catch { return [id, 'Unknown'] as [string, string]; }
        })).then(Object.fromEntries),
        Promise.all(listingIds.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, 'listings', id));
            return [id, snap.exists() ? (snap.data().title ?? '') : ''] as [string, string];
          } catch { return [id, ''] as [string, string]; }
        })).then(Object.fromEntries),
      ]);

      const enriched: Chat[] = rawChats
        .map((c: any) => ({
          ...c,
          otherUserName: nameMap[c.buyerId === uid ? c.sellerId : c.buyerId] ?? 'Unknown',
          listingTitle: titleMap[c.listingId] ?? '',
        }))
        .sort((a: Chat, b: Chat) =>
          (b.lastMessageTime?.toMillis?.() ?? 0) - (a.lastMessageTime?.toMillis?.() ?? 0)
        );

      setChats(enriched);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to chats:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  const filteredChats = useMemo(() => {
    let result = chats;
    if (activeTab === 'Buying') result = result.filter(c => c.buyerId === uid);
    if (activeTab === 'Selling') result = result.filter(c => c.sellerId === uid);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.otherUserName.toLowerCase().includes(q) ||
        (c.lastMessage ?? '').toLowerCase().includes(q) ||
        (c.listingTitle ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [chats, activeTab, searchQuery, uid]);

  const renderChatRow = ({ item }: { item: Chat }) => {
    const initial = item.otherUserName?.[0]?.toUpperCase() ?? '?';
    const avatarColor = getAvatarColor(item.otherUserName);
    const unread = item.unreadCount ?? 0;
    const isOwnLast = item.lastSenderId === uid;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(tabs)/inbox/${item.id}`)}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 }}
      >
        {/* Avatar with online dot */}
        <View style={{ position: 'relative', marginRight: 13 }}>
          <View style={{
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: avatarColor,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>{initial}</Text>
          </View>
          <View style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 13, height: 13, borderRadius: 7,
            backgroundColor: '#22C55E',
            borderWidth: 2, borderColor: '#F8FAFC',
          }} />
        </View>

        {/* Text content */}
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#0F172A' }} numberOfLines={1}>
              {item.otherUserName}
            </Text>
            {!!item.listingTitle && (
              <View style={{
                backgroundColor: '#CCFBF1', borderRadius: 8,
                paddingHorizontal: 7, paddingVertical: 2, maxWidth: 130,
              }}>
                <Text style={{ color: '#0F766E', fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
                  {item.listingTitle}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 13, color: '#94A3B8', lineHeight: 18 }} numberOfLines={1}>
            {item.lastMessage || 'Tap to start chatting'}
          </Text>
        </View>

        {/* Timestamp + badge */}
        <View style={{ alignItems: 'flex-end', minWidth: 44 }}>
          <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6, fontWeight: '500' }}>
            {formatTime(item.lastMessageTime)}
          </Text>
          {unread > 0 ? (
            <View style={{
              minWidth: 20, height: 20, borderRadius: 10,
              backgroundColor: '#0F766E',
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 4,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>{unread}</Text>
            </View>
          ) : isOwnLast ? (
            <Ionicons name="checkmark-done" size={16} color="#CBD5E1" />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4,
      }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 }}>
          Messages
        </Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <View style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: '#0F766E',
          }}>
            <Ionicons name="person" size={18} color="#0F766E" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, gap: 8 }}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: 18, paddingVertical: 8, borderRadius: 50,
                backgroundColor: isActive ? '#0F766E' : 'transparent',
                borderWidth: 1.5, borderColor: isActive ? '#0F766E' : '#E2E8F0',
              }}
            >
              <Text style={{ fontWeight: '600', fontSize: 13, color: isActive ? '#FFFFFF' : '#64748B' }}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 20, marginBottom: 8,
        backgroundColor: '#F1F5F9', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 11,
      }}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search messages..."
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#0F172A' }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center',
            marginBottom: 18,
          }}>
            <Ionicons name="chatbubbles" size={34} color="#0F766E" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>
            No messages yet
          </Text>
          <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 26 }}>
            When you contact a seller it appears here
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/home')}
            style={{
              borderWidth: 2, borderColor: '#0F766E', borderRadius: 50,
              paddingHorizontal: 26, paddingVertical: 12,
            }}
          >
            <Text style={{ color: '#0F766E', fontWeight: '700', fontSize: 15 }}>Browse Listings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatRow}
          ItemSeparatorComponent={() => (
            <View style={{ marginLeft: 81, height: 0.5, backgroundColor: '#F1F5F9' }} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}
