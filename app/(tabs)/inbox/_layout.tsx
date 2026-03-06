// app/(tabs)/inbox/_layout.tsx
import { Stack } from 'expo-router';

export default function InboxLayout() {
  return (
    <Stack>
      {/* The main list of all conversations */}
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Messages',
          headerLargeTitle: false,
          headerShadowVisible: false
        }} 
      />
      
      {/* The actual chat room with a specific user */}
      <Stack.Screen 
        name="[chatId]" 
        options={{ 
          title: 'Chat',
          // We can dynamically update this title later to be the user's name
        }} 
      />
    </Stack>
  );
}