import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router';
import { ChevronLeft, Loader2, Check } from 'lucide-react';
import { FaCopy } from 'react-icons/fa';
import { letterService, templateService } from '../../services/api';
import type { Template } from '../../types';
import {
  PageShell,
  TemplateSelector,
  TeamTable,
  DynamicFormField,
  PdfPreviewPane,
} from '~/components/letters';
import { useTeamTable } from '~/hooks/useTeamTable';
import { parseCsvAllRows } from '~/utils/csv';
import {
  APPROVAL_FLOW,
  PSB_SUBTYPES,
  BULAN_ROMAWI,
  formatLabel,
  isDateKey,
  isConditional,
  generateDefaultNomorSurat,
} from '~/utils/letterForm';

type Step = 'template' | 'form';

export default function MouTwoPage({ forcedJenisSurat }: { forcedJenisSurat?: string } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Prioritas jenis surat: prop > pathname > default
  const path = location.pathname;
  const jenisSurat: string =
    forcedJenisSurat
      ? forcedJenisSurat
      : path.includes('/surat-jalan')
      ? 'SURAT JALAN'
      : path.includes('/pkwt')
      ? 'PKWT'
      : path.includes('/psb')
      ? 'PSB'
      : 'MOU';

  const [step, setStep] = useState<Step>('template');

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState<Template | null>(null);

  // Form Data
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<Record<string, string>>({});
  const [id, setId] = useState<number | null>(null);
  const [nomorSurat, setNomorSurat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const editingLetterId = searchParams.get('letter_id')
    ? Number(searchParams.get('letter_id'))
    : null;

  // Tim Teknis (SPK) hook
  const hasTeamTable = Boolean(
    selected?.variabel.includes('nama') && selected?.variabel.includes('jabatan')
  );
  const {
    teamRows,
    setTeamRows,
    teamCsvRef,
    addRow: addTeamRow,
    removeRow: removeTeamRow,
    updateRow: updateTeamRow,
    handleCsvUpload: handleTeamCsvUpload,
    isTeamManagedKey,
  } = useTeamTable(hasTeamTable);

  // PDF Preview
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CSV Importer for entire form
  const csvRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showCsvPicker, setShowCsvPicker] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvMsg, setCsvMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inisialisasi saat route / jenisSurat berubah
  useEffect(() => {
    setStep('template');
    setSelected(null);
    setFormData({});
    setPdfUrl(null);
    setTeamRows([]);
    setCsvMsg(null);
    setNomorSurat(generateDefaultNomorSurat(jenisSurat, null));

    letterService.getAll().then((res) => {
      const firstId = res.data.data?.[0]?.id;
      if (firstId != null) setId(firstId);
    });

    setTemplates([]);
    setLoadingList(true);
    templateService
      .getAll()
      .then((res) => {
        const all: Template[] = res.data.data ?? [];
        setTemplates(
          all.filter((t) => {
            const js = t.jenis_surat.toUpperCase();
            if (jenisSurat === 'PSB') return PSB_SUBTYPES.includes(js);
            return js === jenisSurat;
          })
        );
      })
      .catch(() => setListError('Gagal memuat daftar template.'))
      .finally(() => setLoadingList(false));
  }, [jenisSurat]);

  // Load existing letter or template from URL query params
  useEffect(() => {
    const lid = searchParams.get('letter_id');
    if (!lid) {
      const tplId = searchParams.get('template_id');
      if (!tplId || !templates.length) return;

      const tpl = templates.find((item) => item.id === Number(tplId));
      if (!tpl) return;

      setSelected(tpl);
      setFormData(Object.fromEntries(tpl.variabel.map((v) => [v, isDateKey(v) ? today : ''])));
      setNomorSurat(generateDefaultNomorSurat(jenisSurat, id));
      setStep('form');
      return;
    }

    letterService
      .getById(Number(lid))
      .then((res) => {
        const letter = res.data.data ?? res.data;
        if (!letter) return;

        setSelected(letter.template ?? null);
        setFormData(letter.data_surat ?? {});
        setNomorSurat(letter.nomor_surat || '');

        if (letter.data_surat?.tim_nama_json && letter.data_surat?.tim_jabatan_json) {
          try {
            const names =
              typeof letter.data_surat.tim_nama_json === 'string'
                ? JSON.parse(letter.data_surat.tim_nama_json)
                : letter.data_surat.tim_nama_json;
            const jabatans =
              typeof letter.data_surat.tim_jabatan_json === 'string'
                ? JSON.parse(letter.data_surat.tim_jabatan_json)
                : letter.data_surat.tim_jabatan_json;

            if (Array.isArray(names) && Array.isArray(jabatans)) {
              const count = Math.min(names.length, jabatans.length);
              const rows = [];
              for (let i = 0; i < count; i++) {
                rows.push({ nama: names[i] || '', jabatan: jabatans[i] || '' });
              }
              if (rows.length > 0) setTeamRows(rows);
            }
          } catch (e) {
            console.error('Failed to parse team rows', e);
          }
        }

        setCsvMsg(null);
        setSubmitError('');
        setPdfUrl(null);
        setStep('form');
      })
      .catch(() => {});
  }, [searchParams, templates]);

  // Debounced PDF Preview
  useEffect(() => {
    if (!selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoadingPreview(true);
      setPreviewError('');
      try {
        const previewData = { ...formData };
        if (hasTeamTable && teamRows.length > 0) {
          const validTeamRows = teamRows.filter((r) => r.nama.trim() || r.jabatan.trim());
          if (validTeamRows.length > 0) {
            previewData['tim_nama_json'] = JSON.stringify(validTeamRows.map((r) => r.nama.trim()));
            previewData['tim_jabatan_json'] = JSON.stringify(
              validTeamRows.map((r) => r.jabatan.trim())
            );
            previewData['nama'] = validTeamRows[0].nama.trim();
            previewData['jabatan'] = validTeamRows[0].jabatan.trim();
          }
        }

        const res = await letterService.generatePreview({
          template_id: selected.id,
          data_surat: previewData,
        });

        if (res.data?.success) {
          setPdfUrl(res.data.data.pdf_url + '?v=' + res.data.data.key + '#toolbar=0&navpanes=0');
        }
      } catch (err: any) {
        setPreviewError(err?.response?.data?.message ?? 'Gagal membuat pratinjau.');
        setPdfUrl(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selected, formData, teamRows]);

  const selectTemplate = (tpl: Template) => {
    setSelected(tpl);
    const initial: Record<string, string> = {};
    tpl.variabel.forEach((v) => {
      initial[v] = isDateKey(v) ? today : '';
    });
    setFormData(initial);
    if (!editingLetterId) {
      setNomorSurat(generateDefaultNomorSurat(jenisSurat, id));
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

  const handleImageUpload = (key: string, base64: string) => {
    setImageFiles((prev) => ({ ...prev, [key]: base64 }));
  };

  // CSV Upload untuk form data
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
      setCsvMsg({
        type: 'success',
        text: `${rows.length} baris ditemukan. Pilih nomor data di bawah.`,
      });
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

    setFormData((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        if (row[k] !== undefined) {
          updated[k] = row[k];
        }
      });
      return updated;
    });

    setCsvMsg({
      type: 'success',
      text: `Baris ${index + 1} berhasil diisi. Pilih baris lain atau tutup dengan ✕`,
    });
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!selected) return;

    const validTeamRows = teamRows.filter((r) => r.nama.trim() || r.jabatan.trim());
    const teamHasData = validTeamRows.length > 0;

    if (hasTeamTable && !teamHasData) {
      setSubmitError('Tim teknis wajib diisi minimal 1 anggota.');
      return;
    }

    const TEAM_KEYS = ['nama', 'jabatan', 'no'];
    const OPTIONAL_FIELDS = ['npwp', 'lainnya'];

    const empty = selected.variabel.filter((k) => {
      if (teamHasData && TEAM_KEYS.includes(k)) return false;
      if (OPTIONAL_FIELDS.some((opt: string) => k.toLowerCase().includes(opt))) return false;
      if (isConditional(k, formData)) return false;
      return !formData[k]?.trim();
    });

    if (empty.length > 0) {
      setSubmitError(`Field belum diisi: ${empty.map(formatLabel).join(', ')}`);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const finalData = { ...formData };
    if (teamHasData) {
      finalData['tim_nama_json'] = JSON.stringify(validTeamRows.map((r) => r.nama.trim()));
      finalData['tim_jabatan_json'] = JSON.stringify(validTeamRows.map((r) => r.jabatan.trim()));
      if (validTeamRows[0]) {
        finalData['nama'] = validTeamRows[0].nama.trim();
        finalData['jabatan'] = validTeamRows[0].jabatan.trim();
      }
    }

    try {
      if (editingLetterId) {
        await letterService.update(editingLetterId, {
          template_id: selected.id,
          data_surat: finalData,
          status: 'pending_approval',
        });
      } else {
        await letterService.create({ template_id: selected.id, data_surat: finalData });
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

  const handleDeleteTemplate = async (deleteId: number) => {
    await templateService.delete(deleteId);
    setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
  };

  const nomorSuratValue =
    nomorSurat || `${jenisSurat}/JUOS/${BULAN_ROMAWI[now.getMonth()]}/${now.getFullYear()}/***`;

  // ====== STEP 1: Pilih Template ======
  if (step === 'template') {
    return (
      <PageShell step={1}>
        <TemplateSelector
          loading={loadingList}
          error={listError}
          templates={templates}
          onSelect={selectTemplate}
          onDelete={handleDeleteTemplate}
        />
      </PageShell>
    );
  }

  // ====== STEP 2: Pengisian Form & Pratinjau ======
  return (
    <PageShell step={2}>
      <button
        onClick={() => setStep('template')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors"
      >
        <ChevronLeft size={16} /> Ganti template
      </button>

      <div className="grid grid-cols-2 gap-6">
        {/* Kiri: Form Input */}
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
              <div className="flex items-center justify-between py-2.5 bg-gray-50 px-3 rounded-lg">
                <span className="text-sm font-mono text-gray-700">{nomorSuratValue}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(nomorSuratValue)}
                  className="text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-1.5 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  title="Salin nomor surat"
                >
                  <FaCopy />
                </button>
              </div>
            </div>

            {/* Template tanpa variabel */}
            {selected?.variabel.length === 0 && (
              <p className="text-sm text-gray-400 italic">
                Template tidak memiliki variabel isian.
              </p>
            )}

            {/* Tabel Tim Teknis (SPK) */}
            {hasTeamTable && (
              <TeamTable
                rows={teamRows}
                onAddRow={addTeamRow}
                onRemoveRow={removeTeamRow}
                onUpdateRow={updateTeamRow}
                onCsvUpload={handleTeamCsvUpload}
                csvInputRef={teamCsvRef}
              />
            )}

            {/* Field Dinamis Lainnya */}
            {selected?.variabel
              .filter((key) => !isTeamManagedKey(key) && !isConditional(key, formData))
              .map((key) => (
                <DynamicFormField
                  key={key}
                  fieldKey={key}
                  value={formData[key] ?? ''}
                  formData={formData}
                  imageFiles={imageFiles}
                  onChange={handleFieldChange}
                  onImageUpload={handleImageUpload}
                  today={today}
                />
              ))}

            {/* Jenis Surat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis Surat</label>
              <div className="px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg bg-gray-50">
                {selected?.jenis_surat}
              </div>
            </div>

            {/* Alur Persetujuan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alur Persetujuan
              </label>
              <div className="flex items-center gap-2 px-3 py-3 border border-gray-200 rounded-lg bg-gray-50">
                {APPROVAL_FLOW.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-medium flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs text-gray-600 whitespace-nowrap">{s}</span>
                    </div>
                    {i < APPROVAL_FLOW.length - 1 && (
                      <ChevronLeft size={12} className="rotate-180 text-gray-300 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => setStep('template')}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft size={14} /> Kembali
            </button>
            <div className="flex items-center gap-3">
              {submitError && (
                <p className="text-xs text-red-500 max-w-[200px] text-right">{submitError}</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {submitting ? 'Mengirim...' : 'Kirim untuk Disetujui'}
              </button>
            </div>
          </div>
        </div>

        {/* Kanan: Pratinjau PDF + CSV Importer */}
        <PdfPreviewPane
          pdfUrl={pdfUrl}
          loadingPreview={loadingPreview}
          previewError={previewError}
          csvFileName={csvFileName}
          csvLoading={csvLoading}
          csvMsg={csvMsg}
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          showCsvPicker={showCsvPicker}
          csvInputRef={csvRef}
          onCsvUpload={handleCsvUpload}
          onSelectCsvRow={handleSelectCsvRow}
          onCloseCsvPicker={() => setShowCsvPicker(false)}
        />
      </div>
    </PageShell>
  );
}
