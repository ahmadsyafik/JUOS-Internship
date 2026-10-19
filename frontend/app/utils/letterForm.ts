export const APPROVAL_FLOW = ['Admin TU', 'Kepala Dept.', 'Direktur'];

export const SELECT_OPTIONS: Record<string, string[]> = {
  status_perangkat: ['Belum dikembalikan', 'Hilang', 'Rusak', 'Lainnya'],
};

export const PSB_SUBTYPES = ['PSB', 'KONTRAK', 'BAA'];

export const BULAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const isDateKey = (key: string): boolean =>
  ['tanggal', 'tgl', 'date'].some((k) => key.toLowerCase().includes(k));

export const isImageKey = (key: string): boolean =>
  key.toLowerCase().includes('_img') || key.toLowerCase().includes('_gambar');

export const isMapsKey = (key: string): boolean =>
  ['start_lokasi', 'end_lokasi'].includes(key);

export const isValidMapsUrl = (url: string): boolean =>
  !url ||
  /^https?:\/\/(www\.)?google\.com\/maps/.test(url) ||
  /^https?:\/\/maps\.google\.com/.test(url) ||
  /^https?:\/\/maps\.app\.goo\.gl/.test(url);

export const isSelectKey = (key: string): boolean => key in SELECT_OPTIONS;

export const isConditional = (key: string, formData: Record<string, string>): boolean =>
  key === 'lainnya' && formData['status_perangkat'] !== 'Lainnya';

export function generateDefaultNomorSurat(jenisSurat: string, id: number | null): string {
  const now = new Date();
  const romawi = BULAN_ROMAWI[now.getMonth()];
  const tahun = now.getFullYear();
  const suffix = id !== null ? id + 1 : '***';
  return `${jenisSurat}/JUOS/${romawi}/${tahun}/${suffix}`;
}
