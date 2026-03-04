import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

export default function ReportUserModal() {
  const [reason, setReason] = useState("");

  return (
    <Screen>
      <View className="gap-5 px-5 py-6">
        <Text className="text-2xl font-bold text-slate-900">Report user</Text>
        <Input
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="Explain the problem"
          multiline
          numberOfLines={5}
        />
        <Button title="Submit report" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}