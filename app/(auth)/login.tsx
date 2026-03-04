import { Link, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Screen scrollable>
      <View className="flex-1 justify-center gap-6 px-5 py-10">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-slate-900">Welcome back</Text>
          <Text className="text-base text-slate-500">Log in to your ReShuk account.</Text>
        </View>

        <View className="gap-4">
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          <Button title="Login" onPress={() => router.replace("/(tabs)/home")} />
        </View>

        <View className="gap-3">
          <Link href="/(auth)/forgot-password" asChild>
            <Text className="text-center text-sm text-emerald-700">Forgot password?</Text>
          </Link>
          <Link href="/(auth)/register" asChild>
            <Text className="text-center text-sm text-slate-600">
              Don&apos;t have an account? <Text className="font-semibold text-slate-900">Register</Text>
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}