// src/routes/approval/index.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle,
  Eye,
  XCircle,
  Clock,
  Loader2,
  FileText,
  ChevronRight,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { letterService, userService } from '../../services/api';
import type { Letter } from '../../types';
import { ScreenHeader, Base } from '~/components/ui/';

const FILTERS = ['Semua', 'Hari Ini', 'Minggu Ini'] as const;

type FilterType = (typeof FILTERS)[number];
type ModalMode = 'signature' | 'reject' | null;
type RejectAction = 'revision' | 'permanent';

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getLetterTitle(letter: Letter) {
  return (
    letter.data_surat.hal ||
    letter.data_surat.perihal ||
    letter.data_surat.judul ||
    letter.data_surat.subjek ||
    letter.template?.nama ||
    letter.nomor_surat
  );
}

function getPriorityTag(letter: Letter) {
  const raw =
    letter.data_surat.prioritas ||
    letter.data_surat.priority ||
    letter.data_surat.mendesak ||
    letter.data_surat.urgent;
  if (!raw) return null;

  const normalized = String(raw).toLowerCase();
  if (normalized.includes('mendesak') || normalized.includes('urgent')) {
    return 'Mendesak';
  }

  return 'Prioritas';
}

// Modal untuk Approval (Signature form)
function ApprovalModal({
  letter,
  mode,
  onClose,
  onDone,
  onSuccess
}: {
  letter: Letter;
  mode: ModalMode;
  onClose: () => void;
  onDone: () => void;
  onSuccess: () => void;
}) {
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gambar' | 'upload'>('gambar');
  const [currentSignatureUrl, setCurrentSignatureUrl] = useState<string | null>(null);
  const [signatureLoading, setSignatureLoading] = useState(true);
  const [rejectAction, setRejectAction] = useState<RejectAction>('revision');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    let isMounted = true;
    setSignatureLoading(true);

    userService.getSignature()
      .then((res) => {
        const path = res.data?.data?.signature_path;
        if (isMounted && path) {
          setCurrentSignatureUrl(`/storage/${path}`);
        }
      })
      .catch(() => {
        if (isMounted) setCurrentSignatureUrl(null);
      })
      .finally(() => {
        if (isMounted) setSignatureLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isAllowed = allowedTypes.includes(file.type) || ['png', 'jpg', 'jpeg'].includes(extension ?? '');

    if (!isAllowed) {
      setSelectedFile(null);
      setUploadError('Format file tidak didukung. Pilih gambar PNG, JPG, atau JPEG.');
      event.target.value = '';
      return;
    }

    setUploadError('');
    setSelectedFile(file);
  };

  const handleApprove = async () => {
    setLoading(true);
    setError('');

    if (activeTab === 'upload' && !selectedFile) {
      setError('Pilih file tanda tangan sebelum menyetujui surat.');
      setLoading(false);
      return;
    }

    if (activeTab === 'gambar' && !currentSignatureUrl) {
      setError('Tanda tangan digital belum tersedia. Silakan upload terlebih dahulu.');
      setLoading(false);
      return;
    }

    try {
      if (activeTab === 'upload' && selectedFile) {
        await userService.uploadSignature(selectedFile);
      }

      await letterService.approve(letter.id, catatan);
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal mengesahkan surat. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!catatan.trim()) {
      setError('Alasan wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (rejectAction === 'revision') {
        await letterService.revise(letter.id, catatan);
      } else {
        await letterService.reject(letter.id, catatan);
      }
    } catch {
      setError('Gagal mengirim keputusan. Coba lagi.');
    } finally {
      onClose();
      onSuccess();
      setLoading(false);
    }
  };

  if (!mode) return null;

  const isReject = mode === 'reject';
  const actionLabel = rejectAction === 'revision' ? 'Minta Revisi' : 'Tolak Permanen';
  const actionDescription =
    rejectAction === 'revision'
      ? 'Surat dikembalikan untuk diperbaiki'
      : 'Surat ditolak dan tidak dilanjutkan';
  const primaryButtonText =
    rejectAction === 'revision' ? 'Kirim Feedback' : 'Tolak Surat';
  const primaryButtonClass =
    rejectAction === 'revision'
      ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200'
      : 'bg-red-500 hover:bg-red-600 disabled:bg-red-200';

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white ${isReject ? 'bg-red-500' : 'bg-emerald-500'
                }`}
            >
              {isReject ? <XCircle size={22} /> : <FileText size={22} />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isReject ? actionLabel : 'Tambahkan Tanda Tangan'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Surat yang disetujui:{' '}
                <span className="font-semibold text-slate-900">{letter.nomor_surat}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 transition hover:text-slate-700"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-6">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 mb-2">
              Surat yang ditinjau
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {letter.data_surat?.hal || letter.data_surat?.perihal || letter.nomor_surat}
            </p>
            <p className="text-sm text-slate-500 mt-1">{letter.nomor_surat}</p>
          </div>

          {isReject ? (
            <>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-3">Jenis Tindakan</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setRejectAction('revision')}
                  className={`rounded-3xl border px-4 py-5 text-left transition ${rejectAction === 'revision'
                    ? 'border-amber-300 bg-amber-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-3 text-amber-700">
                    <RotateCcw size={18} />
                    <span className="font-semibold">Minta Revisi</span>
                  </div>
                  <p className="text-sm text-slate-500">Surat dikembalikan untuk diperbaiki</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRejectAction('permanent')}
                  className={`rounded-[24px] border px-4 py-5 text-left transition ${rejectAction === 'permanent'
                    ? 'border-red-300 bg-red-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-3 text-red-600">
                    <XCircle size={18} />
                    <span className="font-semibold">Tolak Permanen</span>
                  </div>
                  <p className="text-sm text-slate-500">Surat ditolak dan tidak dilanjutkan</p>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-1 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('gambar')}
                  className={`rounded-[20px] py-3 text-sm font-semibold transition ${activeTab === 'gambar'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  Gambar TTD
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`rounded-[20px] py-3 text-sm font-semibold transition ${activeTab === 'upload'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  Upload Gambar
                </button>
              </div>
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 min-h-[180px] flex items-center justify-center text-center text-sm text-slate-400">
                {activeTab === 'gambar' ? (
                  signatureLoading ? (
                    'Memuat tanda tangan Anda...'
                  ) : currentSignatureUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                        <img
                          src={currentSignatureUrl}
                          alt="Tanda tangan yang tersimpan"
                          className="h-36 w-full object-contain"
                        />
                      </div>
                      <p className="text-sm text-slate-500">Tanda tangan ini akan digunakan saat surat disetujui.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">Tanda tangan belum tersedia.</p>
                      <p className="text-sm text-slate-500">Silakan unggah tanda tangan pada tab Upload Gambar sebelum mengonfirmasi approval.</p>
                    </div>
                  )
                ) : (
                  <div className="w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    {selectedFile ? (
                      <div className="space-y-3 text-left">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt="Preview tanda tangan"
                              className="h-48 w-full object-contain bg-slate-50"
                            />
                          ) : (
                            <div className="flex h-48 items-center justify-center bg-slate-50 text-sm text-slate-400">
                              Memuat preview...
                            </div>
                          )}
                          <div className="p-4">
                            <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'image/*'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600"
                        >
                          <Upload size={16} />
                          Pilih file lain
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                          <Upload size={20} className="text-slate-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700">Pilih file gambar tanda tangan</p>
                          <p className="mt-1 text-sm text-slate-400">Format yang didukung: PNG, JPG, JPEG</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Pilih File
                        </button>
                      </div>
                    )}

                    {uploadError && (
                      <p className="mt-3 text-sm text-red-600">{uploadError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900 mb-3">Posisi TTD pada Dokumen</p>
                <div className="flex gap-4 rounded-3xl border border-dashed border-emerald-300 bg-slate-50 p-4 items-center">
                  {activeTab === 'upload' && previewUrl && selectedFile ? (
                    <div className="min-w-[90px] h-20 rounded-2xl border border-slate-200 bg-white p-1">
                      <img
                        src={previewUrl}
                        alt="Preview tanda tangan pada dokumen"
                        className="h-full w-full rounded-xl object-contain"
                      />
                    </div>
                  ) : (
                    <div className="min-w-[80px] h-20 rounded-2xl bg-white border border-slate-200" />
                  )}
                  <p className="text-sm leading-6 text-slate-500">
                    TTD akan ditempatkan di blok tanda tangan bagian kanan bawah dokumen secara otomatis.
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-900">
              {isReject ? (rejectAction === 'revision' ? 'Catatan Revisi *' : 'Alasan Penolakan *') : 'Catatan Persetujuan'}
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={4}
              placeholder={
                isReject
                  ? rejectAction === 'revision'
                    ? 'Jelaskan bagian yang perlu direvisi...'
                    : 'Jelaskan alasan penolakan...'
                  : 'Tambahkan catatan jika diperlukan...'
              }
              className={`w-full min-h-[110px] rounded-3xl border px-4 py-3 text-sm text-slate-700 focus:ring-2 resize-none placeholder:text-slate-300 ${error ? 'border-red-200 bg-red-50 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-100'
                }`}
            />
          </div>

          {error && (
            <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 px-6 pb-6 md:flex-row">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            Batal
          </button>
          <button
            onClick={isReject ? handleReject : handleApprove}
            disabled={loading || (!isReject && ((activeTab === 'gambar' && !currentSignatureUrl && !signatureLoading) || (activeTab === 'upload' && !selectedFile)))}
            className={`w-full rounded-3xl px-4 py-3 text-sm font-semibold text-white transition ${isReject ? primaryButtonClass : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300'
              }`}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                {isReject ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    {rejectAction === 'revision' ? <RotateCcw size={16} /> : <XCircle size={16} />}
                    {primaryButtonText}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <CheckCircle size={16} />
                    Konfirmasi & Setujui
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Page
export default function ApprovalPage() {
  const navigate = useNavigate();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('Semua');

  const priorityLetters = useMemo(
    () => letters.filter((letter) => Boolean(getPriorityTag(letter))),
    [letters]
  );

  const filteredLetters = useMemo(() => {
    if (activeFilter === 'Semua') return letters;
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = now.getDay() || 7;
    startOfWeek.setDate(now.getDate() - (day - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return letters.filter((letter) => {
      const date = new Date(letter.created_at);
      if (activeFilter === 'Hari Ini') {
        return date.toDateString() === now.toDateString();
      }
      return date >= startOfWeek && date <= endOfWeek;
    });
  }, [activeFilter, letters]);

  const fetchPending = () => {
    setLoading(true);
    letterService
      .getAll({ status: 'pending_approval' })
      .then((res) => setLetters(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <Base>
      <div className="space-y-6">
        <ScreenHeader title="Approval Surat" description="Surat menunggu persetujuan Anda" />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm transition ${activeFilter === filter
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              {filteredLetters.length} surat ditampilkan
            </div>
          </div>

          {priorityLetters.length > 0 && (
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800">Surat Prioritas / Mendesak</p>
                  <p className="text-sm text-amber-700">Terdapat {priorityLetters.length} surat yang ditandai prioritas</p>
                </div>
                <div className="rounded-full bg-white px-3 py-2 text-xs font-medium text-amber-800 border border-amber-100">
                  {priorityLetters.length} prioritas aktif
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-sm">Memuat daftar surat...</span>
            </div>
          )}

          {!loading && filteredLetters.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tidak ada surat yang sesuai filter.</p>
            </div>
          )}

          {!loading && filteredLetters.length > 0 && (
            <div className="grid gap-4">
              {filteredLetters.map((letter) => {
                const priorityTag = getPriorityTag(letter);
                return (
                  <article
                    key={letter.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-300"
                  >
                    <div className="flex flex-col gap-4 lg:gap-6">
                      {/* Main Content */}
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        {/* Letter Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {priorityTag && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 border border-amber-200">
                                <Clock size={11} />
                                {priorityTag}
                              </span>
                            )}
                            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                              {letter.nomor_surat}
                            </span>
                          </div>
                          <h2 className="text-base font-semibold text-gray-900 line-clamp-2">
                            {getLetterTitle(letter)}
                          </h2>
                          <p className="mt-2 text-sm text-gray-500">
                            Diajukan oleh <span className="font-medium">{letter.creator?.nama ?? '—'}</span> · {formatDate(letter.created_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/letters/${letter.id}`)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 transition"
                            title="Lihat detail"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(letter);
                              setModalMode('signature');
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
                          >
                            <CheckCircle size={14} />
                            <span className="hidden sm:inline">Setujui</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(letter);
                              setModalMode('reject');
                            }}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition"
                            title="Tolak"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selected && modalMode && (
        <ApprovalModal
          letter={selected}
          mode={modalMode}
          onClose={() => {
            setSelected(null);
            setModalMode(null);
          }}
          onDone={() => {
            setSelected(null);
            setModalMode(null);
            navigate('/letters');
          }}
          onSuccess={fetchPending}
        />
      )}
    </Base>
  );
}
