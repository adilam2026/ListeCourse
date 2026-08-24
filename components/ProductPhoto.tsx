import { Image } from 'expo-image';
import Svg, { Circle, Path } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';
import { colors } from '../lib/theme';

function CartPlaceholder({ size }: { size: number }) {
  return (
    <Svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h3l1.5-2h7L17 7h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"
        stroke={colors.textFaint}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={3.2} stroke={colors.textFaint} strokeWidth={1.6} />
    </Svg>
  );
}

export default function ProductPhoto({
  uri,
  size = 62,
  radius = 15,
}: {
  uri: string | null | undefined;
  size?: number;
  radius?: number;
}) {
  if (!uri) {
    return (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius }]}>
        <CartPlaceholder size={size} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: radius }}
      contentFit="cover"
      transition={150}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
