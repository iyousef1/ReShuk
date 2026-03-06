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

// Firebase Imports
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../src/lib/firebase';

export default function LoginScreen() {
  const router = useRouter();
  
  // UI State
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Only used for Sign Up

  const handleAuth = async () => {
    // 1. Basic Validation
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }

    if (!isLogin && !fullName) {
      Alert.alert("Missing Name", "Please enter your full name to create an account.");
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        await signInWithEmailAndPassword(auth, email, password);
        
        // Success! Dismiss the modal and return to exactly where they were
        router.back(); 
        
      } else {
        // --- SIGN UP FLOW ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Automatically create their public profile in Firestore
        await setDoc(doc(db, 'profiles', user.uid), {
          id: user.uid,
          full_name: fullName,
          joined_at: new Date().toISOString(),
          rating: 0
        });

        // Success! Dismiss the modal
        router.back(); 
      }
    } catch (error: any) {
      console.error(error);
      // Clean up the ugly Firebase error codes for a better user experience
      const message = error.message.replace('Firebase: ', '');
      Alert.alert("Authentication Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark">
      
      {/* THE CLOSE BUTTON 
        Allows the user to back out of the modal if they change their mind 
      */}
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
        {/* Header Section */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-brand-primary rounded-3xl items-center justify-center mb-4 shadow-sm shadow-brand-primary/30">
            <Ionicons name="cart-outline" size={40} color="#FFFFFF" />
          </View>
          <Text className="text-3xl font-extrabold text-brand-primary mb-2">
            ReShuk
          </Text>
          <Text className="text-text-muted dark:text-text-darkMuted text-center px-4">
            {isLogin 
              ? "Welcome back! Ready to find some great deals?" 
              : "Join the community and start buying and selling locally."}
          </Text>
        </View>

        {/* Form Section */}
        <View className="space-y-4">
          
          {/* Only show Full Name if they are signing up */}
          {!isLogin && (
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
          )}

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
                placeholder="••••••••"
                secureTextEntry
                placeholderTextColor="#94A3B8"
                className="flex-1 ml-3 text-text-primary dark:text-text-darkPrimary text-base"
              />
            </View>
          </View>

          {/* Main Action Button */}
          <TouchableOpacity 
            onPress={handleAuth}
            disabled={isLoading}
            className={`h-14 rounded-xl items-center justify-center flex-row mt-4 ${
              isLoading ? 'bg-brand-primary/60' : 'bg-brand-primary'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-lg">
                {isLogin ? 'Log In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle Login/Signup Mode */}
        <View className="flex-row justify-center mt-8">
          <Text className="text-text-muted dark:text-text-darkMuted">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text className="text-brand-primary font-bold">
              {isLogin ? 'Sign Up' : 'Log In'}
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}