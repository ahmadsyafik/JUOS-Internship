import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, CheckCircle, XCircle, Clock, SquarePen, Trash2, Loader2 } from 'lucide-react';
import { letterService } from '../../services/api';
import type { Letter } from '../../types';
import { Base, ScreenHeader } from '~/components/ui';
import LetterStatusBadge from '~/components/letters/LetterStatusBadge';

const SORT_OPTIONS = [
  { label: 'Terbaru', value: 'newest' },
  { label: 'Terlama', value: 'oldest' },
];

type FilterStatus = 'all' | 'revision' | 'approved' | 'rejected' | 'pending' | 'draft';

const FILTER_STATUS_OPTIONS: { label: string; value: FilterStatus }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Perlu Revisi', value: 'revision' },
  { label: 'Disetujui', value: 'approved' },
  { label: 'Ditolak', value: 'rejected' },
  { label: 'Menunggu', value: 'pending' },
  { label: 'Draft', value: 'draft' },
];

export default function IndexLetterPage() {
  const navigate = useNavigate();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteLetter = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await letterService.delete(deleteConfirmId);
      setLetters((prev) => prev.filter((l) => l.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menghapus surat.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const fetchLetters = () => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = {};
    if (filterStatus !== 'all') {
      // map frontend filter values to API status values
      params.status = filterStatus === 'pending' ? 'pending' : filterStatus === 'revision' ? 'revision' : filterStatus;
    }

    letterService
      .getAll(Object.keys(params).length ? params : undefined)
      .then((res) => setLetters(res.data.data))
      .catch(() => setError('Gagal memuat arsip surat. Coba lagi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  useEffect(() => {
    fetchLetters();
  }, [filterStatus]);

  const sortedLetters = useMemo(() => {
    return [...letters].sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? right - left : left - right;
    });
  }, [letters, sortBy]);

  return (
    <Base>
      <div className="space-y-6">
        <ScreenHeader
          title="Arsip Surat"
          description="Semua surat yang pernah dibuat, disetujui, ditolak, atau dikembalikan untuk revisi."
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Total surat</p>
              <p className="text-3xl font-semibold text-slate-900">{letters.length}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Filter:</span>
                <select
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-emerald-300"
                >
                  {FILTER_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as 'newest' | 'oldest')}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-emerald-300"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Memuat arsip surat...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        ) : sortedLetters.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Belum ada surat di arsip.
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedLetters.map((letter) => (
              <article key={letter.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 line-clamp-2">
                      {letter.data_surat?.hal || letter.data_surat?.perihal || letter.nomor_surat}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Dibuat oleh <span className="font-semibold text-slate-900">{letter.creator?.nama ?? '�'}</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      Dibuat pada {new Date(letter.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setDeleteConfirmId(letter.id);
                        setDeleteError(null);
                      }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Hapus surat"
                    >
                      <Trash2 size={14} />
                    </button>
                    {letter.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/letters/${letter.id}`)}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                      >
                        <CheckCircle size={16} /> Unduh
                      </button>
                    )}
                    {letter.status === 'rejected' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/letters/${letter.id}`)}
                        className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 transition"
                      >
                        <XCircle size={16} /> Ditolak
                      </button>
                    )}
                    {letter.status === 'pending_approval' && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                        <Clock size={16} /> Menunggu
                      </span>
                    )}
                    {letter.status === 'revision' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/letters/${letter.id}`)}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200 transition"
                      >
                        <SquarePen size={16} /> Revisi
                      </button>

                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Modal Konfirmasi Hapus Surat */}
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Hapus Surat?</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Surat dan file DOCX/PDF terkait akan dihapus permanen.
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Tindakan ini tidak dapat dibatalkan.
              </p>
              {deleteError && (
                <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                  {deleteError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteConfirmId(null);
                    setDeleteError(null);
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteLetter}
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
      </div>
    </Base>
  );
}
