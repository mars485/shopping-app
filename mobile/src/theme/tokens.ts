export type Palette = {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  onDanger: string;
  shadow: string;
  overlay: string;
};

export const light: Palette = {
  bg: '#F3F5F8',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F5',
  border: '#E1E7EE',
  borderStrong: '#CBD5E1',
  text: '#0B1220',
  textMuted: '#5A6A7E',
  textFaint: '#8B98A9',
  primary: '#16A34A',
  primaryPressed: '#15803D',
  primarySoft: '#DCFCE7',
  onPrimary: '#FFFFFF',
  accent: '#F59E0B',
  accentSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  onDanger: '#FFFFFF',
  shadow: '#0B1220',
  overlay: 'rgba(11, 18, 32, 0.45)',
};

export const dark: Palette = {
  bg: '#0B1220',
  bgElevated: '#131C2B',
  surface: '#131C2B',
  surfaceAlt: '#1B2537',
  border: '#233049',
  borderStrong: '#31405C',
  text: '#E8EEF6',
  textMuted: '#9AACC2',
  textFaint: '#6E7F96',
  primary: '#22C55E',
  primaryPressed: '#16A34A',
  primarySoft: '#123322',
  onPrimary: '#04140A',
  accent: '#FBBF24',
  accentSoft: '#3A2A07',
  danger: '#F87171',
  dangerSoft: '#3B1518',
  onDanger: '#2A0A0D',
  shadow: '#000000',
  overlay: 'rgba(3, 7, 14, 0.6)',
};

export const gradient = {
  light: ['#16A34A', '#0E9F6E', '#0B8457'] as const,
  dark: ['#12924A', '#0C7A4A', '#0A5F3C'] as const,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '500' },
} as const;
