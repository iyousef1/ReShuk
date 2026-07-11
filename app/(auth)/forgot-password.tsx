import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";

import { sendPasswordResetEmail } from "firebase/auth";

import { Screen } from "@/src/components/layout/Screen";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { auth } from "@/src/lib/firebase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Reset link sent", "If an account exists for that email, a reset link has been sent.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <Screen>
      <View className="flex-1 justify-center gap-6 px-5 py-10">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-slate-900">Reset password</Text>
          <Text className="text-base text-slate-500">We&apos;ll send a reset link to your email.</Text>
        </View>

        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />

        <Button title="Send reset link" onPress={handleSendResetLink} />
      </View>
    </Screen>
  );
}
