import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  ChevronLeft, Loader2, FileText, Upload, Tag,
  CheckCircle2, AlertCircle, Check, X,
  Trash2,
  FileVideo,
} from 'lucide-react';
import { letterService, templateService } from '../../services/api';
import type { Letter, Template } from '../../types';
import { ErrorAlert } from '~/components/ui';
import { FaCopy } from "react-icons/fa";
import { PageShell } from '~/components/letters/PageShell';

type Step = 'template' | 'form';

const APPROVAL_FLOW = ['Admin TU', 'Kepala Dept.', 'Direktur'];

// ─── CSV Parser RFC 4180 — handle koma di dalam tanda kutip ───────────────────
// Bug 3 fix: "Dsn. Lembung, Kec. Deket, Kab. Lamongan" tidak lagi dipecah
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else if (ch === '\r') {
      // skip CR
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvAllRows(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });

  return { headers, rows };
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MouTwoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const csvRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [step, setStep] = useState<Step>('template');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [selected, setSelected] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // PDF preview
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // CSV
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showCsvPicker, setShowCsvPicker] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvMsg, setCsvMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [id, setId] = useState<number | null>(null);
  const [nomorSurat, setNomorSurat] = useState('');
  const editingLetterId = searchParams.get('letter_id') ? Number(searchParams.get('letter_id')) : null;

  useEffect(() => {

    letterService.getAll().then((res) => {
      const firstId = res.data.data?.[0]?.id;
      if (firstId != null) {
        setId(firstId);
      }

      const generated = `MOU/JUOS/${bulanRomawi[new Date().getMonth()]}/${new Date().getFullYear()}/${firstId != null ? firstId + 1 : 0}`;
      setNomorSurat(generated);
    });

    templateService.getAll()
      .then((res) => setTemplates(res.data.data ?? []))
      .catch(() => setListError('Gagal memuat daftar template.'))
      .finally(() => setLoadingList(false));
  }, []);

  // Bug 1 fix: jika ada letter_id di URL → load data letter untuk edit/resubmit
  useEffect(() => {
    const lid = searchParams.get('letter_id');
    if (!lid) {
      const tplId = searchParams.get('template_id');
      if (!tplId || !templates.length) return;

      const tpl = templates.find((item) => item.id === Number(tplId));
      if (!tpl) return;

      setSelected(tpl);
      setFormData(Object.fromEntries(tpl.variabel.map((v) => [v, ''])));
      setNomorSurat(`MOU/JUOS/${bulanRomawi[new Date().getMonth()]}/${new Date().getFullYear()}/${id !== null ? id + 1 : 0}`);
      setCsvMsg(null);
      setCsvFileName('');
      setCsvRows([]);
      setShowCsvPicker(false);
      setSubmitError('');
      setPdfUrl(null);
      setStep('form');
      return;
    }

    letterService.getById(Number(lid))
      .then((res) => {
        const letter = res.data.data ?? res.data;
        if (!letter) return;

        setSelected(letter.template ?? null);
        setFormData(letter.data_surat ?? {});
        setNomorSurat(letter.nomor_surat || '');
        setCsvMsg(null);
        setCsvFileName('');
        setCsvRows([]);
        setShowCsvPicker(false);
        setSubmitError('');
        setPdfUrl(null);
        setStep('form');
      })
      .catch(() => {
        // Gagal load letter — biarkan user pilih template manual
      });
  }, [searchParams, templates]);

  // Debounce preview — generate PDF setiap formData berubah
  useEffect(() => {
    if (!selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoadingPreview(true);
      setPreviewError('');
      try {
        const res = await letterService.generatePreview({
          template_id: selected.id,
          data_surat: formData,
        });
        if (res.data?.success) {
          // Bug 1 fix: tambah #toolbar=0&navpanes=0 agar sidebar PDF viewer tidak muncul
          setPdfUrl(res.data.data.pdf_url + '?v=' + res.data.data.key + '#toolbar=0&navpanes=0');
        }
      } catch (err: any) {
        setPreviewError(err?.response?.data?.message ?? 'Gagal membuat pratinjau.');
        setPdfUrl(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 900);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selected, formData]);

  const selectTemplate = (tpl: Template) => {
    setSelected(tpl);
    const initial: Record<string, string> = {};
    tpl.variabel.forEach((v) => (initial[v] = ''));
    setFormData(initial);
    if (!editingLetterId) {
      setNomorSurat(`MOU/JUOS/${bulanRomawi[new Date().getMonth()]}/${new Date().getFullYear()}/${id !== null ? id + 1 : '001'}`);
    }
    setCsvMsg(null);
    setCsvFileName('');
    setCsvRows([]);
    setShowCsvPicker(false);
    setSubmitError('');
    setPdfUrl(null);
    setStep('form');
  };

  const handleFieldChange = (key: string, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvLoading(true);
    setCsvMsg(null);
    setShowCsvPicker(false);

    try {
      const text = await file.text();
      const { headers, rows } = parseCsvAllRows(text);

      if (rows.length === 0) {
        throw new Error('CSV tidak memiliki data. Minimal 1 baris header + 1 baris data.');
      }

      setCsvHeaders(headers);
      setCsvRows(rows);
      setShowCsvPicker(true);
      setCsvMsg({ type: 'success', text: `${rows.length} baris ditemukan. Pilih nomor data di bawah.` });
    } catch (err: any) {
      setCsvMsg({ type: 'error', text: err.message || 'Gagal membaca CSV.' });
    } finally {
      setCsvLoading(false);
      if (csvRef.current) csvRef.current.value = '';
    }
  };

  const handleSelectCsvRow = (index: number) => {
    const row = csvRows[index];
    if (!row) return;

    const matched: string[] = [];
    setFormData((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        if (row[k] !== undefined) {
          updated[k] = row[k];
          matched.push(k);
        }
      });
      return updated;
    });

    setCsvMsg({
      type: 'success',
      text: `Baris ${index + 1} berhasil diisi. Pilih baris lain atau tutup dengan ✕`,
    });
    // Bug 2 fix: JANGAN tutup picker — user bisa pilih baris lain tanpa harus buka ulang
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const empty = selected.variabel.filter((k) => !formData[k]?.trim());
    if (empty.length > 0) {
      setSubmitError(`Field belum diisi: ${empty.map(formatLabel).join(', ')}`);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      if (editingLetterId) {
        await letterService.update(editingLetterId, {
          template_id: selected.id,
          data_surat: formData,
          status: 'pending_approval',
        });
      } else {
        await letterService.create({ template_id: selected.id, data_surat: formData });
      }

      navigate('/letters');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const dbg = err?.response?.data?.debug;
      setSubmitError(dbg ? `${msg} — ${dbg}` : (msg ?? 'Gagal mengirim surat.'));
    } finally {
      setSubmitting(false);
    }
  };
  const handleDeleteTemplate = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await templateService.delete(deleteConfirmId);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch {
      // silent — template mungkin sudah dihapus
      setDeleteConfirmId(null);
    } finally {
      setDeleting(false);
    }
  };

  const now = new Date();
  const bulanRomawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  const nomorSuratValue = nomorSurat || `MOU/JUOS/${bulanRomawi[now.getMonth()]}/${now.getFullYear()}/${id !== null ? id + 1 : 0}`;

  // ====== STEP 1 ======
  if (step === 'template') {
    return (
      <PageShell step={1}>
        {loadingList && (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm">Memuat template...</span>
          </div>
        )}
        {!loadingList && listError && <ErrorAlert message={listError} />}
        {!loadingList && !listError && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText size={32} className="mb-3 text-gray-300" />
            <p className="text-sm">Belum ada template.</p>
            <button onClick={() => navigate('/dashboard/templates/new')} className="mt-3 text-xs text-emerald-600 hover:underline">
              Tambah template →
            </button>
          </div>
        )}
        {!loadingList && !listError && templates.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                <div className="h-24 bg-gray-50 border-b border-gray-100 flex items-center justify-center relative">
                  <FileText size={22} className="text-gray-300" />
                  <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                    {tpl.jenis_surat}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-800 truncate">{tpl.nama}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Tag size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{tpl.variabel.length} variabel</span>
                  </div>
                  {tpl.variabel.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tpl.variabel.slice(0, 2).map((v) => (
                        <span key={v} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                      ))}
                      {tpl.variabel.length > 2 && <span className="text-[10px] text-gray-400">+{tpl.variabel.length - 2}</span>}
                    </div>
                  )}
                  {/* Bug 4: tombol Gunakan + icon hapus */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => selectTemplate(tpl)}
                      className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                    >
                      Gunakan
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(tpl.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Hapus template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Bug 4: Konfirmasi hapus template */}
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Hapus Template?</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Template dan file DOCX-nya akan dihapus permanen.
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Tindakan ini tidak dapat dibatalkan. Surat yang sudah dibuat menggunakan template ini tidak terpengaruh.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteTemplate}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    );
  }

  // ====== STEP 2 — Bug 3: grid 2-col (50/50), hapus Isi Surat + Lampiran ======
  return (
    <PageShell step={2}>
      <button
        onClick={() => setStep('template')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors"
      >
        <ChevronLeft size={16} /> Ganti template
      </button>

      {/* Bug 3: grid-cols-2 → form kiri 50%, pratinjau kanan 50% */}
      <div className="grid grid-cols-2 gap-6">

        {/* ─── Kiri: Form ─── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Informasi Surat</h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Nomor Surat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nomor Surat <span className="text-gray-400 font-normal">(otomatis)</span>
              </label>
              <div className="flex items-center justify-between py-2.5 bg-gray-50">
                <span className="text-sm font-mono text-gray-700">{nomorSuratValue}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(nomorSuratValue);
                  }}
                  className="text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-1.5 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  title="Salin nomor surat"
                >
                  <FaCopy />
                </button>
              </div>
            </div>

            {/* Field dinamis dari template.variabel SAJA */}
            {selected?.variabel.length === 0 && (
              <p className="text-sm text-gray-400 italic">Template tidak memiliki variabel isian.</p>
            )}

            {selected?.variabel.map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{formatLabel(key)}</label>
                <input
                  type="text"
                  value={formData[key] ?? ''}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  placeholder={`Masukkan ${formatLabel(key).toLowerCase()}`}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-800 bg-white placeholder:text-gray-300"
                />
              </div>
            ))}

            {/* Tanggal + Jenis */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Surat</label>
                <input type="date" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-800 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis Surat</label>
                <div className="px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg bg-gray-50">{selected?.jenis_surat}</div>
              </div>
            </div>

            {/* Bug 3: Isi Surat dan Lampiran DIHAPUS — sudah ada di template DOCX */}

            {/* Alur Persetujuan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alur Persetujuan</label>
              <div className="flex items-center gap-2 px-3 py-3 border border-gray-200 rounded-lg bg-gray-50">
                {APPROVAL_FLOW.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-medium flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-xs text-gray-600 whitespace-nowrap">{s}</span>
                    </div>
                    {i < APPROVAL_FLOW.length - 1 && <ChevronLeft size={12} className="rotate-180 text-gray-300 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button onClick={() => setStep('template')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft size={14} /> Kembali
            </button>
            <div className="flex items-center gap-3">
              {submitError && <p className="text-xs text-red-500 max-w-[180px] text-right">{submitError}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {submitting ? 'Mengirim...' : 'Kirim untuk Disetujui'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Kanan: Pratinjau PDF + Import CSV ─── */}
        <div className="flex flex-col">
          {/* Header pratinjau */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pratinjau Surat</p>
            <div>
              <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              <button
                onClick={() => csvRef.current?.click()}
                disabled={csvLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors disabled:opacity-50"
              >
                {csvLoading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} className="text-emerald-600" />}
                {csvLoading ? 'Memproses...' : 'Import CSV'}
              </button>
            </div>
          </div>

          {csvFileName && <p className="text-xs text-gray-400 mb-2 truncate">File: {csvFileName}</p>}

          {csvMsg && (
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg mb-2 ${csvMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
              {csvMsg.type === 'success' ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
              <span>{csvMsg.text}</span>
            </div>
          )}

          {/* ─── CSV Row Picker ─── */}
          {showCsvPicker && csvRows.length > 0 && (
            <div className="mb-3 border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border-b border-emerald-100">
                <p className="text-xs font-semibold text-emerald-700">Pilih nomor data ({csvRows.length} baris)</p>
                <button onClick={() => setShowCsvPicker(false)}>
                  <X size={13} className="text-emerald-400 hover:text-emerald-700" />
                </button>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 bg-white">
                {csvRows.map((row, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectCsvRow(idx)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 text-left transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-gray-600 truncate flex-1">
                      {csvHeaders.slice(0, 3).map((h) => row[h] || '—').join(' · ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PDF Iframe — Bug 1: #toolbar=0&navpanes=0 sudah di-set di setPdfUrl */}
          <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white" style={{ height: '750px' }}>
            {loadingPreview && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-300 gap-3">
                <Loader2 size={22} className="animate-spin" />
                <p className="text-xs text-gray-400">Membuat pratinjau...</p>
              </div>
            )}
            {!loadingPreview && previewError && (
              <div className="p-5">
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-0.5">Pratinjau tidak tersedia</p>
                    <p>{previewError}</p>
                  </div>
                </div>
              </div>
            )}
            {!loadingPreview && !previewError && !pdfUrl && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-300">
                <FileText size={28} className="mb-2" />
                <p className="text-xs italic text-center px-4">Pratinjau PDF muncul setelah template dipilih</p>
              </div>
            )}
            {pdfUrl && !loadingPreview && (
              <iframe
                key={pdfUrl}
                src={pdfUrl}
                title="Pratinjau Surat"
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              />
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            PDF dirender via LibreOffice · Update 0.9 detik setelah input berubah
          </p>
        </div>

      </div>
    </PageShell>
  );
}

