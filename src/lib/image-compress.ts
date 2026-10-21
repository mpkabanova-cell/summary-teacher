const DEFAULT_MAX_WIDTH = 1200;
const STRONG_MAX_WIDTH = 800;
const DEFAULT_QUALITY = 0.75;
const STRONG_QUALITY = 0.6;

export async function compressImage(
  file: File,
  strong = false,
): Promise<string> {
  const maxWidth = strong ? STRONG_MAX_WIDTH : DEFAULT_MAX_WIDTH;
  const quality = strong ? STRONG_QUALITY : DEFAULT_QUALITY;

  if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
    return fileToDataUrl(file);
  }

  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return fileToDataUrl(file);
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validateBase64Limits(images: string[]): string | null {
  if (images.length > 6) {
    return "Максимум 6 листов А4 за один запрос";
  }

  let total = 0;
  for (const img of images) {
    const len = img.length;
    if (len > 4_000_000) {
      return "Одна из страниц слишком большая. Включите сильное сжатие.";
    }
    total += len;
  }

  if (total > 6_000_000) {
    return "Суммарный размер страниц слишком большой. Оставьте до 6 листов А4 или включите сильное сжатие.";
  }

  return null;
}
