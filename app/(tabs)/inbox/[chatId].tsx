import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
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

import { getSellerAiSettings } from '../../../src/features/ai-seller/api';
import AiSuggestionCard from '../../../src/features/ai-seller/components/AiSuggestionCard';
import { generateSellerReply } from '../../../src/features/ai-seller/service';
import { AiReplyResult, SellerAiSettings } from '../../../src/features/ai-seller/types';

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
  suggestions?: any[];
};

type ChatMeta = { buyerId: string; sellerId: string; listingId: string };

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

  // --- AI Seller Assistant state ---
  const [chatMeta, setChatMeta] = useState<ChatMeta | null>(null);
  const [aiSettings, setAiSettings] = useState<SellerAiSettings | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AiReplyResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  // Buyer message IDs already handled by auto_safe mode (prevents duplicate auto-replies)
  const autoHandledIds = useRef<Set<string>>(new Set());

  const isSeller = !!chatMeta && chatMeta.sellerId === auth.currentUser?.uid;
  const aiActive = isSeller && !!aiSettings?.aiEnabled && aiSettings.mode !== 'off';

  // Fetch chat meta + other user's name + seller AI settings
  useEffect(() => {
    const fetchChatContext = async () => {
      if (!chatId || !auth.currentUser) return;
      const chatSnap = await getDoc(doc(db, 'chats', chatId as string));
      if (!chatSnap.exists()) return;
      const { buyerId, sellerId, listingId } = chatSnap.data();
      setChatMeta({ buyerId, sellerId, listingId });

      const otherId = auth.currentUser.uid === buyerId ? sellerId : buyerId;
      const profileSnap = await getDoc(doc(db, 'profiles', otherId));
      if (profileSnap.exists()) setOtherUserName(profileSnap.data().full_name ?? '');

      // Only the seller needs AI settings; buyers never see the assistant
      if (sellerId === auth.currentUser.uid) {
        try {
          setAiSettings(await getSellerAiSettings());
        } catch (e) {
          console.error('Failed to load AI settings:', e);
        }
      }
    };
    fetchChatContext();
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

  // Latest message, if it's a plain text message from the buyer
  const latestBuyerMessage =
    chatMeta && messages.length > 0 &&
    (messages[0].type ?? 'text') === 'text' &&
    messages[0].senderId === chatMeta.buyerId
      ? messages[0]
      : null;

  const runAiSuggest = async (buyerMsg: ChatMessage): Promise<AiReplyResult | null> => {
    if (!chatMeta) return null;
    setAiLoading(true);
    try {
      const result = await generateSellerReply({
        conversationId: chatId as string,
        listingId: chatMeta.listingId,
        buyerMessage: buyerMsg.text,
      });
      return result;
    } catch (e: any) {
      Alert.alert('AI Error', e.message ?? 'Could not generate a suggestion.');
      return null;
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!latestBuyerMessage) return;
    setAiSuggestion(null);
    const result = await runAiSuggest(latestBuyerMessage);
    if (result) setAiSuggestion(result);
  };

  // auto_safe mode: when a new buyer message arrives while the seller has the
  // chat open, generate a reply and auto-send it if (and only if) the safety
  // validator approved it. Otherwise surface it as a draft suggestion.
  // NOTE: without a backend this only runs while the seller has the chat open.
  useEffect(() => {
    if (!aiActive || aiSettings?.mode !== 'auto_safe' || !latestBuyerMessage) return;
    if (autoHandledIds.current.has(latestBuyerMessage.id)) return;
    autoHandledIds.current.add(latestBuyerMessage.id);

    (async () => {
      const result = await runAiSuggest(latestBuyerMessage);
      if (!result) return;
      if (result.shouldAutoSend && result.reply) {
        try {
          await sendMessage(chatId as string, result.reply);
        } catch {
          setAiSuggestion(result); // fall back to a draft if the send fails
        }
      } else {
        setAiSuggestion(result);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestBuyerMessage?.id, aiActive]);

  const handleAiSend = async () => {
    if (!aiSuggestion?.reply) return;
    try {
      await sendMessage(chatId as string, aiSuggestion.reply);
      setAiSuggestion(null);
    } catch {
      Alert.alert('Error', 'Could not send message.');
    }
  };

  const handleAiEdit = () => {
    if (!aiSuggestion?.reply) return;
    setInputText(aiSuggestion.reply);
    setAiSuggestion(null);
  };

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

      {/* AI suggestion card */}
      {aiSuggestion && (
        <AiSuggestionCard
          result={aiSuggestion}
          regenerating={aiLoading}
          onSend={handleAiSend}
          onEdit={handleAiEdit}
          onRegenerate={handleAiSuggest}
          onDismiss={() => setAiSuggestion(null)}
        />
      )}

      {/* AI Suggest Reply button — seller only, latest message from buyer */}
      {aiActive && latestBuyerMessage && !aiSuggestion && (
        <TouchableOpacity
          onPress={handleAiSuggest}
          disabled={aiLoading}
          style={{
            flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
            marginHorizontal: 16, marginBottom: 8, gap: 6,
            backgroundColor: '#F0FDFA', borderWidth: 1.5, borderColor: '#99F6E4',
            borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8,
          }}
        >
          {aiLoading ? (
            <ActivityIndicator size="small" color="#0F766E" />
          ) : (
            <Ionicons name="sparkles" size={14} color="#0F766E" />
          )}
          <Text style={{ color: '#0F766E', fontWeight: '700', fontSize: 13 }}>
            {aiLoading ? 'Thinking…' : 'AI Suggest Reply'}
          </Text>
        </TouchableOpacity>
      )}

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
