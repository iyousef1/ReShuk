import { router } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";

const categories = ["Phones", "Furniture", "Fashion", "Gaming", "Cars"];

export default function SellCategoryScreen() {
  return (
    <Screen scrollable>
      <View className="gap-4 px-5 py-5">
        <Text className="text-3xl font-bold text-slate-900">Choose category</Text>
        {categories.map((category) => (
          <Card key={category}>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-base font-medium text-slate-900">{category}</Text>
              <Button title="Select" onPress={() => router.push("/(tabs)/sell/details")} />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}