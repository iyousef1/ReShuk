import { View } from "react-native";

import { EmptyState } from "@/src/components/feedback/EmptyState";
import { Loading } from "@/src/components/feedback/Loading";
import { useListings } from "../hooks";
import { ListingCard } from "./ListingCard";

export function ListingGrid() {
  const { listings, loading } = useListings();

  if (loading) return <Loading label="Loading listings..." />;
  if (!listings.length) return <EmptyState title="No listings found" description="Try again later." />;

  return (
    <View className="gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </View>
  );
}