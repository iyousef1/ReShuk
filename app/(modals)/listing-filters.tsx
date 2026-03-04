import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

export default function ListingFiltersModal() {
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [category, setCategory] = useState("");

  return (
    <Screen>
      <View className="gap-5 px-5 py-6">
        <Text className="text-2xl font-bold text-slate-900">Filters</Text>
        <Input label="Category" value={category} onChangeText={setCategory} placeholder="Phones, furniture, etc." />
        <Input label="Min price" value={minPrice} onChangeText={setMinPrice} placeholder="0" keyboardType="numeric" />
        <Input label="Max price" value={maxPrice} onChangeText={setMaxPrice} placeholder="5000" keyboardType="numeric" />
        <Button title="Apply filters" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}