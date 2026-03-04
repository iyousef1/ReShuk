import { Link } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Card } from "@/src/components/ui/Card";

const chats = [
  { id: "1", name: "Ahmad", preview: "Is the item still available?" },
  { id: "2", name: "Lina", preview: "Can you do ₪900?" },
];

export default function InboxScreen() {
  return (
    <Screen scrollable>
      <View className="gap-4 px-5 py-5">
        <Text className="text-3xl font-bold text-slate-900">Inbox</Text>
        {chats.map((chat) => (
          <Link key={chat.id} href={`/(tabs)/inbox/${chat.id}` as const} asChild>
            <Card>
              <Text className="text-base font-semibold text-slate-900">{chat.name}</Text>
              <Text className="mt-1 text-sm text-slate-500">{chat.preview}</Text>
            </Card>
          </Link>
        ))}
      </View>
    </Screen>
  );
}