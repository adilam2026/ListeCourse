import Svg, { Path, Circle } from 'react-native-svg';
import { categoryTint } from '../lib/theme';

const paths: Record<string, string[]> = {
  legumes: ['M4 20c0-9 6-15 15-15 0 9-6 15-15 15z', 'M6 18c3-3 7-7 12-11'],
  fruits: ['M12 9c-4 0-7 3-7 7 0 3.5 2.5 6 5 6 1 0 1.5-.5 2-.5s1 .5 2 .5c2.5 0 5-2.5 5-6 0-4-3-7-7-7z', 'M12 9V5'],
  dairy: ['M12 3l5 4v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7l5-4z', 'M7 10h10'],
  grocery: ['M6 8h12l-1 12H7L6 8z', 'M9 8a3 3 0 016 0'],
  breakfast: ['M4 12a8 8 0 0016 0z', 'M4 12a8 8 0 0116 0', 'M9 4l1 3M15 4l-1 3'],
  meat: ['M7 15a6 6 0 1010-4.5L13 6l-2 2-3-3-3 3z'],
  fish: ['M4 12c4-5 12-5 16 0-4 5-12 5-16 0z', 'M16 9l3-2v10l-3-2'],
  drinks: ['M8 3h8l-1 5H9L8 3z', 'M9 8l1 12a1 1 0 001 1h4a1 1 0 001-1l1-12'],
  household: ['M4 11l8-7 8 7', 'M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9'],
  hygiene: ['M12 3.5c-2 0-3.5 2-3.5 4S10 12 12 12s3.5-2.5 3.5-4.5-1.5-4-3.5-4z', 'M9 12h6l1 8.5a1 1 0 01-1 1.5H9a1 1 0 01-1-1.5z'],
  children: ['M12 4.8a3.2 3.2 0 110 6.4 3.2 3.2 0 010-6.4z', 'M6 20c1-4 4-6 6-6s5 2 6 6'],
  other: ['M4 7h16v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7z', 'M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2'],
};

export default function CategoryIcon({ icon, size = 19 }: { icon: string; size?: number }) {
  const tint = categoryTint(icon);
  const d = paths[icon] ?? paths.other;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {d.map((p, i) => (
        <Path key={i} d={p} stroke={tint.fg} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

export function CheckIcon({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 15, color = '#C9B79C' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SearchIcon({ size = 19, color = '#8A7663' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <Path d="M21 21l-4.3-4.3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 17, color = '#8A7663' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function BackIcon({ size = 19, color = '#382C22' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
