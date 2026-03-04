import { Link } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Card } from "@/src/components/ui/Card";

const links = [
  { href: "/(tabs)/profile/my-listings", label: "My listings" },
  { href: "/(tabs)/profile/favorites", label: "Favorites" },
  { href: "/(tabs)/profile/settings", label: "Settings" },
];

export default function ProfileScreen() {
  return (
    <Screen scrollable>
      <View className="gap-4 px-5 py-5">
        <View className="gap-1">
          <Text className="text-3xl font-bold text-slate-900">Yousef</Text>
          <Text className="text-base text-slate-500">Seller rating: 4.9</Text>
        </View>

        {links.map((item) => (
          <Link key={item.label} href={item.href as any} asChild>
            <Card>
              <Text className="text-base font-medium text-slate-900">{item.label}</Text>
            </Card>
          </Link>
        ))}
      </View>
    </Screen>
  );
}