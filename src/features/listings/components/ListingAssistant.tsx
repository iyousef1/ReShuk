import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { CATEGORY_CONFIG } from '../categoryConfig';
import CityPicker from '../../../components/ui/CityPicker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-7';
const MAX_PHOTOS = 4;

type Category = string;
type Confidence = 'high' | 'medium' | 'low';

export type ListingResult = {
  title: string;
  category: Category;
  sub_category: string;
  brand: string;
  model: string;
  condition: string;
  condition_details: string;
  price_estimate: { low: number; suggested: number; high: number };
  description: string;
  key_specs: string[];
  confidence: Confidence;
  confidence_reason: string;
  attributes: Record<string, string>;
};

type PickedImage = { uri: string };

async function resizeForApi(uri: string): Promise<{ base64: string; mediaType: string }> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1280 });
  const imageRef = await ctx.renderAsync();
  const result = await imageRef.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  return { base64: result.base64!, mediaType: 'image/jpeg' };
}

type ListingAssistantProps = {
  onPublish?: (listing: ListingResult, imageUris: string[], location: string) => void;
};


const AI_CONDITION_MAP: Record<string, string> = {
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Fair',
};

const SYSTEM_PROMPT = `You are an expert second-hand marketplace listing assistant for an Israeli resale app.
You are given one or more photos of an item a user wants to sell.

Identify the item, assess its physical condition strictly from what is visible in the photos, and estimate a realistic resale price range in Israeli Shekels (ILS) for the used/second-hand market in Israel.

Always call the create_listing tool with your best assessment.

Guidelines:
- Base condition ONLY on visible evidence (scratches, wear, packaging, screen state). Do not assume hidden damage or perfect condition.
- Price for the Israeli second-hand market in ILS. low = quick-sale price, suggested = fair market price, high = optimistic but achievable.
- If the photos are blurry, partial, or the item is ambiguous, set confidence to "low" or "medium" and explain why in confidence_reason. Still provide your best guess.
- key_specs: 2-5 short factual specs you can reasonably infer (e.g. "256GB storage", "Space Gray", "13-inch").
- Keep the title concise and search-friendly. The description must be 2-3 honest, neutral sentences.
- For category, choose one of: Electronics, Fashion, Home, Sports, Toys, Vehicles, Books, Other.
- For sub_category, pick the most specific one for the chosen category:
${CATEGORY_CONFIG.map((c) => `  ${c.name}: ${c.subCategories.map((s) => s.name).join(', ')}`).join('\n')}`;

const LISTING_TOOL = {
  name: 'create_listing',
  description: 'Create a structured marketplace listing from the analyzed item photos.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Concise, search-friendly listing title.' },
      category: {
        type: 'string',
        enum: ['Electronics', 'Fashion', 'Home', 'Sports', 'Toys', 'Vehicles', 'Books', 'Other'],
        description: 'Best matching marketplace category.',
      },
      sub_category: {
        type: 'string',
        description: 'Specific sub-category within the chosen category.',
      },
      brand: { type: 'string' },
      model: { type: 'string' },
      condition: { type: 'string', enum: ['like_new', 'good', 'fair', 'poor'] },
      condition_details: { type: 'string', description: 'One sentence about visible condition.' },
      price_estimate: {
        type: 'object',
        properties: {
          low: { type: 'number' },
          suggested: { type: 'number' },
          high: { type: 'number' },
        },
        required: ['low', 'suggested', 'high'],
      },
      description: { type: 'string', description: '2-3 sentence listing description.' },
      key_specs: { type: 'array', items: { type: 'string' } },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      confidence_reason: { type: 'string' },
    },
    required: [
      'title',
      'category',
      'sub_category',
      'brand',
      'model',
      'condition',
      'condition_details',
      'price_estimate',
      'description',
      'key_specs',
      'confidence',
      'confidence_reason',
    ],
  },
};

