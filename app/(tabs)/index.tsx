import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type Category = {
  id: string;
  name: string;
  emoji: string;
  color: string;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  location: string;
  condition: "New" | "Like New" | "Good" | "Fair";
  imageUrl: string;
};

const CATEGORIES: Category[] = [
  { id: "c1", name: "Electronics", emoji: "📱", color: "#2563eb" },
  { id: "c2", name: "Cars", emoji: "🚗", color: "#f59e0b" },
  { id: "c3", name: "Home", emoji: "🏠", color: "#10b981" },
  { id: "c4", name: "Fashion", emoji: "👕", color: "#ec4899" },
  { id: "c5", name: "Gaming", emoji: "🎮", color: "#8b5cf6" },
  { id: "c6", name: "Bikes", emoji: "🚲", color: "#14b8a6" },
  { id: "c7", name: "Books", emoji: "📚", color: "#f97316" },
  { id: "c8", name: "Sports", emoji: "🏋️", color: "#ef4444" },
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

function getConditionStyle(condition: Listing["condition"]) {
  switch (condition) {
    case "New":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20";
    case "Like New":
      return "bg-sky-500/15 text-sky-300 border border-sky-400/20";
    case "Good":
      return "bg-amber-500/15 text-amber-300 border border-amber-400/20";
    case "Fair":
    default:
      return "bg-rose-500/15 text-rose-300 border border-rose-400/20";
  }
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
        l.location.toLowerCase().includes(q) ||
        l.condition.toLowerCase().includes(q);

      const matchesCategory = !selectedCategory || true;

      return matchesQuery && matchesCategory;
    });
  }, [query, selectedCategory]);

  const featured = filtered.slice(0, 3);
  const latest = filtered.slice(0, 10);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
        className="flex-1"
      >
        <View className="px-5 pt-4">
          <Header />

          <View className="mt-5 rounded-[28px] border border-white/10 bg-slate-900 px-4 py-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-3xl font-extrabold tracking-tight text-white">
                  Discover better second-hand deals
                </Text>
                <Text className="mt-2 text-sm leading-5 text-slate-400">
                  Buy smarter, sell faster, and explore trusted listings near
                  you.
                </Text>
              </View>

              <Pressable
                onPress={() => router.push("/sell")}
                className="rounded-2xl bg-white px-4 py-3"
              >
                <Text className="font-bold text-slate-950">+ Sell</Text>
              </Pressable>
            </View>

            <View className="mt-5 flex-row items-center rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3">
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search items, brands, locations..."
                placeholderTextColor="#64748b"
                returnKeyType="search"
                className="ml-3 flex-1 text-[15px] text-white"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={20} color="#64748b" />
                </Pressable>
              )}
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              <FilterPill
                label="Near me"
                active={query.toLowerCase() === "jerusalem"}
                onPress={() => setQuery("Jerusalem")}
                icon="location-outline"
              />
              <FilterPill
                label="Like New"
                active={query.toLowerCase() === "like new"}
                onPress={() => setQuery("Like New")}
                icon="sparkles-outline"
              />
              <FilterPill
                label="Clear"
                active={false}
                onPress={() => {
                  setQuery("");
                  setSelectedCategory(null);
                }}
                icon="refresh-outline"
              />
            </View>
          </View>

          <SectionHeader
            title="Browse categories"
            actionText="See all"
            onAction={() => router.push("/categories")}
          />

          <View className="flex-row flex-wrap justify-between">
            {CATEGORIES.slice(0, 8).map((category) => {
              const active = selectedCategory === category.id;

              return (
                <Pressable
                  key={category.id}
                  onPress={() =>
                    setSelectedCategory((prev) =>
                      prev === category.id ? null : category.id
                    )
                  }
                  className={`mb-3 w-[48.5%] rounded-3xl border px-4 py-4 ${
                    active
                      ? "border-sky-400 bg-slate-900"
                      : "border-white/10 bg-slate-900/70"
                  }`}
                >
                  <View
                    className="mb-3 h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${category.color}22` }}
                  >
                    <Text className="text-xl">{category.emoji}</Text>
                  </View>

                  <Text className="text-base font-bold text-white">
                    {category.name}
                  </Text>
                  <Text className="mt-1 text-xs text-slate-400">
                    Explore listings
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <SectionHeader
            title="Featured picks"
            actionText="View more"
            onAction={() => router.push("/feed")}
          />

          <FlatList
            horizontal
            data={featured}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 8 }}
            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/listing/[id]",
                    params: { id: item.id },
                  })
                }
                className="w-[280px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-900"
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  className="h-40 w-full"
                  resizeMode="cover"
                />

                <View className="p-4">
                  <View className="mb-3 flex-row items-center justify-between">
                    <View
                      className={`rounded-full px-3 py-1 ${getConditionStyle(
                        item.condition
                      )}`}
                    >
                      <Text className="text-[11px] font-semibold">
                        {item.condition}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#94a3b8"
                      />
                      <Text className="ml-1 text-xs text-slate-400">
                        {item.location}
                      </Text>
                    </View>
                  </View>

                  <Text
                    numberOfLines={1}
                    className="text-lg font-extrabold text-white"
                  >
                    {item.title}
                  </Text>

                  <Text className="mt-2 text-2xl font-black text-white">
                    {formatILS(item.price)}
                  </Text>

                  <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-sm text-slate-400">
                      Verified seller
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="mr-1 text-sm font-semibold text-sky-300">
                        View
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color="#7dd3fc"
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            )}
          />

          <SectionHeader
            title="Latest deals"
            actionText="Refresh"
            onAction={() => {}}
          />

          <View className="gap-3">
            {latest.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: "/listing/[id]",
                    params: { id: item.id },
                  })
                }
                className="flex-row items-center rounded-[24px] border border-white/10 bg-slate-900/80 p-3"
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  className="h-[72px] w-[72px] rounded-2xl"
                  resizeMode="cover"
                />

                <View className="ml-3 flex-1">
                  <View className="flex-row items-start justify-between">
                    <Text
                      numberOfLines={1}
                      className="mr-2 flex-1 text-[15px] font-bold text-white"
                    >
                      {item.title}
                    </Text>

                    <Text className="text-[15px] font-extrabold text-white">
                      {formatILS(item.price)}
                    </Text>
                  </View>

                  <View className="mt-2 flex-row items-center">
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#94a3b8"
                    />
                    <Text className="ml-1 text-sm text-slate-400">
                      {item.location}
                    </Text>

                    <Text className="mx-2 text-slate-600">•</Text>

                    <Text
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getConditionStyle(
                        item.condition
                      )}`}
                    >
                      {item.condition}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View className="flex-row items-center justify-between">
      <View>
        <Text className="text-[30px] font-black tracking-tight text-white">
          ReShuk
        </Text>
        <Text className="mt-1 text-sm text-slate-400">
          Find quality deals nearby
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900">
          <Ionicons name="notifications-outline" size={20} color="#fff" />
        </Pressable>

        <Pressable className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900">
          <Ionicons name="person-outline" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function FilterPill({
  label,
  onPress,
  active,
  icon,
}: {
  label: string;
  onPress: () => void;
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center rounded-full px-4 py-2.5 ${
        active
          ? "bg-sky-400/20 border border-sky-300/30"
          : "bg-slate-800 border border-white/10"
      }`}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? "#7dd3fc" : "#94a3b8"}
      />
      <Text
        className={`ml-2 text-sm font-semibold ${
          active ? "text-sky-200" : "text-slate-300"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  actionText,
  onAction,
}: {
  title: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-4 mt-7 flex-row items-center justify-between">
      <Text className="text-xl font-extrabold tracking-tight text-white">
        {title}
      </Text>

      {actionText && onAction ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text className="text-sm font-semibold text-sky-300">
            {actionText}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}