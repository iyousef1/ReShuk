import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  senderName: string;
  isOwnMessage: boolean;
  onShareLocation: () => void;
  isLoading: boolean;
  resolved: boolean;
};

export default function MeetRequestCard({
  senderName,
  isOwnMessage,
  onShareLocation,
  isLoading,
  resolved,
}: Props) {
  return (
    <View className={`px-4 py-2 flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <View className="max-w-[80%] bg-surface-cardLight dark:bg-surface-cardDark border border-brand-primary/30 rounded-2xl overflow-hidden">
        <View className="bg-brand-primary/10 px-4 py-3 flex-row items-center">
          <Ionicons name="location" size={18} color="#0F766E" />
          <Text className="ml-2 font-bold text-brand-primary text-sm">Meet Up Request</Text>
        </View>
        <View className="px-4 py-3">
          <Text className="text-text-primary dark:text-text-darkPrimary text-sm mb-3">
            {isOwnMessage
              ? 'You suggested a meet up. Waiting for the other person to share their location...'
              : `${senderName} wants to meet up! Share your location to get AI-suggested meeting spots.`}
          </Text>

          {!isOwnMessage && !resolved && (
            <TouchableOpacity
              onPress={onShareLocation}
              disabled={isLoading}
              className="bg-brand-primary rounded-xl py-2.5 items-center flex-row justify-center"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="navigate" size={16} color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm ml-2">Share My Location</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {resolved && (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={16} color="#65A30D" />
              <Text className="text-green-600 text-xs ml-1 font-semibold">Suggestions generated below</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
