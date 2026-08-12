const DRIVE_HOSTS = new Set(["drive.google.com", "www.drive.google.com"]);

/**
 * Convert normal Google Drive sharing links into an image URL that can be used
 * in an <img>. Non-Drive URLs are returned unchanged.
 *
 * Supported examples:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID&export=view
 */
export function normalizeTeachingThumbnailUrl(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (!DRIVE_HOSTS.has(url.hostname.toLowerCase())) return raw;

    const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
    const fileId = pathMatch?.[1] ?? url.searchParams.get("id");
    if (!fileId) return raw;

    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`;
  } catch {
    return raw;
  }
}
