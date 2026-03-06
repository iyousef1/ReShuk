import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function SellLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#F8FAFC' }, // Adjust for your light/dark mode
        headerTintColor: '#0F766E', // Brand Primary
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="close" size={24} color="#0F766E" />
          </TouchableOpacity>
        )
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Post an Item',
          headerLeft: () => null // Hide the back button on the first screen
        }} 
      />
      <Stack.Screen 
        name="category" 
        options={{ 
          title: 'Choose Category',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="chevron-back" size={24} color="#0F766E" />
            </TouchableOpacity>
          )
        }} 
      />
      <Stack.Screen 
        name="details" 
        options={{ 
          title: 'Item Details',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="chevron-back" size={24} color="#0F766E" />
            </TouchableOpacity>
          )
        }} 
      />
    </Stack>
  );
}