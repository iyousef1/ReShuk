// src/features/chat/api.ts
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

// Start a new chat (or find an existing one) between buyer and seller
export const startOrGetChat = async (listingId: string, sellerId: string) => {
  if (!auth.currentUser) throw new Error("Must be logged in to chat");
  const buyerId = auth.currentUser.uid;

  // Check if a chat already exists for this listing between these two users
  const q = query(
    collection(db, 'chats'),
    where('listingId', '==', listingId),
    where('buyerId', '==', buyerId),
    where('sellerId', '==', sellerId)
  );

  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    // Chat exists, return the ID
    return querySnapshot.docs[0].id;
  }

  // No chat exists, create a new one
  const newChatRef = await addDoc(collection(db, 'chats'), {
    listingId,
    buyerId,
    sellerId,
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageTime: serverTimestamp()
  });

  return newChatRef.id;
};

// Send a message within a specific chat
export const sendMessage = async (chatId: string, text: string) => {
  if (!auth.currentUser) throw new Error("Must be logged in");
  
  await addDoc(collection(db, `chats/${chatId}/messages`), {
    text,
    senderId: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
};