import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
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

// Your Architecture Imports
import { sendMessage } from '../../../src/features/chat/api';
import ChatBubble from '../../../src/features/chat/components/ChatBubble';

// Firebase Imports
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';

export default function ChatRoomScreen() {
  const { chatId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // 1. Real-Time Listener for Messages
  useEffect(() => {
    if (!chatId) return;

    // Point exactly to this chat room's "messages" subcollection
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    
    // Order them by time (descending because our FlatList is inverted!)
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    // onSnapshot listens for live updates. Any time a message is sent, this runs instantly.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          senderId: data.senderId,
          // Safely handle Firebase timestamps (they are null for a split second while uploading)
          createdAt: data.createdAt?.toDate() || new Date(), 
        };
      });
      
      setMessages(fetchedMessages);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to messages:", error);
      setLoading(false);
    });

    // Cleanup the listener when the user leaves the screen
    return () => unsubscribe();
  }, [chatId]);

  // 2. Send Message Logic
  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || !chatId) return;
    
    setIsSending(true);
    // Optimistically clear the input so the UI feels fast
    setInputText(''); 

    try {
      await sendMessage(chatId as string, textToSend);
    } catch (error: any) {
      Alert.alert("Error", "Could not send message.");
      console.error(error);
      // Put the text back if it failed
      setInputText(textToSend); 
    } finally {
      setIsSending(false);
    }
  };

  // Helper to format the time for the chat bubble
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      {/* The Chat Feed */}
      <FlatList
        data={messages}
        inverted // Pins items to the bottom, newest first!
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isOwnMessage = item.senderId === auth.currentUser?.uid;
          
          return (
            <ChatBubble 
              message={item.text} 
              isOwnMessage={isOwnMessage} 
              timestamp={formatTime(item.createdAt)} 
            />
          );
        }}
      />

      {/* The Input Bar */}
      <View 
        className="px-4 py-3 bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 flex-row items-end"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
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