// Listing AI Info — extra facts the AI can use when answering buyers
// about a specific listing. Opened from My Listings with ?listingId=...

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getListingAiInfo, updateListingAiInfo } from '../../../src/features/ai-seller/api';
import { DEFAULT_LISTING_AI_INFO, ListingAiInfo } from '../../../src/features/ai-seller/types';

function Field({ label, value, onChange, placeholder, multiline, keyboardType }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        style={{
          backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
          fontSize: 15, color: '#0F172A',
          ...(multiline ? { minHeight: 80, textAlignVertical: 'top' as const } : {}),
        }}
      />
    </View>
  );
}

function Section({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginTop: 8, marginBottom: 12 }}>
      {title}
    </Text>
  );
}

export default function ListingAiInfoScreen() {
  const router = useRouter();
  const { listingId, listingTitle } = useLocalSearchParams<{ listingId: string; listingTitle?: string }>();

  const [info, setInfo] = useState<ListingAiInfo>({ ...DEFAULT_LISTING_AI_INFO });
  // string mirrors for list & number fields so typing feels natural
  const [defects, setDefects] = useState('');
  const [included, setIncluded] = useState('');
  const [missing, setMissing] = useState('');
  const [pickup, setPickup] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [prefPrice, setPrefPrice] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!listingId) { setLoading(false); return; }
    getListingAiInfo(listingId)
      .then((data) => {
        setInfo(data);
        setDefects(data.defects.join(', '));
        setIncluded(data.includedItems.join(', '));
        setMissing(data.missingItems.join(', '));
        setPickup(data.pickupAreas.join(', '));
        setMinPrice(data.minimumPrice != null ? String(data.minimumPrice) : '');
        setPrefPrice(data.preferredPrice != null ? String(data.preferredPrice) : '');
        setDeliveryFee(data.deliveryFee != null ? String(data.deliveryFee) : '');
      })
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [listingId]);

  const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const toNum = (s: string) => (s.trim() === '' ? null : Number(s.trim()));

  const handleSave = async () => {
    const min = toNum(minPrice);
    const pref = toNum(prefPrice);
    const fee = toNum(deliveryFee);
    if ([min, pref, fee].some((n) => n != null && (isNaN(n) || n < 0))) {
      Alert.alert('Invalid price', 'Prices must be positive numbers.');
      return;
    }
    if (min != null && pref != null && pref < min) {
      Alert.alert('Invalid prices', 'Preferred price cannot be below the minimum price.');
      return;
    }

    setSaving(true);
    try {
      await updateListingAiInfo(listingId!, {
        ...info,
        defects: splitList(defects),
        includedItems: splitList(included),
        missingItems: splitList(missing),
        pickupAreas: splitList(pickup),
        minimumPrice: min,
        preferredPrice: pref,
        deliveryFee: fee,
      });
      Alert.alert('Saved', 'AI info updated for this listing.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0F766E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>Listing AI Info</Text>
            <Text style={{ fontSize: 12, color: '#94A3B8' }} numberOfLines={1}>
              {listingTitle ?? 'Extra facts for the AI assistant'}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Section title="Condition" />
          <Field label="Condition details" value={info.condition} onChange={(v) => setInfo((i) => ({ ...i, condition: v }))} placeholder="e.g. Used 1 year, battery health 92%" multiline />
          <Field label="Defects (comma-separated)" value={defects} onChange={setDefects} placeholder="small scratch on back, worn corner" />

          <Section title="What's Included" />
          <Field label="Included items" value={included} onChange={setIncluded} placeholder="original box, charger, case" />
          <Field label="Missing items" value={missing} onChange={setMissing} placeholder="earphones, receipt" />
          <Field label="Warranty" value={info.warranty} onChange={(v) => setInfo((i) => ({ ...i, warranty: v }))} placeholder="e.g. 6 months Apple warranty left" />
          <Field label="Reason for selling" value={info.reasonForSelling} onChange={(v) => setInfo((i) => ({ ...i, reasonForSelling: v }))} placeholder="e.g. upgraded to a newer model" />

          <Section title="Price Rules" />
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 16,
            borderWidth: 1, borderColor: '#F1F5F9',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>Price is negotiable</Text>
            <Switch value={info.negotiable} onValueChange={(v) => setInfo((i) => ({ ...i, negotiable: v }))} trackColor={{ true: '#0F766E' }} thumbColor="#FFFFFF" />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Minimum price (private)" value={minPrice} onChange={setMinPrice} placeholder="0" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Preferred price" value={prefPrice} onChange={setPrefPrice} placeholder="0" keyboardType="numeric" />
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: -8, marginBottom: 16 }}>
            The AI will never offer below your minimum and never reveals it to buyers.
          </Text>

          <Section title="Pickup & Delivery" />
          <Field label="Pickup areas" value={pickup} onChange={setPickup} placeholder="Tel Aviv center, Florentin" />
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 16,
            borderWidth: 1, borderColor: '#F1F5F9',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>Delivery available</Text>
            <Switch value={info.deliveryAvailable} onValueChange={(v) => setInfo((i) => ({ ...i, deliveryAvailable: v }))} trackColor={{ true: '#0F766E' }} thumbColor="#FFFFFF" />
          </View>
          {info.deliveryAvailable && (
            <Field label="Delivery fee" value={deliveryFee} onChange={setDeliveryFee} placeholder="0" keyboardType="numeric" />
          )}

          <Section title="Extra Notes" />
          <Field label="Anything else the AI should know" value={info.extraNotes} onChange={(v) => setInfo((i) => ({ ...i, extraNotes: v }))} placeholder="e.g. pet-free home, non-smoker" multiline />

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: '#0F766E', borderRadius: 14,
              paddingVertical: 15, alignItems: 'center', marginTop: 12,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Save AI Info</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
