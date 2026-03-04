import { router, useLocalSearchParams } from "expo-router";
import { Image, Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";

export default function ListingDetailsScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();

  return (
    <Screen scrollable>
      <View className="gap-5 px-5 py-5">
        <Image
          source={{ uri: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200" }}
          className="h-72 w-full rounded-3xl"
          resizeMode="cover"
        />

        <View className="gap-2">
          <Text className="text-2xl font-bold text-slate-900">Listing #{listingId}</Text>
          <Text className="text-xl font-semibold text-emerald-700">₪1,200</Text>
          <Text className="text-base leading-6 text-slate-600">
            Starter details page. Replace this with real listing data from Firestore later.
          </Text>
        </View>

        <Button title="Message seller" onPress={() => router.push("/(tabs)/inbox") } />
      </View>
    </Screen>
  );
}