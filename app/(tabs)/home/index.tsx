import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { ListingGrid } from "@/src/features/listings/components/ListingGrid";

export default function HomeScreen() {
  return (
    <Screen scrollable>
      <View className="gap-6 px-5 py-5">
        <View className="gap-1">
          <Text className="text-3xl font-bold text-slate-900">ReShuk</Text>
          <Text className="text-base text-slate-500">Latest deals near you.</Text>
        </View>

        <ListingGrid />
      </View>
    </Screen>
  );
}