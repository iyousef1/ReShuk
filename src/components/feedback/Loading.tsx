import { ActivityIndicator, Text, View } from "react-native";

type Props = {
  label?: string;
};

export function Loading({ label = "Loading..." }: Props) {
  return (
    <View className="items-center justify-center gap-3 rounded-3xl bg-white p-8">
      <ActivityIndicator />
      <Text className="text-sm text-slate-500">{label}</Text>
    </View>
  );
}