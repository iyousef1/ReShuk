import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Category = { id: string; name: string; emoji: string };
type Listing = {
  id: string;
  title: string;
  price: number;
  location: string;
  condition: "New" | "Like New" | "Good" | "Fair";
  imageUrl: string;
};

const CATEGORIES: Category[] = [
  { id: "c1", name: "Electronics", emoji: "📱" },
  { id: "c2", name: "Cars", emoji: "🚗" },
  { id: "c3", name: "Home", emoji: "🏠" },
  { id: "c4", name: "Fashion", emoji: "👕" },
  { id: "c5", name: "Gaming", emoji: "🎮" },
  { id: "c6", name: "Bikes", emoji: "🚲" },
  { id: "c7", name: "Books", emoji: "📚" },
  { id: "c8", name: "Sports", emoji: "🏋️" },
];

const MOCK_LISTINGS: Listing[] = [
  {
    id: "l1",
    title: "iPhone 13 Pro 256GB",
    price: 2100,
    location: "Jerusalem",
    condition: "Good",
    imageUrl:
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=60",
  },
  {
    id: "l2",
    title: "Gaming Chair - Like New",
    price: 450,
    location: "Tel Aviv",
    condition: "Like New",
    imageUrl:
      "https://images.unsplash.com/photo-1616627981821-5c6a35c9d0dc?auto=format&fit=crop&w=800&q=60",
  },
  {
    id: "l3",
    title: "Samsung 4K TV 55”",
    price: 1200,
    location: "Be’er Sheva",
    condition: "Good",
    imageUrl:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=60",
  },
  {
    id: "l4",
    title: "Nike Air Max (Size 44)",
    price: 200,
    location: "Haifa",
    condition: "Fair",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=60",
  },
  {
    id: "l5",
    title: "Desk + Office Chair Set",
    price: 350,
    location: "Jerusalem",
    condition: "Good",
    imageUrl:
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=60",
  },
];

function formatILS(price: number) {
  return `₪${price.toLocaleString("en-US")}`;
}

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_LISTINGS.filter((l) => {
      const matchesQuery =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q);
      // category filtering is mocked here; in real app you’ll filter by listing.categoryId
      const matchesCategory = !selectedCategory || true;
      return matchesQuery && matchesCategory;
    });
  }, [query, selectedCategory]);

  const featured = filtered.slice(0, 3);
  const latest = filtered.slice(0, 10);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ReShuk</Text>
            <Text style={styles.subtitle}>Find deals near you</Text>
          </View>

          <Pressable
            style={styles.sellButton}
            onPress={() => router.push("/sell")}
          >
            <Text style={styles.sellButtonText}>+ Sell</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search items, brands, locations…"
            placeholderTextColor="#7b8794"
            style={styles.search}
            returnKeyType="search"
          />
        </View>

        {/* Quick chips */}
        <View style={styles.chipsRow}>
          <Chip
            label="Near me"
            onPress={() => setQuery("Jerusalem")}
            active={query.toLowerCase() === "jerusalem"}
          />
          <Chip
            label="Under ₪300"
            onPress={() => setQuery("")}
            active={false}
          />
          <Chip
            label="Like New"
            onPress={() => setQuery("like new")}
            active={query.toLowerCase() === "like new"}
          />
        </View>

        {/* Categories */}
        <SectionTitle title="Categories" actionText="See all" onAction={() => router.push("/categories")} />
        <View style={styles.categoriesGrid}>
          {CATEGORIES.slice(0, 8).map((c) => (
            <Pressable
              key={c.id}
              style={[
                styles.categoryCard,
                selectedCategory === c.id && styles.categoryCardActive,
              ]}
              onPress={() =>
                setSelectedCategory((prev) => (prev === c.id ? null : c.id))
              }
            >
              <Text style={styles.categoryEmoji}>{c.emoji}</Text>
              <Text style={styles.categoryName}>{c.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* Featured */}
        <SectionTitle title="Featured" actionText="View more" onAction={() => router.push("/feed")} />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={featured}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingVertical: 6 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.featureCard}
              onPress={() => router.push(`/listing/${item.id}`)}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.featureImg} />
              <View style={styles.featureMeta}>
                <Text style={styles.featureTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.featurePrice}>{formatILS(item.price)}</Text>
                <Text style={styles.featureSub}>
                  {item.location} • {item.condition}
                </Text>
              </View>
            </Pressable>
          )}
        />

        {/* Latest deals */}
        <SectionTitle title="Latest deals" actionText="Refresh" onAction={() => { /* hook to fetch */ }} />
        <View style={{ gap: 10 }}>
          {latest.map((item) => (
            <Pressable
              key={item.id}
              style={styles.rowCard}
              onPress={() => router.push(`/listing/${item.id}`)}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.rowImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowSub}>
                  {item.location} • {item.condition}
                </Text>
              </View>
              <Text style={styles.rowPrice}>{formatILS(item.price)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  onPress,
  active,
}: {
  label: string;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({
  title,
  actionText,
  onAction,
}: {
  title: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!actionText && !!onAction && (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={styles.sectionAction}>{actionText}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1220" },
  container: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  brand: { fontSize: 28, fontWeight: "800", color: "#ffffff" },
  subtitle: { marginTop: 2, color: "#b7c1d1" },

  sellButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  sellButtonText: { color: "#0b1220", fontWeight: "800" },

  searchWrap: {
    backgroundColor: "#121c2f",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1f2a40",
  },
  search: { color: "#ffffff", fontSize: 15 },

  chipsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#25334f",
    backgroundColor: "#121c2f",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  chipText: { color: "#c9d3e3", fontWeight: "700" },
  chipTextActive: { color: "#0b1220" },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  sectionAction: { color: "#b7c1d1", fontWeight: "700" },

  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryCard: {
    width: "48%",
    backgroundColor: "#121c2f",
    borderColor: "#1f2a40",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryCardActive: {
    borderColor: "#ffffff",
  },
  categoryEmoji: { fontSize: 20 },
  categoryName: { color: "#ffffff", fontWeight: "800" },

  featureCard: {
    width: 240,
    backgroundColor: "#121c2f",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2a40",
    overflow: "hidden",
  },
  featureImg: { width: "100%", height: 120 },
  featureMeta: { padding: 12 },
  featureTitle: { color: "#ffffff", fontWeight: "800", marginBottom: 6 },
  featurePrice: { color: "#ffffff", fontWeight: "900", fontSize: 16 },
  featureSub: { color: "#b7c1d1", marginTop: 4 },

  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#121c2f",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2a40",
    padding: 12,
  },
  rowImg: { width: 56, height: 56, borderRadius: 12 },
  rowTitle: { color: "#ffffff", fontWeight: "800" },
  rowSub: { color: "#b7c1d1", marginTop: 4 },
  rowPrice: { color: "#ffffff", fontWeight: "900" },
});
