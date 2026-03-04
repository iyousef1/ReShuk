import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Card } from "@/src/components/ui/Card";

export default function SettingsScreen() {
  return (
    <Screen>
      <View className="gap-4 px-5 py-5">
        <Text className="text-3xl font-bold text-slate-900">Settings</Text>
        <Card>
          <Text className="text-slate-600">Theme, notifications, privacy, account.</Text>
        </Card>
      </View>
    </Screen>
  );
}