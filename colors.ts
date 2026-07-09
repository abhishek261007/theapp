import useThemeStore from './store/themeStore';

export const LIGHT = {
  GOLD:          '#D4AF37',
  GOLD_DEEP:     '#B8860B',
  BURGUNDY:      '#8B1A4A',
  NAVY:          '#1B3A5C',
  NAVY_DEEP:     '#0F2640',
  TEAL:          '#4A8B7C',
  CREAM:         '#FFFBF4',
  PAPER:         '#FFFFFF',
  INK:           '#2C1810',
  MUTED:         '#8A7A6B',
  BORDER_SOFT:   '#E8E0D8',
  TINT:          '#F5F0EB',

  // Primary Burgundy Gradient
  GRADIENT_A:    '#8B1A4A',
  GRADIENT_B:    '#1B3A5C',
  GRADIENT_C:    '#4A8B7C',

  // Satin Silk Burgundy Gradient
  GRADIENT_D:    '#730A3F',
  GRADIENT_E:    '#97255F',
  GRADIENT_F:    '#5C1348',

  HEART_ACTIVE:  '#C53030',
};

export const DARK = {
  GOLD:          '#D4AF37',
  GOLD_DEEP:     '#B8860B',
  BURGUNDY:      '#6B1240',
  NAVY:          '#142B45',
  NAVY_DEEP:     '#0B1E32',
  TEAL:          '#3A7B6C',
  CREAM:         '#1A0F0A',
  PAPER:         '#2C1810',
  INK:           '#E8D5C0',
  MUTED:         '#9C8B7A',
  BORDER_SOFT:   '#3D2B1F',
  TINT:          '#1A0F0A',
  GRADIENT_A:    '#6B1240', // dark burgundy
  GRADIENT_B:    '#4A1A6B', // deep purple
  GRADIENT_C:    '#6B3FA0', // medium purple
  HEART_ACTIVE:  '#E63946',
};

export function useColors() {
  const dark = useThemeStore((s) => s.dark);
  return dark ? DARK : LIGHT;
}
