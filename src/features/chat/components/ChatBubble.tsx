import { Text } from "react-native";

import { Card } from "@/src/components/ui/Card";
import { ChatMessage } from "@/src/types/chat";

type Props = {
  message: ChatMessage;
  mine?: boolean;
};

export function ChatBubble({ message, mine = false }: Props) {
  return (
    <Card className={mine ? "self-end bg-emerald-600" : "self-start bg-slate-100"}>
      <Text className={mine ? "text-white" : "text-slate-900"}>{message.text}</Text>
    </Card>
  );
}