import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        
        {/* We make the entire Auth flow slide up from the bottom */}
        <Stack.Screen 
          name="(auth)" 
          options={{ 
            presentation: "modal", 
            animation: "slide_from_bottom" 
          }} 
        />
        
        <Stack.Screen
          name="(modals)"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
      </Stack>
    </>
  );
}