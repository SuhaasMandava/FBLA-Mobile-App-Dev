import { Platform, TextStyle, ViewStyle } from 'react-native';

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
  /** A slightly lighter panel inside the hero (the ticket stub). */
  heroPanel: string;
  /** The perforation between ticket and stub (decorative). */
  heroLine: string;
  /** The app mark from the icon (decorative, never text): navy disc, white pin, amber center, blue orbiting dots. */
  markDisc: string;
  markPin: string;
  markSun: string;
  markPlanet: string;
  /** Fill of floating glass controls where real Liquid Glass or blur isn't available (translucent). */
  glassFill: string;
  /** The same control with Reduce Transparency on: fully opaque. */
  glassSolid: string;
  /** The bright rim on a glass control (decorative). */
  glassBorder: string;
  /** Soft shadows under cards and floating controls. */
  shadow: string;
  /** Second stop of the hero gradient (deeper than `hero`). */
  heroDeep: string;
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
  heroPanel: '#1D3A78',
  heroLine: '#6E84B8',
  markDisc: '#223658',
  markPin: '#F4F6FA',
  markSun: '#D9822B',
  markPlanet: '#1E3F8F',
  glassFill: 'rgba(255,255,255,0.72)',
  glassSolid: '#FFFFFF',
  glassBorder: 'rgba(255,255,255,0.85)',
  shadow: '#1B2A4A',
  heroDeep: '#0E1F47',
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
  heroPanel: '#223463',
  heroLine: '#6E84B8',
  markDisc: '#223658',
  markPin: '#F4F6FA',
  markSun: '#D9822B',
  markPlanet: '#1E3F8F',
  glassFill: 'rgba(28,37,64,0.72)',
  glassSolid: '#1C2540',
  glassBorder: 'rgba(255,255,255,0.14)',
  shadow: '#000000',
  heroDeep: '#101A36',
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
  | 'display'
  | 'stat'
  | 'code';

/**
 * Bricolage Grotesque (SIL OFL 1.1, via @expo-google-fonts), loaded in App.tsx. Used for titles and numerals only;
 * body text stays in the system font so it matches each platform. Each weight is its own family on native,
 * so display roles set `fontFamily` and no `fontWeight`.
 */
export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  displayMedium: 'BricolageGrotesque_600SemiBold',
} as const;

const monospace = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** Sizes follow the iOS "Large (default)" Dynamic Type table; they scale with the system text size. */
export const typography: Record<TypeRole, TextStyle> = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontFamily: fonts.display },
  title1: { fontSize: 28, lineHeight: 34, fontFamily: fonts.display },
  title2: { fontSize: 22, lineHeight: 28, fontFamily: fonts.display },
  title3: { fontSize: 20, lineHeight: 25, fontFamily: fonts.displayMedium },
  /** The trip hero's destination. */
  display: { fontSize: 38, lineHeight: 42, fontFamily: fonts.displayHeavy, letterSpacing: -0.5 },
  /** Big numerals: the countdown and the tile figures. */
  stat: { fontSize: 26, lineHeight: 30, fontFamily: fonts.display },
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
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Soft, wide shadows (iOS/web) with a matching Android elevation. Light mode only: on dark
 * backgrounds a shadow is invisible, so surfaces get a hairline rim instead (see `Card`).
 */
export function shadowStyle(colors: ColorTokens, scheme: ColorScheme, level: 'card' | 'raised' | 'floating'): ViewStyle {
  if (scheme === 'dark' && level !== 'floating') return {};
  const spec = {
    card: { opacity: 0.07, radius: 14, y: 4, elevation: 2 },
    raised: { opacity: 0.14, radius: 22, y: 10, elevation: 6 },
    floating: { opacity: scheme === 'dark' ? 0.5 : 0.16, radius: 24, y: 10, elevation: 10 },
  }[level];
  return {
    shadowColor: colors.shadow,
    shadowOpacity: spec.opacity,
    shadowRadius: spec.radius,
    shadowOffset: { width: 0, height: spec.y },
    elevation: spec.elevation,
  };
}

export const layout = {
  /** Smallest tap target on any interactive element. */
  minTarget: 44,
  /** Height of buttons and fields. */
  controlHeight: 52,
  /** The floating glass tab bar: its height and its gap from the screen edges. */
  tabBarHeight: 64,
  tabBarMargin: 12,
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
  /** Sections sliding in when a screen opens; each one starts `stagger` after the last. */
  enter: 380,
  stagger: 70,
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
