import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2, FileText, Tag, Trash2 } from 'lucide-react';
import type { Template } from '../../types';
import { ErrorAlert } from '~/components/ui';

interface TemplateSelectorProps {
  loading: boolean;
  error?: string;
  templates: Template[];
  onSelect: (tpl: Template) => void;
  onDelete: (id: number) => Promise<void>;
}

export function TemplateSelector({
  loading,
  error,
  templates,
  onSelect,
  onDelete,
}: TemplateSelectorProps) {
  const navigate = useNavigate();
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Memuat template...</span>
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FileText size={32} className="mb-3 text-gray-300" />
        <p className="text-sm">Belum ada template.</p>
        <button
          onClick={() => navigate('/dashboard/templates/new')}
          className="mt-3 text-xs text-emerald-600 hover:underline"
        >
          Tambah template →
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
          >
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
                    <span
                      key={v}
                      className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                  {tpl.variabel.length > 2 && (
                    <span className="text-[10px] text-gray-400">+{tpl.variabel.length - 2}</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => onSelect(tpl)}
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
    </>
  );
}
