import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts, radii } from '../lib/theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'success' | 'outline';
  style?: ViewStyle;
}

export default function PrimaryButton({ label, onPress, disabled, loading, variant = 'primary', style }: Props) {
  const bg = variant === 'success' ? colors.success : variant === 'outline' ? colors.surface : colors.accent;
  const textColor = variant === 'outline' ? colors.text : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        variant === 'outline' && styles.outline,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 15,
  },
});
