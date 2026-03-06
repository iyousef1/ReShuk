import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 1. Import your Firebase connection
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../src/lib/firebase';

export default function RegisterScreen() {
  const router = useRouter();
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2. The Firebase Connection Function
  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert("Missing Fields", "Please fill out all fields to create an account.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      // A. Tell Firebase Auth to create the secure user credentials
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // B. Save their public profile details to your Firestore Database
      await setDoc(doc(db, 'profiles', user.uid), {
        id: user.uid,
        full_name: fullName,
        email: email.toLowerCase(),
        joined_at: serverTimestamp(),
        rating: 0
      });

      // C. Success! Dismiss the auth modal and return them to the app
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }

    } catch (error: any) {
      console.error("Registration Error:", error);
      const message = error.message.replace('Firebase: ', '');
      Alert.alert("Registration Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark">
      
      {/* Close Modal Button */}
      <TouchableOpacity 
        onPress={() => router.back()} 
        className="absolute top-4 right-5 z-20 p-2 bg-surface-cardLight dark:bg-surface-cardDark rounded-full"
      >
        <Ionicons name="close" size={24} color="#94A3B8" />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-brand-primary rounded-3xl items-center justify-center mb-4 shadow-sm shadow-brand-primary/30">
            <Ionicons name="person-add-outline" size={40} color="#FFFFFF" />
          </View>
          <Text className="text-3xl font-extrabold text-brand-primary mb-2">
            Join ReShuk
          </Text>
          <Text className="text-text-muted dark:text-text-darkMuted text-center px-4">
            Create an account to start buying and selling locally.
          </Text>
        </View>

        <View className="space-y-4">
          
          <View>
            <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 ml-1 uppercase tracking-wider">Full Name</Text>
            <View className="flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-14">
              <Ionicons name="person-outline" size={20} color="#94A3B8" />
              <TextInput 
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g., Yousef"
                placeholderTextColor="#94A3B8"
                className="flex-1 ml-3 text-text-primary dark:text-text-darkPrimary text-base"
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 ml-1 uppercase tracking-wider">Email</Text>
            <View className="flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-14">
              <Ionicons name="mail-outline" size={20} color="#94A3B8" />
              <TextInput 
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#94A3B8"
                className="flex-1 ml-3 text-text-primary dark:text-text-darkPrimary text-base"
              />
            </View>
          </View>

          <View className="mb-2">
            <Text className="text-xs font-bold text-text-muted dark:text-text-darkMuted mb-1 ml-1 uppercase tracking-wider">Password</Text>
            <View className="flex-row items-center bg-surface-cardLight dark:bg-surface-cardDark border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-14">
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
              <TextInput 
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                secureTextEntry
                placeholderTextColor="#94A3B8"
                className="flex-1 ml-3 text-text-primary dark:text-text-darkPrimary text-base"
              />
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleRegister}
            disabled={isLoading}
            className={`h-14 rounded-xl items-center justify-center flex-row mt-4 ${
              isLoading ? 'bg-brand-primary/60' : 'bg-brand-primary'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-lg">Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Link back to Login */}
        <View className="flex-row justify-center mt-8">
          <Text className="text-text-muted dark:text-text-darkMuted">
            Already have an account? {" "}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text className="text-brand-primary font-bold">Log In</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}