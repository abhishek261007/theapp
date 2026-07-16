import { Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * Calculate the width of a card in a multi-column grid.
 * @param hPadding  Horizontal padding on each side of the container
 * @param gap       Gap between columns
 * @param columns   Number of columns (default: 2)
 */
export function calcCardWidth(hPadding: number, gap: number, columns = 2): number {
  return (SCREEN_WIDTH - hPadding * 2 - gap * (columns - 1)) / columns;
}
