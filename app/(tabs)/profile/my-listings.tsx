import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { ListingGrid } from "@/src/features/listings/components/ListingGrid";

export default function MyListingsScreen() {
  return (
    <Screen scrollable>
      <View className="gap-5 px-5 py-5">
        <Text className="text-3xl font-bold text-slate-900">My listings</Text>
        <ListingGrid />
      </View>
    </Screen>
  );
}