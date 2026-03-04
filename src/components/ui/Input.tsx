import { Text, TextInput, TextInputProps, View } from "react-native";

type Props = TextInputProps & {
  label?: string;
};

export function Input({ label, multiline, numberOfLines, ...props }: Props) {
  return (
    <View className="gap-2">
      {label ? <Text className="text-sm font-medium text-slate-700">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        numberOfLines={numberOfLines}
        className={`rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 ${
          multiline ? "min-h-28" : ""
        }`}
        {...props}
      />
    </View>
  );
}