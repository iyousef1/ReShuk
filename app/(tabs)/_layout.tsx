import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router"; // <-- Added useRouter here
import { Platform, useColorScheme, View } from "react-native";

// <-- Import Firebase Auth
import { auth } from "../../src/lib/firebase";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter(); // <-- Initialize the router

  // Helper function to check auth before allowing tab navigation
  const requireAuth = (e: any) => {
    if (!auth.currentUser) {
      e.preventDefault(); // Stop them from going to the tab
      router.push('/(auth)/login'); // Slide up the login modal!
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F766E", 
        tabBarInactiveTintColor: "#94A3B8", 
        tabBarStyle: {
          backgroundColor: isDark ? "#111827" : "#FFFFFF", 
          borderTopColor: isDark ? "#1F2937" : "#F1F5F9", 
          height: Platform.OS === "ios" ? 85 : 65,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
        }
      }}
    >
      {/* PUBLIC TABS */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="search/index"
        options={{
          title: "Search", 
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
        }}
      />
      
      {/* PROTECTED TABS: Notice the listeners property added below */}
      
      <Tabs.Screen
        name="sell"
        listeners={{ tabPress: requireAuth }} // <-- Intercepts the tap!
        options={{
          title: "", 
          tabBarIcon: () => (
            <View
              className="w-14 h-14 rounded-full items-center justify-center bg-action-cta"
              style={{
                backgroundColor: "#0F766E",
                marginTop: Platform.OS === "ios" ? -2 : -5, 
                shadowColor: "#0F766E",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 5,
                elevation: 0, 
              }}
            >
              <Ionicons name="add" size={32} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="inbox"
        listeners={{ tabPress: requireAuth }} // <-- Intercepts the tap!
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbox-ellipses" : "chatbox-ellipses-outline"} size={24} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        listeners={{ tabPress: requireAuth }} // <-- Intercepts the tap!
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}