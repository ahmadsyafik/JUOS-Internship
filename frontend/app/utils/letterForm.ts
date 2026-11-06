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

export function generateDefaultNomorSurat(
  jenisSurat: string,
  existingLettersOrId?: Array<{ nomor_surat?: string }> | number | null
): string {
  const now = new Date();
  const romawi = BULAN_ROMAWI[now.getMonth()];
  const tahun = now.getFullYear();
  const js = (jenisSurat || '').toUpperCase().trim();
  const prefix = `${js}/JUOS/${romawi}/${tahun}/`;

  if (Array.isArray(existingLettersOrId)) {
    let maxCounter = 0;
    for (const letter of existingLettersOrId) {
      const no = (letter.nomor_surat || '').trim();
      if (no.toUpperCase().startsWith(prefix)) {
        const suffix = no.substring(prefix.length);
        const num = parseInt(suffix, 10);
        if (!isNaN(num) && num > maxCounter) {
          maxCounter = num;
        }
      }
    }
    const nextCounter = maxCounter + 1;
    return `${js}/JUOS/${romawi}/${tahun}/${String(nextCounter).padStart(3, '0')}`;
  }

  if (typeof existingLettersOrId === 'number') {
    return `${js}/JUOS/${romawi}/${tahun}/${String(existingLettersOrId + 1).padStart(3, '0')}`;
  }

  return `${js}/JUOS/${romawi}/${tahun}/001`;
}
