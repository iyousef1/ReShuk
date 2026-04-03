import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { saveMeetSuggestions, sendMeetRequest, sendMessage } from '../../../src/features/chat/api';
import ChatBubble from '../../../src/features/chat/components/ChatBubble';
import MeetRequestCard from '../../../src/features/chat/components/MeetRequestCard';
import MeetSuggestionsCard from '../../../src/features/chat/components/MeetSuggestionsCard';
import { getMeetingSuggestions } from '../../../src/lib/places';

import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

type ChatMessage = {
  id: string;
  type?: 'text' | 'meet_request' | 'meet_suggestions';
  text: string;
  senderId: string;
  createdAt: Date;
  location?: { lat: number; lng: number };
  resolved?: boolean;
  suggestions?: { name: string; type: string; address: string; reason: string }[];
};

export default function ChatRoomScreen() {
  const { chatId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUserName, setOtherUserName] = useState('');
  const [loadingMeet, setLoadingMeet] = useState(false);
  // Track which meet request cards are currently loading suggestions
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Fetch other user's name
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!chatId || !auth.currentUser) return;
      const chatSnap = await getDoc(doc(db, 'chats', chatId as string));
      if (!chatSnap.exists()) return;
      const { buyerId, sellerId } = chatSnap.data();
      const otherId = auth.currentUser.uid === buyerId ? sellerId : buyerId;
      const profileSnap = await getDoc(doc(db, 'profiles', otherId));
      if (profileSnap.exists()) setOtherUserName(profileSnap.data().full_name ?? '');
    };
    fetchOtherUser();
  }, [chatId]);

  // Real-time message listener
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: ChatMessage[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type ?? 'text',
          text: data.text,
          senderId: data.senderId,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          location: data.location,
          resolved: data.resolved,
          suggestions: data.suggestions,
        };
      });
      setMessages(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || !chatId) return;

    setIsSending(true);
    setInputText('');

    try {
      await sendMessage(chatId as string, textToSend);
    } catch {
      Alert.alert("Error", "Could not send message.");
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleMeetUp = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location access is needed to suggest meeting spots.');
      return;
    }

    setLoadingMeet(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await sendMeetRequest(chatId as string, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setLoadingMeet(false);
    }
  };

  const handleShareLocation = async (meetRequestMsg: ChatMessage) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location access is needed to suggest meeting spots.');
      return;
    }

    setResolvingId(meetRequestMsg.id);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const myLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const theirLocation = meetRequestMsg.location!;

      const suggestions = await getMeetingSuggestions(theirLocation, myLocation);
      await saveMeetSuggestions(chatId as string, meetRequestMsg.id, suggestions);
    } catch (e: any) {
      console.error('Meet suggestion error:', e?.message ?? e);
      Alert.alert('Error', e?.message ?? 'Could not generate meeting suggestions. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.senderId === auth.currentUser?.uid;

    if (item.type === 'meet_request') {
      return (
        <MeetRequestCard
          senderName={otherUserName || 'The other user'}
          isOwnMessage={isOwn}
          onShareLocation={() => handleShareLocation(item)}
          isLoading={resolvingId === item.id}
          resolved={item.resolved ?? false}
        />
      );
    }

    if (item.type === 'meet_suggestions') {
      return <MeetSuggestionsCard suggestions={item.suggestions ?? []} />;
    }

    return (
      <ChatBubble
        message={item.text}
        isOwnMessage={isOwn}
        timestamp={formatTime(item.createdAt)}
      />
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      className="bg-surface-light dark:bg-surface-dark"
    >
      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderMessage}
      />

      {/* Input Bar */}
      <View
        className="px-4 py-3 bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 flex-row items-end"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {/* Meet Up Button */}
        <TouchableOpacity
          onPress={handleMeetUp}
          disabled={loadingMeet}
          className="w-12 h-12 rounded-full bg-brand-primary/10 items-center justify-center mr-2"
        >
          {loadingMeet ? (
            <ActivityIndicator size="small" color="#0F766E" />
          ) : (
            <Ionicons name="location-outline" size={22} color="#0F766E" />
          )}
        </TouchableOpacity>

        <View className="flex-1 bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-3xl flex-row items-center px-4 min-h-[48px] max-h-32">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            multiline
            className="flex-1 text-text-primary dark:text-text-darkPrimary text-base py-3 max-h-24"
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          className={`ml-3 w-12 h-12 rounded-full items-center justify-center ${
            inputText.trim() ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-slate-800'
          }`}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#FFFFFF' : '#94A3B8'}
              style={{ marginLeft: 4 }}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
