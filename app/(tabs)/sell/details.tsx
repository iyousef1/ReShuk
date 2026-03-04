import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

export default function SellDetailsScreen() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Screen scrollable>
      <View className="gap-4 px-5 py-5">
        <Text className="text-3xl font-bold text-slate-900">Listing details</Text>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="iPhone 14 Pro 256GB" />
        <Input label="Price" value={price} onChangeText={setPrice} placeholder="1200" keyboardType="numeric" />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="Condition, accessories, pickup area..." multiline numberOfLines={5} />
        <Button title="Publish listing" onPress={() => router.replace("/(tabs)/profile/my-listings")} />
      </View>
    </Screen>
  );
}