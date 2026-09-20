import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Upload, X, FileText, ChevronLeft, Loader2 } from 'lucide-react';
import api, { templateService } from '../../../services/api';
import { ChevronButton, GreenButton } from '~/components/ui';
import { WhiteButton } from '~/components/ui/WhiteButton';

// 4 kategori utama sesuai kebutuhan operasional
// PSB mencakup sub-dokumen: Kontrak Berlangganan, Berita Acara Aktivasi
const JENIS_OPTIONS = ['MOU', 'PSB', 'SURAT JALAN', 'PKWT'];

export default function NewTemplatePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nama, setNama] = useState('');
  const [jenisSurat, setJenisSurat] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [docxVars, setDocxVars] = useState<string[]>([]);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Bug 4: upload ke backend → LibreOffice convert → PDF URL + variabel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setDocxVars([]);
    setPdfPreviewUrl(null);
    setReading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('file_docx', f);

      const res = await api.post('/templates/preview-upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setDocxVars(res.data.data.variabel ?? []);
        if (res.data.data.pdf_url) {
          setPdfPreviewUrl(res.data.data.pdf_url + '?v=' + Date.now() + '#toolbar=0&navpanes=0');
        }
      }
    } catch {
      setError('Gagal membaca file DOCX. Pastikan file tidak corrupt.');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setReading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setDocxVars([]);
    setPdfPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!nama.trim()) { setError('Nama template wajib diisi.'); return; }
    if (!jenisSurat) { setError('Kategori wajib dipilih.'); return; }
    if (!file) { setError('File DOCX wajib diupload.'); return; }

    setSubmitting(true);
    setError('');

    const form = new FormData();
    form.append('nama', nama.trim());
    form.append('jenis_surat', jenisSurat);
    form.append('file_docx', file);

    try {
      await templateService.create(form);
      navigate('/dashboard/templates');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan template.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-start bg-gray-50 min-h-full">

      {/* ─── Kiri: Form ─── */}
      <div className="flex-1 p-8">
        <ChevronButton onClick={() => navigate('/dashboard/templates')}>
          <ChevronLeft size={13} /> Kembali ke Template
        </ChevronButton>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Tambah Template</h1>
            <p className="text-xs text-gray-400 mt-1">Dashboard › Template › Tambah Template</p>
          </div>
          <div className="flex gap-2">
            <WhiteButton onClick={() => navigate('/dashboard/templates')}>
              Batal
            </WhiteButton>
            <GreenButton onClick={handleSubmit} disabled={submitting || reading}>
              {submitting ? 'Menyimpan' : 'Simpan Template'}
            </GreenButton>
          </div>
        </div>

        {error && <div className="mb-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

        <div className="max-w-lg space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Template</label>
            <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: MOU Peserta Training" className="w-full px-3 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
            <select value={jenisSurat} onChange={(e) => setJenisSurat(e.target.value)} className="w-full px-3 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300">
              <option value="">Pilih kategori...</option>
              {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Upload File DOCX <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Gunakan <code className="bg-gray-100 px-1 rounded font-mono text-[11px]">{'{{nama_variabel}}'}</code> sebagai placeholder.
            </p>
            <input ref={fileRef} type="file" accept=".docx" onChange={handleFileChange} className="hidden" />
            {file ? (
              <div className="flex items-center gap-3 px-4 py-3 border border-emerald-200 bg-emerald-50 rounded-xl">
                {reading ? <Loader2 size={16} className="text-emerald-500 animate-spin shrink-0" /> : <FileText size={16} className="text-emerald-600 shrink-0" />}
                <span className="text-sm text-emerald-700 flex-1 truncate">{file.name}</span>
                <button onClick={handleRemove}><X size={14} className="text-emerald-500 hover:text-emerald-700" /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full flex flex-col items-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors">
                <Upload size={22} />
                <span className="text-xs">Klik untuk upload file .docx</span>
              </button>
            )}
          </div>

          {reading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <Loader2 size={13} className="animate-spin shrink-0 text-blue-500" />
              Mengkonversi DOCX → PDF via LibreOffice...
            </div>
          )}

          {docxVars.length > 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <p className="text-xs font-medium text-emerald-700 mb-2">{docxVars.length} variabel terdeteksi:</p>
              <div className="flex flex-wrap gap-1.5">
                {docxVars.map((v) => (
                  <span key={v} className="text-[11px] bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">{`{{${v}}}`}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Kanan: Pratinjau LibreOffice PDF ─── */}
      <div className="w-96 sticky top-0 h-screen overflow-y-auto border-l border-gray-200 bg-white shrink-0">
        <div className="p-6 h-full flex flex-col">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Pratinjau</p>
          <p className="text-[11px] text-gray-400 mb-4">Render via LibreOffice — layout persis seperti Word.</p>

          <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-gray-50" style={{ minHeight: '500px' }}>
            {reading && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
                <Loader2 size={18} className="animate-spin" />
                <p className="text-xs">Memproses file...</p>
              </div>
            )}
            {!reading && pdfPreviewUrl && (
              <iframe
                key={pdfPreviewUrl}
                src={pdfPreviewUrl}
                title="Preview Template"
                style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none', display: 'block' }}
              />
            )}
            {!reading && !pdfPreviewUrl && (
              <div className="flex flex-col items-center justify-center h-full py-16 text-gray-300">
                <FileText size={28} className="mb-2" />
                <p className="text-xs italic text-center px-4">Upload file .docx untuk melihat pratinjau</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}