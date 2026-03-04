import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { ListingCard } from "@/src/features/listings/components/ListingCard";
import { useListings } from "@/src/features/listings/hooks";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const { listings } = useListings();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
  }, [query, listings]);

  return (
    <Screen scrollable>
      <View className="gap-5 px-5 py-5">
        <Text className="text-3xl font-bold text-slate-900">Search</Text>
        <Input value={query} onChangeText={setQuery} placeholder="Search for phones, chairs, laptops..." />
        <Button title="Open filters" variant="secondary" onPress={() => router.push("/(modals)/listing-filters")} />

        <View className="gap-4">
          {filtered.map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </View>
      </View>
    </Screen>
  );
}