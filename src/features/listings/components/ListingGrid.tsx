import React from 'react';
import { FlatList, Text, View } from 'react-native';
// Make sure this is a named import (with brackets) matching the export above
import { ListingCard } from './ListingCard';

export type Listing = {
  id: string;
  title: string;
  price: number;
  image: string;
  location: string;
  category: string;
};

type ListingGridProps = {
  listings: Listing[];
  onListingPress: (id: string) => void;
};

export function ListingGrid({ listings, onListingPress }: ListingGridProps) {
  
  if (!listings || listings.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-10">
        <Text className="text-text-muted dark:text-text-darkMuted text-lg">
          No listings found.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={listings}
      keyExtractor={(item) => item.id}
      numColumns={2} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }} 
      columnWrapperStyle={{ justifyContent: 'space-between', gap: 12 }}
      renderItem={({ item }) => (
        <View style={{ width: '48%' }}>
          <ListingCard
            title={item.title}
            price={`₪${item.price.toLocaleString()}`} // Formatting the number to a currency string
            imageUrl={item.image} // Mapping your 'image' field to 'imageUrl'
            location={item.location}
            onPress={() => onListingPress(item.id)}
          />
        </View>
      )}
    />
  );
}