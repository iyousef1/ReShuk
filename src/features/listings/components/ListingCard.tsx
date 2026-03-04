import { Link } from "expo-router";
import { Image, Text, View } from "react-native";

import { Card } from "@/src/components/ui/Card";
import { Listing } from "@/src/types/listing";

type Props = {
  listing: Listing;
};

export function ListingCard({ listing }: Props) {
  return (
    <Link href={`/(tabs)/home/${listing.id}` as const} asChild>
      <Card className="overflow-hidden p-0">
        <Image source={{ uri: listing.image }} className="h-44 w-full" resizeMode="cover" />
        <View className="gap-1 p-4">
          <Text className="text-lg font-semibold text-slate-900">{listing.title}</Text>
          <Text className="text-base font-bold text-emerald-700">₪{listing.price}</Text>
          <Text className="text-sm text-slate-500">{listing.location} • {listing.category}</Text>
        </View>
      </Card>
    </Link>
  );
}