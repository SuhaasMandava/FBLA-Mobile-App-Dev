export interface Palette {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
}

export const lightPalette: Palette = {
  background: '#FFFFFF',
  surface: '#F4F5F7',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  primary: '#2563EB',
};

export const darkPalette: Palette = {
  background: '#0B0F19',
  surface: '#161B26',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  border: '#2A3140',
  primary: '#60A5FA',
};