function validateRevalueContext(text: string): string | null {
  const t = text.trim();
  if (t.length < 8) return 'Please add a bit more detail (at least 8 characters).';
  if (!/[a-zA-Z0-9]/.test(t)) return 'Context must contain actual words or numbers.';
  return null;
}

async function analyzeImages(
  images: PickedImage[],
  opts?: { additionalContext?: string; current?: ListingResult }
): Promise<ListingResult> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Image analysis is not configured. Please try again later.');
  }

  // Resize all images to ≤1280px before encoding — keeps each well under the 5 MB API limit
  const encoded = await Promise.all(images.map((img) => resizeForApi(img.uri)));

  let userText = 'Analyze the item in these photos and produce a marketplace listing using the create_listing tool. Estimate the price in Israeli Shekels (ILS).';

  if (opts?.current && opts?.additionalContext) {
    const c = opts.current;
    userText =
      `The previous analysis estimated:\n` +
      `• Category: ${c.category}\n` +
      `• Brand/Model: ${c.brand} ${c.model}\n` +
      `• Condition: ${c.condition}\n` +
      `• Price range: ₪${c.price_estimate.low}–₪${c.price_estimate.high} (suggested ₪${c.price_estimate.suggested})\n\n` +
      `The seller has provided additional context to refine the estimate:\n"${opts.additionalContext.trim()}"\n\n` +
      `Re-analyze the photos with this new information and call create_listing with an updated estimate. ` +
      `Adjust the price and details accordingly — if the context contradicts something in the photos, trust the context.`;
  }

  const content = [
    ...encoded.map((img) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType,
        data: img.base64,
      },
    })),
    { type: 'text', text: userText },
  ];

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [LISTING_TOOL],
      tool_choice: { type: 'tool', name: 'create_listing' },
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message ?? JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => '');
    }
    console.error('Anthropic API error:', res.status, detail);
    throw new Error(`Analysis failed (${res.status}): ${detail || 'Please try again.'}`);
  }

  const data = await res.json();
  const toolUse = Array.isArray(data?.content)
    ? data.content.find((b: any) => b.type === 'tool_use')
    : null;

  if (!toolUse?.input?.title) {
    throw new Error("Couldn't identify the item. Try clearer, well-lit photos.");
  }

  const raw = toolUse.input as ListingResult;
  // Normalize AI condition enum to display strings
  raw.condition = AI_CONDITION_MAP[raw.condition] ?? raw.condition;
  if (!raw.attributes) raw.attributes = {};
  return raw;
}

function PriceSlider({
  low,
  high,
  value,
  onChange,
}: {
  low: number;
  high: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const THUMB = 28;
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const clamp = (v: number) => Math.min(high, Math.max(low, v));

  const xToValue = (x: number) => {
    const usable = trackWidthRef.current - THUMB;
    if (usable <= 0 || high <= low) return low;
    const ratio = Math.min(1, Math.max(0, x / usable));
    return clamp(Math.round(low + ratio * (high - low)));
  };

  const valueToX = () => {
    const usable = trackWidth - THUMB;
    if (usable <= 0 || high <= low) return 0;
    return ((value - low) / (high - low)) * usable;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onChange(xToValue(evt.nativeEvent.locationX - THUMB / 2));
      },
      onPanResponderMove: (evt) => {
        onChange(xToValue(evt.nativeEvent.locationX - THUMB / 2));
      },
    })
  ).current;

  const filledWidth = valueToX() + THUMB / 2;

  return (
    <View>
      <View
        {...panResponder.panHandlers}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setTrackWidth(w);
          trackWidthRef.current = w;
        }}
        className="justify-center"
        style={{ height: THUMB }}
      >
        {/* Track */}
        <View className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        {/* Filled portion */}
        <View
          className="absolute h-1.5 rounded-full bg-brand-primary"
          style={{ width: Math.max(0, filledWidth) }}
        />
        {/* Thumb */}
        <View
          className="absolute bg-brand-primary rounded-full border-2 border-white shadow-sm"
          style={{ width: THUMB, height: THUMB, left: Math.max(0, valueToX()) }}
        />
      </View>
      <View className="flex-row justify-between mt-1">
        <Text className="text-text-muted dark:text-text-darkMuted text-xs">₪{low.toLocaleString()}</Text>
        <Text className="text-text-muted dark:text-text-darkMuted text-xs">₪{high.toLocaleString()}</Text>
      </View>
    </View>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const styles: Record<Confidence, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }> = {
    high: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: 'checkmark-circle', iconColor: '#15803D' },
    medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-500', icon: 'alert-circle', iconColor: '#CA8A04' },
    low: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: 'help-circle', iconColor: '#DC2626' },
  };
  const s = styles[confidence];
  return (
    <View className={`flex-row items-center px-2.5 py-1 rounded-full ${s.bg}`}>
      <Ionicons name={s.icon} size={13} color={s.iconColor} />
      <Text className={`text-xs font-bold ml-1 capitalize ${s.text}`}>{confidence} confidence</Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1.5 uppercase tracking-wider">
        {label}
      </Text>
      {children}
    </View>
  );
}

