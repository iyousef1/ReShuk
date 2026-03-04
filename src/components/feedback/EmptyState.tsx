import { Text, View } from "react-native";

type Props = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: Props) {
  return (
    <View className="items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-white p-8">
      <Text className="text-lg font-semibold text-slate-900">{title}</Text>
      {description ? <Text className="text-center text-sm text-slate-500">{description}</Text> : null}
    </View>
  );
}