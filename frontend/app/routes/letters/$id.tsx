import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronLeft, Printer, Download, FileText,
  CheckCircle2, Loader2, AlertCircle, Pencil,
} from 'lucide-react';
import { letterService } from '../../services/api';
import type { Letter } from '../../types';
import { Base } from '~/components/ui';

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending_approval: { label: 'Menunggu Persetujuan', className: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Disetujui', className: 'bg-emerald-100 text-emerald-700' },
    revision_required: { label: 'Perlu Revisi', className: 'bg-amber-500 text-white' },
    rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-600' },
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  };
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.className}`}>{s.label}</span>;
}

function ApprovalStep({
  n, title, name, sub, status,
}: {
  n: number; title: string; name?: string; sub?: string; status: 'done' | 'current' | 'pending';
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${status === 'done' ? 'bg-emerald-500 text-white' :
        status === 'current' ? 'bg-amber-400 text-white' :
          'bg-gray-100 text-gray-400'
        }`}>
        {status === 'done' ? <CheckCircle2 size={14} /> : n}
      </div>
      <div>
        <p className={`text-sm font-medium ${status === 'pending' ? 'text-gray-400' : 'text-gray-700'}`}>{title}</p>
        {name && <p className="text-xs text-gray-500 mt-0.5">{name}</p>}
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
        <p className={`text-xs mt-0.5 ${status === 'done' ? 'text-emerald-500' :
          status === 'current' ? 'text-amber-500' :
            'text-gray-300'
          }`}>
          {status === 'done' ? 'Selesai' : status === 'current' ? 'Menunggu tindakan' : 'Belum dimulai'}
        </p>
      </div>
    </div>
  );
}

export default function LetterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [letter, setLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');

  const pdfViewUrl = id ? `/api/letters/${id}/pdf-view#toolbar=0&navpanes=0` : null;

  useEffect(() => {
    if (!id) return;
    letterService.getById(Number(id))
      .then((res) => setLetter(res.data.data ?? res.data))
      .catch((err) => {
        const status = err?.response?.status;
        setError(
          status === 401 ? 'Akses tidak sah. Silakan login ulang.' :
            status === 403 ? 'Anda tidak memiliki izin melihat surat ini.' :
              status === 404 ? 'Surat tidak ditemukan.' :
                'Gagal memuat detail surat.'
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Bug 3 fix: PDF via pdf-view (no auth needed, auto-convert)
  const handleExportPdf = () => {
    setExportError('');
    window.open(`/api/letters/${letter!.id}/pdf-view`, '_blank');
  };

  // Bug 3 fix: DOCX via direct storage URL (publicly accessible via /storage/ proxy)
  const handleExportDocx = () => {
    setExportError('');
    if (!letter?.path_docx) {
      setExportError('File DOCX tidak tersedia.');
      return;
    }
    const a = document.createElement('a');
    a.href = `/storage/${letter.path_docx}`;
    a.download = `${letter.nomor_surat ?? 'surat'}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <Base>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Memuat surat...</span>
        </div>
      </Base>
    );
  }

  if (error) {
    return (
      <Base>
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft size={14} /> Kembali
        </button>
      </Base>
    );
  }

  if (!letter) return null;

  const isApproved = letter.status === 'approved';
  const isRejected = letter.status === 'rejected';
  const isRevision = letter.status === 'revision';

  const approvalStatus = (idx: number): 'done' | 'current' | 'pending' => {
    if (isApproved) return 'done';
    if (isRejected) return idx === 0 ? 'done' : idx === 1 ? 'current' : 'pending';
    if (letter.status === 'pending_approval') return idx === 0 ? 'done' : idx === 1 ? 'current' : 'pending';
    return 'pending';
  };

  return (
    <Base>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        <button onClick={() => navigate('/dashboard')} className="hover:text-gray-600">Dashboard</button>
        <span>›</span>
        <button onClick={() => navigate('/letters')} className="hover:text-gray-600">Surat Keluar</button>
        <span>›</span>
        <span className="text-gray-600">Detail Surat</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Detail Surat</h1>
        <div className="flex items-center gap-2 flex-wrap">

          {/* Bug 1 fix: tombol Edit Surat jika status rejected */}
          {isRevision && (
            <button
              onClick={() => navigate(
                `/letters/create/mou?template_id=${letter.template_id}&letter_id=${letter.id}`
              )}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
            >
              <Pencil size={14} /> Edit & Kirim Ulang
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Printer size={14} /> Cetak
          </button>

          {/* Bug 3 fix: PDF — buka pdf-view di tab baru (auto-convert, no auth) */}
          <button
            onClick={handleExportPdf}
            disabled={!isApproved}
            title={!isApproved ? 'Hanya tersedia setelah disetujui' : 'Unduh PDF'}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={14} /> Unduh PDF
          </button>

          {/* Bug 3 fix: DOCX — direct /storage/ URL */}
          <button
            onClick={handleExportDocx}
            disabled={!isApproved}
            title={!isApproved ? 'Hanya tersedia setelah disetujui' : 'Unduh DOCX'}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FileText size={14} /> DOCX
          </button>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={14} /> Kembali
          </button>
        </div>
      </div>

      {exportError && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Catatan revisi jika rejected */}
      {!isApproved && letter.latest_approval?.catatan && (
        <div className="mb-5 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-0.5">Catatan dari Reviewer:</p>
            <p>{letter.latest_approval.catatan}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">

        {/* Kiri: PDF Preview */}
        <div className="col-span-2">
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white" style={{ height: '750px' }}>
            {pdfViewUrl ? (
              <iframe
                src={pdfViewUrl}
                title="Isi Surat"
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-300">
                <p className="text-sm">Preview tidak tersedia</p>
              </div>
            )}
          </div>
        </div>

        {/* Kanan: Info + Data Isian + Alur */}
        <div className="space-y-5">

          {/* Informasi Surat */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Informasi Surat</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-400">Status</span>
                {statusBadge(letter.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Nomor</span>
                <span className="text-xs font-mono text-gray-700">{letter.nomor_surat ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Jenis</span>
                <span className="text-xs text-gray-700">{letter.template?.jenis_surat ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Template</span>
                <span className="text-xs text-gray-700">{letter.template?.nama ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Pembuat</span>
                <span className="text-xs text-gray-700">{letter.creator?.nama ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Tanggal</span>
                <span className="text-xs text-gray-700">
                  {letter.created_at
                    ? new Date(letter.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Data Isian */}
          {letter.data_surat && Object.keys(letter.data_surat).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Data Isian</h3>
              <div className="space-y-2">
                {Object.entries(letter.data_surat).map(([key, val]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-xs text-gray-400 w-28 shrink-0 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-700 flex-1 break-words">{String(val) || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alur Persetujuan */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Alur Persetujuan</h3>
            <div className="space-y-4">
              {[
                { title: 'Admin Tata Usaha', name: letter.creator?.nama },
                { title: 'Kepala Departemen', name: letter.latest_approval?.reviewer?.nama },
                { title: 'Direktur' },
              ].map((s, i) => (
                <ApprovalStep
                  key={i}
                  n={i + 1}
                  title={s.title}
                  name={s.name}
                  status={approvalStatus(i)}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </Base>
  );
}