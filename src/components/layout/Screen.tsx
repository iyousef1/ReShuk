import { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = PropsWithChildren<{
  scrollable?: boolean;
}>;

export function Screen({ children, scrollable = false }: Props) {
  if (scrollable) {
    return (
      // Replaced bg-slate-50 with our new light and dark surface colors
      <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark">
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }} 
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    // Applied the same background fix here
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark">
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}