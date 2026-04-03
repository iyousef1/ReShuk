// src/features/chat/api.ts
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
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

// Get all messages for a chat, ordered by time
export const getMessages = async (chatId: string) => {
  const q = query(
    collection(db, `chats/${chatId}/messages`),
    orderBy('createdAt', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    chatId,
    senderId: doc.data().senderId,
    text: doc.data().text,
    createdAt: doc.data().createdAt?.toDate().toISOString() ?? new Date().toISOString(),
  }));
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

// Send a meet-up request with the requester's location
export const sendMeetRequest = async (
  chatId: string,
  location: { lat: number; lng: number }
) => {
  if (!auth.currentUser) throw new Error("Must be logged in");

  await addDoc(collection(db, `chats/${chatId}/messages`), {
    type: 'meet_request',
    text: '📍 Meet Up Request',
    senderId: auth.currentUser.uid,
    location,
    resolved: false,
    createdAt: serverTimestamp(),
  });
};

// Save AI meeting suggestions as a message visible to both users
export const saveMeetSuggestions = async (
  chatId: string,
  meetRequestId: string,
  suggestions: { name: string; type: string; address: string; reason: string }[]
) => {
  if (!auth.currentUser) throw new Error("Must be logged in");

  // Mark the original request as resolved
  const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
  const { db: firestoreDb } = await import('../../lib/firebase');
  await updateDoc(
    firestoreDoc(firestoreDb, `chats/${chatId}/messages/${meetRequestId}`),
    { resolved: true }
  );

  // Post the suggestions as a new message
  await addDoc(collection(db, `chats/${chatId}/messages`), {
    type: 'meet_suggestions',
    text: 'AI Meeting Suggestions',
    senderId: auth.currentUser.uid,
    suggestions,
    createdAt: serverTimestamp(),
  });
};