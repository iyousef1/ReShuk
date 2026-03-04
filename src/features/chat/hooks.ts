import { useEffect, useState } from "react";

import { ChatMessage } from "@/src/types/chat";
import { getMessages } from "./api";

export function useChat(chatId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    getMessages(chatId).then(setMessages);
  }, [chatId]);

  return { messages };
}