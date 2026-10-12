/**
 * Theme colors. Every text/background pair used in the app meets WCAG AA
 * (4.5:1 for text) and input outlines meet the 3:1 non-text minimum, in both
 * schemes. Keep it that way when changing a value: check the pair with a contrast
 * calculator, since a small tweak to a gray can quietly drop below the line.
 */
export interface Palette {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  /** Hairlines and dividers. Decorative only: not strong enough to mark the edge of a control. */
  border: string;
  /** Outline of text inputs and pickers, strong enough (3:1) to see where the field is. */
  inputBorder: string;
  primary: string;
  /** Text/icons drawn on top of `primary`. */
  onPrimary: string;
  /** Validation errors and other problems. */
  danger: string;
}

export const lightPalette: Palette = {
  background: '#FFFFFF',
  surface: '#F4F5F7',
  text: '#111827',
  textMuted: '#656C79',
  border: '#E5E7EB',
  inputBorder: '#7A818D',
  primary: '#2563EB',
  onPrimary: '#FFFFFF',
  danger: '#B91C1C',
};

export const darkPalette: Palette = {
  background: '#0B0F19',
  surface: '#161B26',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  border: '#2A3140',
  inputBorder: '#6B7280',
  primary: '#60A5FA',
  onPrimary: '#0B0F19',
  danger: '#F87171',
};
