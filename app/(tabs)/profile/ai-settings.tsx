import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSellerAiSettings, updateSellerAiSettings } from '../../../src/features/ai-seller/api';
import { AiMode, AiTone, DEFAULT_AI_SETTINGS, SellerAiSettings } from '../../../src/features/ai-seller/types';

const MODES: { value: AiMode; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'No AI suggestions or replies' },
  { value: 'draft_only', label: 'Draft only', description: 'AI drafts replies — you approve every one' },
  { value: 'auto_safe', label: 'Auto (safe)', description: 'AI auto-sends only low-risk factual answers' },
];

const TONES: { value: AiTone; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'friendly_short', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
];

function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 10, paddingHorizontal: 20 }}>
      {title}
    </Text>
  );
}

function SwitchRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9',
    }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' }}>{label}</Text>
        {hint && <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{hint}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#0F766E' }} thumbColor="#FFFFFF" />
    </View>
  );
}

// Comma-separated list editor for string[] fields
function ListInput({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState(value.join(', '));
  useEffect(() => setText(value.join(', ')), [value]);
  return (
    <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => onChange(text.split(',').map((s) => s.trim()).filter(Boolean))}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={{
          backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#0F172A',
        }}
      />
    </View>
  );
}

export default function AiSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<SellerAiSettings>({ ...DEFAULT_AI_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSellerAiSettings()
      .then(setSettings)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof SellerAiSettings>(key: K, value: SellerAiSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSellerAiSettings(settings);
      Alert.alert('Saved', 'Your AI assistant settings have been updated.');
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
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginLeft: 12 }}>AI Assistant</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Master toggle */}
        <View style={{ marginHorizontal: 20, marginTop: 8, backgroundColor: '#0F766E', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>AI Seller Assistant</Text>
            <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 1 }}>
              Drafts replies to buyers from your listing data
            </Text>
          </View>
          <Switch
            value={settings.aiEnabled}
            onValueChange={(v) => set('aiEnabled', v)}
            trackColor={{ true: '#134E4A', false: 'rgba(255,255,255,0.3)' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* AI Mode */}
        <SectionTitle title="AI Mode" />
        <View style={{ marginHorizontal: 20, gap: 8 }}>
          {MODES.map((m) => {
            const active = settings.mode === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                onPress={() => set('mode', m.value)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
                  borderWidth: 1.5, borderColor: active ? '#0F766E' : '#E2E8F0',
                }}
              >
                <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? '#0F766E' : '#CBD5E1'} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: '#0F172A' }}>{m.label}</Text>
                  <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{m.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tone & Language */}
        <SectionTitle title="Tone & Language" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 8 }}>
          {TONES.map((t) => {
            const active = settings.tone === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => set('tone', t.value)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50,
                  backgroundColor: active ? '#0F766E' : '#FFFFFF',
                  borderWidth: 1.5, borderColor: active ? '#0F766E' : '#E2E8F0',
                }}
              >
                <Text style={{ fontWeight: '600', fontSize: 13, color: active ? '#FFFFFF' : '#475569' }}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ borderRadius: 14, overflow: 'hidden', marginHorizontal: 20 }}>
          <SwitchRow
            label="Reply in buyer's language"
            hint="Otherwise always replies in English"
            value={settings.replyInBuyerLanguage}
            onChange={(v) => set('replyInBuyerLanguage', v)}
          />
        </View>

        {/* Contact Sharing */}
        <SectionTitle title="Contact Sharing" />
        <View style={{ borderRadius: 14, overflow: 'hidden', marginHorizontal: 20 }}>
          <SwitchRow label="Allow phone number sharing" value={settings.allowPhoneSharing} onChange={(v) => set('allowPhoneSharing', v)} />
          <SwitchRow label="Allow WhatsApp sharing" value={settings.allowWhatsAppSharing} onChange={(v) => set('allowWhatsAppSharing', v)} />
        </View>

        {/* Payment */}
        <SectionTitle title="Payment" />
        <View style={{ borderRadius: 14, overflow: 'hidden', marginHorizontal: 20 }}>
          <ListInput
            label="Accepted payment methods"
            value={settings.acceptedPaymentMethods}
            onChange={(v) => set('acceptedPaymentMethods', v)}
            placeholder="Cash, Bit, Bank transfer"
          />
          <SwitchRow
            label="Block off-platform payment"
            hint="Flags buyers pushing for wires, gift cards, crypto…"
            value={settings.blockOffPlatformPayment}
            onChange={(v) => set('blockOffPlatformPayment', v)}
          />
        </View>

        {/* Meetup & Delivery */}
        <SectionTitle title="Meetup & Delivery" />
        <View style={{ borderRadius: 14, overflow: 'hidden', marginHorizontal: 20 }}>
          <ListInput
            label="Preferred meetup areas"
            value={settings.preferredMeetupAreas}
            onChange={(v) => set('preferredMeetupAreas', v)}
            placeholder="Tel Aviv center, Dizengoff Mall"
          />
          <SwitchRow label="Public places only" value={settings.publicMeetupOnly} onChange={(v) => set('publicMeetupOnly', v)} />
          <SwitchRow label="Delivery available" value={settings.deliveryAvailable} onChange={(v) => set('deliveryAvailable', v)} />
          {settings.deliveryAvailable && (
            <ListInput
              label="Delivery areas"
              value={settings.deliveryAreas}
              onChange={(v) => set('deliveryAreas', v)}
              placeholder="Tel Aviv, Ramat Gan"
            />
          )}
        </View>

        {/* Negotiation */}
        <SectionTitle title="Price Negotiation" />
        <View style={{ borderRadius: 14, overflow: 'hidden', marginHorizontal: 20 }}>
          <SwitchRow
            label="Let AI negotiate on my behalf"
            hint="AI will counter-offer within your min/preferred price range set per listing. Requires minimum price to be set."
            value={settings.allowAiNegotiation}
            onChange={(v) => set('allowAiNegotiation', v)}
          />
          <SwitchRow
            label="Let AI finalize deals"
            hint="AI can confirm a sale when the buyer agrees to your price."
            value={settings.allowAiDealFinalization}
            onChange={(v) => {
              if (!v) { set('allowAiDealFinalization', false); return; }
              Alert.alert(
                'Allow AI to finalize deals?',
                'When enabled, the AI may confirm a completed sale on your behalf when a buyer agrees to your price — without waiting for your review.\n\nThis means:\n• "Great, it\'s yours!" could be sent automatically\n• You are committing to the sale the moment the buyer agrees\n• You will still need to arrange the meetup separately\n\nOnly enable this if you check your messages frequently and are comfortable with the AI making final commitments for you.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Enable', style: 'default', onPress: () => set('allowAiDealFinalization', true) },
                ]
              );
            }}
          />
        </View>

        {/* Safety */}
        <SectionTitle title="Safety" />
        <View style={{ borderRadius: 14, overflow: 'hidden', marginHorizontal: 20 }}>
          <SwitchRow
            label="Flag suspicious messages"
            hint="Warns you about scam patterns and links"
            value={settings.flagSuspiciousMessages}
            onChange={(v) => set('flagSuspiciousMessages', v)}
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            marginHorizontal: 20, marginTop: 28,
            backgroundColor: '#0F766E', borderRadius: 14,
            paddingVertical: 15, alignItems: 'center',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
