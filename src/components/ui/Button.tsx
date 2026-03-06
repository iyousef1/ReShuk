import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  isLoading?: boolean;
  className?: string; // To allow overriding styles from the parent
};

export function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  isLoading = false, 
  className = '' 
}: ButtonProps) {
  
  // Base styling for structure and interaction
  const baseStyle = "py-4 px-6 rounded-xl flex-row justify-center items-center active:opacity-80";
  
  // Apply our new Tailwind color tokens based on the variant
  const buttonVariants = {
    primary: "bg-action-cta", // Professional Teal
    outline: "border-2 border-brand-primary bg-transparent dark:border-action-link", // Deep Teal border
  };

  const textVariants = {
    primary: "text-brand-accent font-bold text-lg", // Pure White text
    outline: "text-brand-primary dark:text-action-link font-bold text-lg",
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={isLoading}
      className={`${baseStyle} ${buttonVariants[variant]} ${className}`}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#0F766E'} />
      ) : (
        <Text className={textVariants[variant]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}