import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AiReplyResult } from '../types';

const INTENT_LABELS: Record<string, string> = {
  availability_question: 'Availability',
  price_question: 'Price question',
  price_negotiation: 'Negotiation',
  product_detail_question: 'Product details',
  meetup_question: 'Meetup',
  delivery_question: 'Delivery',
  payment_question: 'Payment',
  contact_request: 'Contact request',
  suspicious_message: 'Suspicious',
  other: 'Other',
};

type Props = {
  result: AiReplyResult;
  regenerating: boolean;
  onSend: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  onDismiss: () => void;
};

export default function AiSuggestionCard({ result, regenerating, onSend, onEdit, onRegenerate, onDismiss }: Props) {
  // Risk flagged — warning card, no send action
  if (result.action === 'flag_risk') {
    return (
      <View style={{
        marginHorizontal: 16, marginBottom: 8, borderRadius: 14,
        backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FECACA', padding: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="warning" size={18} color="#DC2626" />
          <Text style={{ marginLeft: 6, fontWeight: '800', fontSize: 13, color: '#DC2626' }}>
            Suspicious message flagged
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 18 }}>{result.reason}</Text>
        <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 6 }}>
          The AI will not reply to this message. Review it carefully before responding.
        </Text>
      </View>
    );
  }

  // Missing info — AI needs the seller
  if (result.action === 'ask_seller') {
    return (
      <View style={{
        marginHorizontal: 16, marginBottom: 8, borderRadius: 14,
        backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A', padding: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="help-circle" size={18} color="#D97706" />
          <Text style={{ marginLeft: 6, fontWeight: '800', fontSize: 13, color: '#B45309' }}>
            AI needs your confirmation
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 13, color: '#78350F', lineHeight: 18 }}>
          {result.reason || 'Information is missing — the AI could not answer from your listing data.'}
        </Text>
        {!!result.reply && (
          <>
            <Text style={{ fontSize: 13, color: '#0F172A', marginTop: 8, lineHeight: 19 }}>{result.reply}</Text>
            <TouchableOpacity onPress={onEdit} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <Text style={{ color: '#0F766E', fontWeight: '700', fontSize: 13 }}>Edit & send manually</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  // Normal draft suggestion
  return (
    <View style={{
      marginHorizontal: 16, marginBottom: 8, borderRadius: 14,
      backgroundColor: '#F0FDFA', borderWidth: 1.5, borderColor: '#99F6E4', padding: 14,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name="sparkles" size={16} color="#0F766E" />
        <Text style={{ marginLeft: 6, fontWeight: '800', fontSize: 13, color: '#0F766E' }}>AI suggestion</Text>
        <View style={{
          marginLeft: 8, backgroundColor: '#CCFBF1', borderRadius: 8,
          paddingHorizontal: 7, paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#0F766E' }}>
            {INTENT_LABELS[result.intent] ?? result.intent}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 14, color: '#0F172A', lineHeight: 20 }}>{result.reply}</Text>

      {!!result.reason && (
        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 6 }} numberOfLines={2}>
          {result.reason}
        </Text>
      )}

      <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
        <TouchableOpacity
          onPress={onSend}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: '#0F766E', borderRadius: 50,
            paddingHorizontal: 16, paddingVertical: 8,
          }}
        >
          <Ionicons name="send" size={13} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onEdit}
          style={{
            borderWidth: 1.5, borderColor: '#0F766E', borderRadius: 50,
            paddingHorizontal: 14, paddingVertical: 8,
          }}
        >
          <Text style={{ color: '#0F766E', fontWeight: '700', fontSize: 13 }}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRegenerate}
          disabled={regenerating}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 50,
            paddingHorizontal: 14, paddingVertical: 8,
          }}
        >
          {regenerating ? (
            <ActivityIndicator size="small" color="#0F766E" />
          ) : (
            <Ionicons name="refresh" size={13} color="#64748B" />
          )}
          <Text style={{ color: '#64748B', fontWeight: '600', fontSize: 13 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
