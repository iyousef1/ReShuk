import { ChatMessage } from "@/src/types/chat";

export async function getMessages(chatId: string): Promise<ChatMessage[]> {
  return Promise.resolve([
    { id: "1", chatId, senderId: "seller", text: "Hi, is this still available?", createdAt: new Date().toISOString() },
    { id: "2", chatId, senderId: "me", text: "Yes, it is.", createdAt: new Date().toISOString() },
  ]);
}