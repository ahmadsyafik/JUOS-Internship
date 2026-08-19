import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Plus, Trash2, Loader2, Tag } from 'lucide-react';
import { templateService } from '../../../services/api';
import type { Template } from '../../../types';
import { Base, ScreenHeader, PageLoader, ErrorAlert, GreenButton } from '~/components/ui';

const JENIS_COLOR: Record<string, string> = {
  BAA: 'bg-blue-100 text-blue-700',
  SPK: 'bg-emerald-100 text-emerald-700',
  MOU: 'bg-purple-100 text-purple-700',
  KONTRAK: 'bg-amber-100 text-amber-700',
};

function jenisBadge(jenis: string) {
  return JENIS_COLOR[jenis.toUpperCase()] ?? 'bg-gray-100 text-gray-600';
}

export default function TemplatesPage() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    templateService.getAll()
      .then((res) => setTemplates(res.data.data ?? []))
      .catch(() => setError('Gagal memuat daftar template.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await templateService.delete(deleteConfirmId);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteConfirmId));
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <Base>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <ScreenHeader
          title="Template Surat"
          description="Kelola template surat yang tersedia untuk seluruh divisi."
        />
        <GreenButton onClick={() => navigate('/dashboard/templates/new')}>
          <Plus size={15} />
          Tambah Template
        </GreenButton>
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} /></div>}

      {!error && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 rounded-2xl text-center">
          <FileText size={40} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Belum ada template</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Klik "+ Tambah Template" untuk memulai.</p>
          <GreenButton onClick={() => navigate('/dashboard/templates/new')}>
            <Plus size={14} />
            Upload Template Pertama
          </GreenButton>
        </div>
      )}

      {templates.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
            >
              {/* Preview area */}
              <div className="h-28 bg-gray-50 border-b border-gray-100 flex items-center justify-center relative">
                <FileText size={22} className="text-gray-300" />
                <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md ${jenisBadge(tpl.jenis_surat)}`}>
                  {tpl.jenis_surat}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-sm font-medium text-gray-800 truncate">{tpl.nama}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Tag size={11} className="text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {tpl.variabel.length} variabel
                    {tpl.created_at && (
                      <> · {new Date(tpl.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}</>
                    )}
                  </span>
                </div>

                {tpl.variabel.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tpl.variabel.slice(0, 3).map((v) => (
                      <span key={v} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                    {tpl.variabel.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{tpl.variabel.length - 3} lagi</span>
                    )}
                  </div>
                )}

                {/* Actions — Bug 4: hapus edit icon, tambah working delete */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => navigate(`/letters/create/mou?template_id=${tpl.id}`)}
                    className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                  >
                    Gunakan
                  </button>
                  {/* Pencil/Edit icon DIHAPUS */}
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

      {/* Konfirmasi hapus */}
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
                  File DOCX dan data template akan dihapus permanen.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Tindakan ini tidak dapat dibatalkan. Surat yang sudah dibuat tidak terpengaruh.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
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
    </Base>
  );
}