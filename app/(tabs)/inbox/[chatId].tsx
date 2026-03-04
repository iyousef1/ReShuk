import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Card } from "@/src/components/ui/Card";

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();

  return (
    <Screen scrollable>
      <View className="gap-4 px-5 py-5">
        <Text className="text-3xl font-bold text-slate-900">Chat #{chatId}</Text>

        <Card className="self-start bg-slate-100">
          <Text className="text-slate-800">Hi, is this still available?</Text>
        </Card>

        <Card className="self-end bg-emerald-600">
          <Text className="text-white">Yes, it is.</Text>
        </Card>
      </View>
    </Screen>
  );
}