import React from 'react';
import { Text, View } from 'react-native';

interface ChatBubbleProps {
  message: string;
  isOwnMessage: boolean;
  timestamp?: string;
}

export default function ChatBubble({ message, isOwnMessage, timestamp }: ChatBubbleProps) {
  return (
    <View 
      className={`w-full px-4 py-1 flex-row ${
        isOwnMessage ? 'justify-end' : 'justify-start'
      }`}
    >
      <View 
        className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
          isOwnMessage 
            ? 'bg-brand-primary rounded-br-sm' 
            : 'bg-surface-cardLight dark:bg-surface-cardDark border border-slate-100 dark:border-slate-800 rounded-bl-sm'
        }`}
      >
        <Text 
          className={`text-base ${
            isOwnMessage 
              ? 'text-white' 
              : 'text-text-primary dark:text-text-darkPrimary'
          }`}
        >
          {message}
        </Text>
        
        {/* Optional Timestamp */}
        {timestamp && (
          <Text 
            className={`text-[10px] mt-1 text-right ${
              isOwnMessage 
                ? 'text-brand-primary-light/80 text-white/70' 
                : 'text-text-muted dark:text-text-darkMuted'
            }`}
          >
            {timestamp}
          </Text>
        )}
      </View>
    </View>
  );
}