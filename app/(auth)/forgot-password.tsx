import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");

  return (
    <Screen>
      <View className="flex-1 justify-center gap-6 px-5 py-10">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-slate-900">Reset password</Text>
          <Text className="text-base text-slate-500">We&apos;ll send a reset link to your email.</Text>
        </View>

        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />

        <Button title="Send reset link" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}