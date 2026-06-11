// AI Seller Assistant — Firestore data layer
//
// Collections:
//   seller_ai_settings/{uid}        seller-level AI settings
//   listings/{id}.ai_info           AI info map field on the listing doc
//   seller_qa/{autoId}              custom Q&A (seller-wide or listing-specific)
//   ai_reply_logs/{autoId}          log of every AI reply generation
//
// All writes verify the current user owns the resource before touching Firestore.
// Mirror these checks in Firestore security rules:
//   match /seller_ai_settings/{uid}  { allow read, write: if request.auth.uid == uid; }
//   match /seller_qa/{id}            { allow read, write: if request.auth.uid == resource.data.sellerId; }
//   match /ai_reply_logs/{id}        { allow create: if request.auth.uid == request.resource.data.sellerId;
//                                      allow read: if request.auth.uid == resource.data.sellerId; }

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import {
  AiReplyLog,
  CustomQA,
  DEFAULT_AI_SETTINGS,
  DEFAULT_LISTING_AI_INFO,
  ListingAiInfo,
  SellerAiSettings,
} from './types';

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Must be logged in');
  return uid;
}

// ---------- Seller AI Settings ----------

export async function getSellerAiSettings(sellerId?: string): Promise<SellerAiSettings> {
  const uid = sellerId ?? requireUid();
  const snap = await getDoc(doc(db, 'seller_ai_settings', uid));
  if (!snap.exists()) return { ...DEFAULT_AI_SETTINGS };
  return { ...DEFAULT_AI_SETTINGS, ...snap.data() } as SellerAiSettings;
}

export async function updateSellerAiSettings(settings: Partial<SellerAiSettings>): Promise<void> {
  const uid = requireUid();
  await setDoc(
    doc(db, 'seller_ai_settings', uid),
    { ...settings, updated_at: serverTimestamp() },
    { merge: true }
  );
}

// ---------- Listing AI Info ----------

export async function getListingAiInfo(listingId: string): Promise<ListingAiInfo> {
  const snap = await getDoc(doc(db, 'listings', listingId));
  if (!snap.exists()) throw new Error('Listing not found');
  return { ...DEFAULT_LISTING_AI_INFO, ...(snap.data().ai_info ?? {}) } as ListingAiInfo;
}

export async function updateListingAiInfo(listingId: string, info: Partial<ListingAiInfo>): Promise<void> {
  const uid = requireUid();
  const snap = await getDoc(doc(db, 'listings', listingId));
  if (!snap.exists()) throw new Error('Listing not found');
  if (snap.data().seller_id !== uid) throw new Error('Only the seller can edit AI info for this listing');

  const merged = { ...DEFAULT_LISTING_AI_INFO, ...(snap.data().ai_info ?? {}), ...info };
  await updateDoc(doc(db, 'listings', listingId), { ai_info: merged });
}

// ---------- Custom Q&A ----------

export async function getSellerQAs(sellerId?: string): Promise<CustomQA[]> {
  const uid = sellerId ?? requireUid();
  const snap = await getDocs(
    query(collection(db, 'seller_qa'), where('sellerId', '==', uid), where('scope', '==', 'seller'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomQA));
}

export async function getListingQAs(listingId: string, sellerId?: string): Promise<CustomQA[]> {
  const uid = sellerId ?? requireUid();
  const snap = await getDocs(
    query(collection(db, 'seller_qa'), where('sellerId', '==', uid), where('listingId', '==', listingId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomQA));
}

export async function createQA(
  qa: Pick<CustomQA, 'question' | 'answer' | 'scope' | 'autoReplyAllowed' | 'enabled'> & { listingId?: string | null }
): Promise<string> {
  const uid = requireUid();
  if (!qa.question.trim() || !qa.answer.trim()) throw new Error('Question and answer are required');
  if (qa.scope === 'listing' && !qa.listingId) throw new Error('listingId is required for listing-scoped Q&A');

  const ref = await addDoc(collection(db, 'seller_qa'), {
    sellerId: uid,
    question: qa.question.trim(),
    answer: qa.answer.trim(),
    scope: qa.scope,
    listingId: qa.scope === 'listing' ? qa.listingId : null,
    autoReplyAllowed: qa.autoReplyAllowed,
    enabled: qa.enabled,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateQA(
  qaId: string,
  updates: Partial<Pick<CustomQA, 'question' | 'answer' | 'autoReplyAllowed' | 'enabled'>>
): Promise<void> {
  const uid = requireUid();
  const snap = await getDoc(doc(db, 'seller_qa', qaId));
  if (!snap.exists()) throw new Error('Q&A not found');
  if (snap.data().sellerId !== uid) throw new Error('Only the owner can edit this Q&A');

  await updateDoc(doc(db, 'seller_qa', qaId), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteQA(qaId: string): Promise<void> {
  const uid = requireUid();
  const snap = await getDoc(doc(db, 'seller_qa', qaId));
  if (!snap.exists()) return;
  if (snap.data().sellerId !== uid) throw new Error('Only the owner can delete this Q&A');

  await deleteDoc(doc(db, 'seller_qa', qaId));
}

// ---------- AI Reply Logs ----------

export async function logAiReply(log: Omit<AiReplyLog, 'createdAt'>): Promise<void> {
  try {
    await addDoc(collection(db, 'ai_reply_logs'), { ...log, createdAt: serverTimestamp() });
  } catch (e) {
    // logging must never break the reply flow
    console.error('Failed to write AI reply log:', e);
  }
}

// ---------- Conversation context ----------

export async function getRecentMessages(
  chatId: string,
  count = 12
): Promise<{ senderId: string; text: string }[]> {
  const snap = await getDocs(
    query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'desc'), fbLimit(count))
  );
  return snap.docs
    .map((d) => d.data())
    .filter((m: any) => (m.type ?? 'text') === 'text' && typeof m.text === 'string')
    .map((m: any) => ({ senderId: m.senderId, text: m.text }))
    .reverse(); // oldest first
}
