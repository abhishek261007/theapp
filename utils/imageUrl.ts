const API_BASE = 'https://apis.27012610.xyz';

/**
 * Resolves an image path or URL to a fully qualified URL.
 * Handles both relative paths (prefixes with API base) and absolute URLs.
 */
export function buildImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  const img = String(imageUrl);
  if (img.startsWith('http')) return img;
  return `${API_BASE}${img}`;
}
