import { Pressable, Text } from "react-native";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
};

export function Button({ title, onPress, variant = "primary" }: Props) {
  const styles =
    variant === "primary"
      ? "bg-emerald-600 active:bg-emerald-700"
      : "bg-slate-200 active:bg-slate-300";

  const textStyles = variant === "primary" ? "text-white" : "text-slate-900";

  return (
    <Pressable onPress={onPress} className={`items-center rounded-2xl px-4 py-4 ${styles}`}>
      <Text className={`text-base font-semibold ${textStyles}`}>{title}</Text>
    </Pressable>
  );
}