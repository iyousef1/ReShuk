import { Link, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Screen scrollable>
      <View className="gap-6 px-5 py-10">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-slate-900">Create account</Text>
          <Text className="text-base text-slate-500">Start buying and selling on ReShuk.</Text>
        </View>

        <View className="gap-4">
          <Input label="Full name" value={name} onChangeText={setName} placeholder="Yousef Salman" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry />
          <Button title="Create account" onPress={() => router.replace("/(tabs)/home")} />
        </View>

        <Link href="/(auth)/login" asChild>
          <Text className="text-center text-sm text-slate-600">
            Already have an account? <Text className="font-semibold text-slate-900">Login</Text>
          </Text>
        </Link>
      </View>
    </Screen>
  );
}