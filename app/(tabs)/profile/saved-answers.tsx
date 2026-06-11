// Saved Answers (custom Q&A) screen.
// Without params → seller-wide Q&A. With ?listingId=...&listingTitle=... →
// listing-specific Q&A for that listing.

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createQA, deleteQA, getListingQAs, getSellerQAs, updateQA } from '../../../src/features/ai-seller/api';
import { CustomQA } from '../../../src/features/ai-seller/types';

export default function SavedAnswersScreen() {
  const router = useRouter();
  const { listingId, listingTitle } = useLocalSearchParams<{ listingId?: string; listingTitle?: string }>();
  const isListingScope = !!listingId;

  const [qas, setQAs] = useState<CustomQA[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit form state
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<CustomQA | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [autoReplyAllowed, setAutoReplyAllowed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = isListingScope ? await getListingQAs(listingId!) : await getSellerQAs();
      setQAs(data.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [isListingScope, listingId]);

  useEffect(() => { load(); }, [load]);

  const openForm = (qa?: CustomQA) => {
    setEditing(qa ?? null);
    setQuestion(qa?.question ?? '');
    setAnswer(qa?.answer ?? '');
    setAutoReplyAllowed(qa?.autoReplyAllowed ?? false);
    setFormVisible(true);
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert('Missing info', 'Both a question and an answer are required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateQA(editing.id, { question: question.trim(), answer: answer.trim(), autoReplyAllowed });
      } else {
        await createQA({
          question: question.trim(),
          answer: answer.trim(),
          scope: isListingScope ? 'listing' : 'seller',
          listingId: isListingScope ? listingId : null,
          autoReplyAllowed,
          enabled: true,
        });
      }
      setFormVisible(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (qa: CustomQA) => {
    Alert.alert('Delete Q&A', `Delete "${qa.question}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteQA(qa.id); await load(); } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const toggleEnabled = async (qa: CustomQA) => {
    setQAs((prev) => prev.map((q) => (q.id === qa.id ? { ...q, enabled: !qa.enabled } : q)));
    try { await updateQA(qa.id, { enabled: !qa.enabled }); } catch { load(); }
  };

  const renderItem = ({ item }: { item: CustomQA }) => (
    <View style={{
      marginHorizontal: 20, marginBottom: 10,
      backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: '#F1F5F9',
      opacity: item.enabled ? 1 : 0.55,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 14, color: '#0F172A', marginBottom: 4 }}>{item.question}</Text>
          <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 18 }}>{item.answer}</Text>
        </View>
        <Switch
          value={item.enabled}
          onValueChange={() => toggleEnabled(item)}
          trackColor={{ true: '#0F766E' }}
          thumbColor="#FFFFFF"
          style={{ transform: [{ scale: 0.8 }], marginLeft: 4 }}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        {item.autoReplyAllowed && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#CCFBF1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Ionicons name="flash" size={10} color="#0F766E" />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#0F766E' }}>Auto-send allowed</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => openForm(item)} style={{ padding: 6 }}>
          <Ionicons name="pencil" size={16} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 6 }}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>Saved Answers</Text>
          {isListingScope && (
            <Text style={{ fontSize: 12, color: '#94A3B8' }} numberOfLines={1}>
              For: {listingTitle ?? 'this listing'}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => openForm()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0F766E', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 12, color: '#94A3B8', paddingHorizontal: 20, marginBottom: 14, lineHeight: 17 }}>
        {isListingScope
          ? 'Answers the AI can use only for this listing. They take priority over your general answers.'
          : 'Answers the AI can use across all your listings, e.g. "Can I test it before buying?"'}
      </Text>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <FlatList
          data={qas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 40 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Ionicons name="chatbubble-ellipses" size={28} color="#0F766E" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>No saved answers yet</Text>
              <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 }}>
                Add answers to common buyer questions so the AI can reply for you.
              </Text>
            </View>
          }
        />
      )}

      {/* Add/Edit modal */}
      <Modal visible={formVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFormVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }}>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <Text style={{ color: '#64748B', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                {editing ? 'Edit Answer' : 'New Answer'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#0F766E" />
                ) : (
                  <Text style={{ color: '#0F766E', fontWeight: '700', fontSize: 15 }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Buyer question</Text>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="e.g. Can I test it before buying?"
                placeholderTextColor="#94A3B8"
                style={{
                  backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 15, color: '#0F172A', marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Your answer</Text>
              <TextInput
                value={answer}
                onChangeText={setAnswer}
                placeholder="e.g. Sure, you can test it when we meet."
                placeholderTextColor="#94A3B8"
                multiline
                style={{
                  backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 15, color: '#0F172A', minHeight: 90, textAlignVertical: 'top', marginBottom: 16,
                }}
              />

              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: '#F1F5F9',
              }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>Allow AI to auto-send this answer</Text>
                  <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    Only applies in Auto (safe) mode for low-risk questions
                  </Text>
                </View>
                <Switch value={autoReplyAllowed} onValueChange={setAutoReplyAllowed} trackColor={{ true: '#0F766E' }} thumbColor="#FFFFFF" />
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
