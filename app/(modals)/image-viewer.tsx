import { Image, Text, View } from "react-native";

import { Screen } from "@/src/components/layout/Screen";

export default function ImageViewerModal() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center bg-black px-5 py-10">
        <Image
          source={{ uri: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200" }}
          className="h-80 w-full rounded-3xl"
          resizeMode="cover"
        />
        <Text className="mt-4 text-sm text-white/80">Image preview placeholder</Text>
      </View>
    </Screen>
  );
}