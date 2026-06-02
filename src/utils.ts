/**
 * Utility functions for KontenGO
 */

// Month names in Indonesian
const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

/**
 * Format date string (YYYY-MM-DD) to Indonesian style (e.g., "2 Mei 2026")
 */
export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day} ${INDONESIAN_MONTHS[monthIdx]} ${year}`;
  }
  return dateStr;
}

/**
 * Convert file to Base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Handle and validate image file
 * Max size: 10MB (10 * 1024 * 1024 bytes)
 * Formats: image/jpeg, image/png, image/webp
 */
export function validateAndProcessImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return reject(new Error("Format file salah! Gunakan format JPG, PNG, atau WebP saja."));
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return reject(new Error("File terlalu besar! Ukuran file maksimal adalah 10 MB."));
    }

    fileToBase64(file)
      .then((base64) => resolve(base64))
      .catch((err) => reject(err));
  });
}