const inputClass =
  'bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-text-primary dark:text-text-darkPrimary text-base';

export default function ListingAssistant({ onPublish }: ListingAssistantProps) {
  const [images, setImages] = useState<PickedImage[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState<ListingResult | null>(null);
  const [location, setLocation] = useState('');
  const [revalueVisible, setRevalueVisible] = useState(false);
  const [revalueContext, setRevalueContext] = useState('');
  const [revalueError, setRevalueError] = useState('');
  const [revaluing, setRevaluing] = useState(false);

  const update = <K extends keyof ListingResult>(key: K, val: ListingResult[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: val } : prev));
  };

  const updateAttr = (key: string, val: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const current = prev.attributes?.[key] ?? '';
      return { ...prev, attributes: { ...(prev.attributes ?? {}), [key]: current === val ? '' : val } };
    });
  };

  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - images.length,
        quality: 1,
      });
      if (result.canceled) return;
      const picked: PickedImage[] = result.assets.map((a) => ({ uri: a.uri }));
      setImages((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    } catch {
      Alert.alert('Error', 'Could not open the photo library.');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Camera access is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled) return;
      setImages((prev) => [...prev, { uri: result.assets[0].uri }].slice(0, MAX_PHOTOS));
    } catch {
      Alert.alert('Error', 'Could not open the camera.');
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((i) => i.uri !== uri));
  };

  const setAsMain = (idx: number) => {
    setImages((prev) => {
      const next = [...prev];
      [next[0], next[idx]] = [next[idx], next[0]];
      return next;
    });
  };

  const addPhoto = () => {
    if (images.length >= MAX_PHOTOS) return;
    Alert.alert('Add Photo', undefined, [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const runAnalysis = async () => {
    if (images.length === 0) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const result = await analyzeImages(images);
      setForm(result);
      setStatus('done');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const reset = () => {
    setImages([]);
    setForm(null);
    setStatus('idle');
    setErrorMsg('');
  };

  const handleRevalue = async () => {
    const err = validateRevalueContext(revalueContext);
    if (err) { setRevalueError(err); return; }
    setRevalueError('');
    setRevalueVisible(false);
    setRevaluing(true);
    try {
      const result = await analyzeImages(images, {
        additionalContext: revalueContext,
        current: form ?? undefined,
      });
      setForm(result);
      setRevalueContext('');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
      setStatus('error');
    } finally {
      setRevaluing(false);
    }
  };

  // ---- Image picker / upload stage ----
  const renderUploadStage = () => {
    if (images.length === 0) {
      return (
        <View>
          <Text className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary mb-1">
            AI Listing Assistant
          </Text>
          <Text className="text-text-muted dark:text-text-darkMuted mb-6">
            Add photos and we'll identify the item, assess its condition, and suggest a price in ₪.
          </Text>

          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={takePhoto}
              style={{ flex: 1, aspectRatio: 1 }}
              className="bg-surface-cardLight dark:bg-surface-cardDark border-2 border-dashed border-brand-primary/30 rounded-2xl items-center justify-center"
            >
              <View className="w-14 h-14 bg-brand-primary/10 rounded-full items-center justify-center mb-2">
                <Ionicons name="camera" size={28} color="#0F766E" />
              </View>
              <Text className="text-text-primary dark:text-text-darkPrimary font-bold">Take Photo</Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-xs mt-0.5">Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickFromLibrary}
              style={{ flex: 1, aspectRatio: 1 }}
              className="bg-surface-cardLight dark:bg-surface-cardDark border-2 border-dashed border-brand-primary/30 rounded-2xl items-center justify-center"
            >
              <View className="w-14 h-14 bg-brand-primary/10 rounded-full items-center justify-center mb-2">
                <Ionicons name="images" size={28} color="#0F766E" />
              </View>
              <Text className="text-text-primary dark:text-text-darkPrimary font-bold">Upload</Text>
              <Text className="text-text-muted dark:text-text-darkMuted text-xs mt-0.5">Add up to {MAX_PHOTOS}, one at a time</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
            <Text className="text-text-primary dark:text-text-darkPrimary font-semibold mb-3">
              Tips for best results
            </Text>
            {[
              'Good lighting shows details clearly',
              'Multiple angles = more accurate estimate',
              'Include any damage or wear',
            ].map((tip) => (
              <View key={tip} className="flex-row items-center mb-2">
                <Ionicons name="checkmark-circle" size={16} color="#0F766E" />
                <Text className="text-text-muted dark:text-text-darkMuted text-sm ml-2">{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    const remaining = MAX_PHOTOS - images.length;

    return (
      <View>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary">
            AI Listing Assistant
          </Text>
          <View className="bg-brand-primary/10 px-3 py-1 rounded-full">
            <Text className="text-brand-primary font-bold text-sm">
              {images.length}/{MAX_PHOTOS}
            </Text>
          </View>
        </View>

        {/* 2-column photo grid */}
        <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
          {images.map((img, idx) => (
            <View
              key={img.uri}
              className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800"
              style={{ width: '48.5%', aspectRatio: 1 }}
            >
              <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />

              {idx === 0 ? (
                <View className="absolute top-2 left-2 bg-brand-primary px-2 py-0.5 rounded-full">
                  <Text className="text-white text-[10px] font-bold">MAIN</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setAsMain(idx)}
                  className="absolute top-2 left-2 bg-black/50 px-2 py-0.5 rounded-full"
                >
                  <Text className="text-white text-[10px] font-medium">Set main</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => removeImage(img.uri)}
                className="absolute top-2 right-2 bg-black/50 w-7 h-7 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}

          {images.length < MAX_PHOTOS && (
            <TouchableOpacity
              onPress={addPhoto}
              className="border-2 border-dashed border-brand-primary/40 bg-brand-primary/5 dark:bg-brand-primary/10 rounded-2xl items-center justify-center"
              style={{ width: '48.5%', aspectRatio: 1 }}
            >
              <Ionicons name="add-circle-outline" size={32} color="#0F766E" />
              <Text className="text-brand-primary text-sm font-semibold mt-1">Add More</Text>
              <Text className="text-brand-primary/60 text-xs">
                {remaining} slot{remaining !== 1 ? 's' : ''} left
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {images.length >= 2 && (
          <View className="flex-row items-center bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-3 mb-4">
            <Ionicons name="bulb-outline" size={16} color="#0F766E" />
            <Text className="text-brand-primary text-xs ml-2 flex-1">
              {images.length < MAX_PHOTOS
                ? 'Add more angles for a more accurate estimate'
                : 'All 4 photos will give the most accurate analysis'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={runAnalysis}
          className="py-4 rounded-2xl bg-brand-primary items-center justify-center flex-row"
        >
          <Ionicons name="sparkles" size={20} color="#fff" />
          <Text className="text-white font-bold text-base ml-2">
            Analyze {images.length} Photo{images.length !== 1 ? 's' : ''} with AI
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ---- Loading stage ----
  const renderLoading = () => (
    <View className="items-center justify-center py-16">
      {images[0] && (
        <Image source={{ uri: images[0].uri }} className="w-28 h-28 rounded-2xl mb-6 opacity-60" />
      )}
      <ActivityIndicator size="large" color="#0F766E" />
      <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-lg mt-4">
        Analyzing your item...
      </Text>
      <Text className="text-text-muted dark:text-text-darkMuted text-center mt-1 px-8">
        Identifying the item, checking condition, and estimating a fair price.
      </Text>
    </View>
  );

  // ---- Error stage ----
  const renderError = () => (
    <View className="items-center justify-center py-16 px-6">
      <View className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mb-4">
        <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
      </View>
      <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-lg text-center mb-1">
        Analysis failed
      </Text>
      <Text className="text-text-muted dark:text-text-darkMuted text-center mb-6">{errorMsg}</Text>
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={() => setStatus('idle')}
          className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800"
        >
          <Text className="text-text-primary dark:text-text-darkPrimary font-semibold">Edit Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={runAnalysis} className="px-5 py-3 rounded-2xl bg-brand-primary">
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---- Editable result form ----
  const renderForm = () => {
    if (!form) return null;
    return (
      <View>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary">Review Listing</Text>
          <ConfidenceBadge confidence={form.confidence} />
        </View>

        {form.confidence !== 'high' && !!form.confidence_reason && (
          <View className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 mb-5 flex-row">
            <Ionicons name="information-circle-outline" size={18} color="#CA8A04" />
            <Text className="text-yellow-800 dark:text-yellow-500 text-sm ml-2 flex-1">
              {form.confidence_reason}
            </Text>
          </View>
        )}

        <Field label="Title">
          <TextInput value={form.title} onChangeText={(v) => update('title', v)} className={inputClass} />
        </Field>

        <Field label="Category">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORY_CONFIG.map((cat) => {
              const active = form.category === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => { update('category', cat.name); update('sub_category', ''); }}
                  style={active ? { backgroundColor: `${cat.color}18`, borderColor: cat.color } : {}}
                  className={`flex-row items-center px-3 py-2 rounded-full mr-2 border ${
                    active ? '' : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Ionicons name={cat.icon as any} size={14} color={active ? cat.color : '#94A3B8'} />
                  <Text
                    style={active ? { color: cat.color } : {}}
                    className={`font-semibold ml-1.5 text-sm ${active ? '' : 'text-text-primary dark:text-text-darkPrimary'}`}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Field>

        {(() => {
          const catConfig = CATEGORY_CONFIG.find((c) => c.name === form.category);
          const subCats = catConfig?.subCategories ?? [];
          if (subCats.length === 0) return null;
          return (
            <Field label="Sub-category">
              <View className="flex-row flex-wrap gap-2">
                {subCats.map((sub) => {
                  const active = form.sub_category === sub.name;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      onPress={() => update('sub_category', active ? '' : sub.name)}
                      style={active && catConfig ? { backgroundColor: `${catConfig.color}18`, borderColor: catConfig.color } : {}}
                      className={`px-3 py-1.5 rounded-full border ${
                        active ? '' : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Text
                        style={active && catConfig ? { color: catConfig.color } : {}}
                        className={`text-sm font-semibold ${active ? '' : 'text-text-primary dark:text-text-darkPrimary'}`}
                      >
                        {sub.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>
          );
        })()}

        {(() => {
          const catConfig = CATEGORY_CONFIG.find((c) => c.name === form.category);
          const brands = catConfig?.brands ?? [];
          return (
            <Field label="Brand">
              {brands.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                  {brands.map((b) => {
                    const active = form.brand === b;
                    return (
                      <TouchableOpacity
                        key={b}
                        onPress={() => update('brand', active ? '' : b)}
                        className={`px-3 py-1.5 rounded-full mr-2 border ${
                          active
                            ? 'bg-brand-primary border-brand-primary'
                            : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-text-primary dark:text-text-darkPrimary'}`}>
                          {b}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              <TextInput
                value={form.brand}
                onChangeText={(v) => update('brand', v)}
                placeholder="Or type brand name..."
                placeholderTextColor="#94A3B8"
                className={inputClass}
              />
            </Field>
          );
        })()}

        <Field label="Model">
          <TextInput value={form.model} onChangeText={(v) => update('model', v)} className={inputClass} />
        </Field>

        {(() => {
          const catConfig = CATEGORY_CONFIG.find((c) => c.name === form.category);
          const condAttr = catConfig?.attributes.find((a) => a.key === 'condition');
          const condOptions = condAttr?.options ?? [
            { label: 'New', value: 'New' }, { label: 'Like New', value: 'Like New' },
            { label: 'Good', value: 'Good' }, { label: 'Fair', value: 'Fair' },
          ];
          return (
            <Field label="Condition">
              <View className="flex-row flex-wrap gap-2">
                {condOptions.map((opt) => {
                  const active = form.condition === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => update('condition', opt.value)}
                      className={`px-4 py-2 rounded-full border ${
                        active ? 'bg-brand-primary border-brand-primary'
                               : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Text className={`font-semibold ${active ? 'text-white' : 'text-text-primary dark:text-text-darkPrimary'}`}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>
          );
        })()}

        <Field label="Condition Details">
          <TextInput
            value={form.condition_details}
            onChangeText={(v) => update('condition_details', v)}
            multiline
            className={`${inputClass} min-h-[60px]`}
            textAlignVertical="top"
          />
        </Field>

        {/* Dynamic category attributes (storage, RAM, size, color, material, etc.) */}
        {(() => {
          const catConfig = CATEGORY_CONFIG.find((c) => c.name === form.category);
          const attrs = (catConfig?.attributes ?? []).filter(
            (a) => a.key !== 'condition' && a.key !== 'model'
          );
          if (attrs.length === 0) return null;
          return (
            <>
              {attrs.map((attr) => (
                <Field key={attr.key} label={attr.label}>
                  {attr.type === 'pills' && attr.options ? (
                    <View className="flex-row flex-wrap gap-2">
                      {attr.options.map((opt) => {
                        const active = (form.attributes?.[attr.key] ?? '') === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            onPress={() => updateAttr(attr.key, opt.value)}
                            className={`px-3 py-1.5 rounded-full border ${
                              active ? 'bg-brand-primary border-brand-primary'
                                     : 'bg-surface-cardLight dark:bg-surface-cardDark border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-text-primary dark:text-text-darkPrimary'}`}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <TextInput
                      value={form.attributes?.[attr.key] ?? ''}
                      onChangeText={(v) => updateAttr(attr.key, v)}
                      placeholder={attr.placeholder ?? ''}
                      placeholderTextColor="#94A3B8"
                      className={inputClass}
                    />
                  )}
                </Field>
              ))}
            </>
          );
        })()}

        <Field label={`Price · ₪${form.price_estimate.suggested.toLocaleString()}`}>
          <PriceSlider
            low={form.price_estimate.low}
            high={form.price_estimate.high}
            value={form.price_estimate.suggested}
            onChange={(v) => update('price_estimate', { ...form.price_estimate, suggested: v })}
          />
        </Field>

        <Field label="Location">
          <CityPicker value={location} onChange={setLocation} />
        </Field>

        <Field label="Description">
          <TextInput
            value={form.description}
            onChangeText={(v) => update('description', v)}
            multiline
            className={`${inputClass} min-h-[90px]`}
            textAlignVertical="top"
          />
        </Field>

        <Field label="Key Specs">
          {form.key_specs.map((spec, idx) => (
            <View key={idx} className="flex-row items-center mb-2">
              <TextInput
                value={spec}
                onChangeText={(v) => {
                  const next = [...form.key_specs];
                  next[idx] = v;
                  update('key_specs', next);
                }}
                className={`${inputClass} flex-1`}
              />
              <TouchableOpacity
                onPress={() => update('key_specs', form.key_specs.filter((_, i) => i !== idx))}
                className="ml-2 p-2"
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => update('key_specs', [...form.key_specs, ''])}
            className="flex-row items-center mt-1"
          >
            <Ionicons name="add-circle-outline" size={18} color="#0F766E" />
            <Text className="text-brand-primary font-semibold ml-1">Add spec</Text>
          </TouchableOpacity>
        </Field>

        {/* Revalue button */}
        <TouchableOpacity
          onPress={() => { setRevalueContext(''); setRevalueError(''); setRevalueVisible(true); }}
          className="flex-row items-center justify-center border border-brand-primary/40 bg-brand-primary/5 rounded-2xl py-3 mb-3"
        >
          {revaluing ? (
            <ActivityIndicator size="small" color="#0F766E" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color="#0F766E" />
              <Text className="text-brand-primary font-semibold ml-2">Revalue with Context</Text>
            </>
          )}
        </TouchableOpacity>

        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            onPress={reset}
            className="px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 items-center justify-center"
          >
            <Ionicons name="refresh-outline" size={20} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onPublish?.(form, images.map((i) => i.uri), location)}
            className="flex-1 py-4 rounded-2xl bg-brand-primary items-center justify-center flex-row"
          >
            <Ionicons name="rocket-outline" size={20} color="#fff" />
            <Text className="text-white font-bold text-base ml-2">Use This Listing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-surface-light dark:bg-surface-dark"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {status === 'loading'
          ? renderLoading()
          : status === 'error'
          ? renderError()
          : status === 'done'
          ? renderForm()
          : renderUploadStage()}
      </ScrollView>

      {/* Revalue modal */}
      <Modal
        visible={revalueVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRevalueVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end"
        >
          <View className="bg-surface-light dark:bg-surface-dark rounded-t-3xl px-5 pt-5 pb-8 border-t border-slate-200 dark:border-slate-800">

            {/* Handle bar */}
            <View className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full self-center mb-5" />

            <Text className="text-text-primary dark:text-text-darkPrimary font-bold text-lg mb-1">
              Add Context to Refine
            </Text>
            <Text className="text-text-muted dark:text-text-darkMuted text-sm mb-4">
              Tell Claude anything the photos don't show — storage size, accessories, purchase year, defects, etc.
            </Text>

            {/* Current estimate summary */}
            {form && (
              <View className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 mb-4 flex-row items-center">
                <View className="flex-1">
                  <Text className="text-text-muted dark:text-text-darkMuted text-xs mb-0.5">Current estimate</Text>
                  <Text className="text-text-primary dark:text-text-darkPrimary font-semibold text-sm">
                    {form.brand} {form.model} · {form.condition.replace('_', ' ')}
                  </Text>
                </View>
                <Text className="text-brand-primary font-bold text-base">
                  ₪{form.price_estimate.suggested.toLocaleString()}
                </Text>
              </View>
            )}

            <TextInput
              value={revalueContext}
              onChangeText={(v) => { setRevalueContext(v); setRevalueError(''); }}
              placeholder={'e.g. "512GB model, original box included, battery at 91%"\n"Small crack on back glass, charger not included"'}
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-text-primary dark:text-text-darkPrimary text-sm min-h-[100px] mb-1"
            />

            {revalueError ? (
              <Text className="text-red-500 text-xs mb-3">{revalueError}</Text>
            ) : (
              <Text className="text-text-muted dark:text-text-darkMuted text-xs mb-3">
                {revalueContext.trim().length}/200 · Be specific — more detail = better price accuracy
              </Text>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setRevalueVisible(false)}
                className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 items-center"
              >
                <Text className="text-text-primary dark:text-text-darkPrimary font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRevalue}
                className="flex-1 py-4 rounded-2xl bg-brand-primary items-center flex-row justify-center"
              >
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text className="text-white font-bold ml-2">Revalue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
