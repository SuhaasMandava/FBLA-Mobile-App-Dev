import { Platform, TextStyle } from 'react-native';

/**
 * TripHub design tokens. docs/design-system.md explains each value and lists its
 * contrast ratio; `scripts/check-contrast.js` re-checks the text pairs. Screens
 * read these through `useTheme()` and never hard-code a color, size, or spacing.
 */

export type ColorScheme = 'light' | 'dark';

export interface ColorTokens {
  /** Grouped screen background. */
  background: string;
  /** Cards, list rows, fields. */
  surface: string;
  /** Sheets and menus (shown as a lighter surface in dark mode). */
  surfaceRaised: string;
  label: string;
  /** Supporting text, helper text, placeholders. */
  labelSecondary: string;
  /** Hairlines. Decorative only: too faint to mark the edge of a control. */
  separator: string;
  /** Outline of inputs and pickers (3:1 or more against `surface`). */
  fieldBorder: string;
  /** Brand sunset. Only for things people can act on, selection, and the Route. */
  accent: string;
  accentPressed: string;
  /** Text and icons drawn on `accent`. */
  onAccent: string;
  /** Fill of tinted buttons, selected rows, and badges. */
  accentTint: string;
  /** Text on `accentTint` (plain `accent` is below 4.5:1 there). */
  onAccentTint: string;
  /** Errors and destructive actions. Rose, so it stays apart from the orange accent; always paired with an icon or words. */
  danger: string;
  success: string;
  warning: string;
  /** Fill for loading skeletons. */
  skeleton: string;
  /** Midnight navy: the trip hero card on Home. */
  hero: string;
  /** Text on `hero`. */
  onHero: string;
  onHeroSecondary: string;
  /** The Route and icons drawn on `hero` (decorative). */
  heroAccent: string;
  /** The app mark from the icon (decorative, never text): navy disc, white pin, amber center, blue orbiting dots. */
  markDisc: string;
  markPin: string;
  markSun: string;
  markPlanet: string;
}

export const lightColors: ColorTokens = {
  background: '#F3F5F9',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  label: '#111827',
  labelSecondary: '#586174',
  separator: '#DDE2EA',
  fieldBorder: '#7A8394',
  accent: '#C2410C',
  accentPressed: '#9A3412',
  onAccent: '#FFFFFF',
  accentTint: '#FDEBE4',
  onAccentTint: '#9A3412',
  danger: '#BE123C',
  success: '#15803D',
  warning: '#A16207',
  skeleton: '#E4E8EF',
  hero: '#152B5C',
  onHero: '#FFFFFF',
  onHeroSecondary: '#C9D3EA',
  heroAccent: '#FF8A7A',
  markDisc: '#223658',
  markPin: '#F4F6FA',
  markSun: '#D9822B',
  markPlanet: '#1E3F8F',
};

export const darkColors: ColorTokens = {
  background: '#0B1020',
  surface: '#151C30',
  surfaceRaised: '#1C2540',
  label: '#EEF1F7',
  labelSecondary: '#A3ADC2',
  separator: '#283252',
  fieldBorder: '#6F7B96',
  accent: '#FF8A7A',
  accentPressed: '#FF7563',
  onAccent: '#2A0A05',
  accentTint: '#3A1E22',
  onAccentTint: '#FF9C8E',
  danger: '#FB7185',
  success: '#6EE7A0',
  warning: '#FBBF24',
  skeleton: '#222B45',
  hero: '#18264A',
  onHero: '#FFFFFF',
  onHeroSecondary: '#C9D3EA',
  heroAccent: '#FF8A7A',
  markDisc: '#223658',
  markPin: '#F4F6FA',
  markSun: '#D9822B',
  markPlanet: '#1E3F8F',
};

/** Applied on top of a scheme when the system asks for more contrast. */
export function withIncreasedContrast(colors: ColorTokens): ColorTokens {
  return { ...colors, labelSecondary: colors.label, separator: colors.fieldBorder };
}

export type TypeRole =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'subheadStrong'
  | 'footnote'
  | 'caption'
  | 'code';

const monospace = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** Sizes follow the iOS "Large (default)" Dynamic Type table; they scale with the system text size. */
export const typography: Record<TypeRole, TextStyle> = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  subheadStrong: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  code: { fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: 4, fontFamily: monospace },
};

/** Lines up digits in times, dates, and money. */
export const tabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const layout = {
  /** Smallest tap target on any interactive element. */
  minTarget: 44,
  /** Height of buttons and fields. */
  controlHeight: 50,
  /** Content stops growing past this width on tablets. */
  maxContentWidth: 640,
  /** At or above this system font scale, horizontal rows stack vertically. */
  largeTextScale: 1.35,
} as const;

export const motion = {
  /** State changes, e.g. pressed or selected. */
  fast: 150,
  /** Content appearing. */
  standard: 250,
  /** The Route filling in when the trip changes. */
  route: 300,
  pressedOpacity: 0.7,
} as const;

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  type: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
  motion: typeof motion;
}

export function createTheme(scheme: ColorScheme, increasedContrast = false): Theme {
  const base = scheme === 'dark' ? darkColors : lightColors;
  return {
    scheme,
    colors: increasedContrast ? withIncreasedContrast(base) : base,
    type: typography,
    spacing,
    radii,
    layout,
    motion,
  };
}
