import { Text, TextInput, TextInputProps, View } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className={`mb-4 ${className}`}>
      {/* Optional Label */}
      {label && (
        <Text className="text-text-primary dark:text-text-darkPrimary font-semibold mb-1 ml-1">
          {label}
        </Text>
      )}
      
      {/* The Actual Input Field */}
      <TextInput
        className={`bg-surface-cardLight dark:bg-surface-cardDark text-text-primary dark:text-text-darkPrimary border rounded-xl px-4 py-3 
          ${error ? 'border-action-error' : 'border-slate-200 dark:border-slate-700'} 
          focus:border-brand-primary dark:focus:border-action-link`}
        // Using your Muted Blue Gray for light mode placeholders
        placeholderTextColor="#94A3B8" 
        {...props}
      />
      
      {/* Error Message */}
      {error && (
        <Text className="text-action-error text-sm mt-1 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
}