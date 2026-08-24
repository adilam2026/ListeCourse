// Palette et typographie — en miroir de la maquette validée.

export const colors = {
  background: '#FBF3E7',
  surface: '#FFFFFF',
  surfaceAlt: '#F1E7D8',
  border: '#ECE0D1',
  borderStrong: '#D8C7B0',
  text: '#382C22',
  textSoft: '#8A7663',
  textFaint: '#C9B79C',
  accent: '#D9622B',
  success: '#5B8C5A',
  warning: '#C48A2E',

  categoryTints: {
    legumes: { bg: '#EAF1E6', fg: '#4B7A4A' },
    fruits: { bg: '#FBE9DE', fg: '#C23B3B' },
    dairy: { bg: '#E7F0F5', fg: '#4A7C93' },
    grocery: { bg: '#FBF0DC', fg: '#B8862E' },
    breakfast: { bg: '#FBF0DC', fg: '#B8862E' },
    meat: { bg: '#FBE9DE', fg: '#C23B3B' },
    fish: { bg: '#E7F0F5', fg: '#4A7C93' },
    drinks: { bg: '#E7F0F5', fg: '#4A7C93' },
    household: { bg: '#EFEAF5', fg: '#7A6A93' },
    hygiene: { bg: '#E7F0F5', fg: '#4A7C93' },
    children: { bg: '#F1E7D8', fg: '#8A7663' },
    other: { bg: '#F1E7D8', fg: '#8A7663' },
  } as Record<string, { bg: string; fg: string }>,
} as const;

export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayMedium: 'Fredoka_500Medium',
  body: 'NunitoSans_400Regular',
  bodyBold: 'NunitoSans_700Bold',
  bodyExtraBold: 'NunitoSans_800ExtraBold',
} as const;

export const radii = {
  sm: 11,
  md: 14,
  lg: 16,
  xl: 18,
  pill: 999,
} as const;

export function categoryTint(icon: string) {
  return colors.categoryTints[icon] ?? colors.categoryTints.other;
}
