export const COLORS = {
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

  // Primary Gradient
  GRADIENT_A:    '#8B1A4A',
  GRADIENT_B:    '#1B3A5C',
  GRADIENT_C:    '#4A8B7C',

  HEART_ACTIVE:  '#C53030',
};

/** Color palette type for use across all component style factories */
export type Colors = typeof COLORS;

/** @deprecated Use COLORS directly — no theme switching needed */
export const LIGHT = COLORS;

export function useColors(): Colors {
  return COLORS;
}
