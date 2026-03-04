import { router } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";

export default function SellScreen() {
  return (
    <Screen>
      <View className="gap-5 px-5 py-5">
        <Text className="text-3xl font-bold text-slate-900">Sell an item</Text>
        <Card>
          <Text className="text-base text-slate-600">Start the listing flow by choosing a category.</Text>
        </Card>
        <Button title="Choose category" onPress={() => router.push("/(tabs)/sell/category")} />
      </View>
    </Screen>
  );
}