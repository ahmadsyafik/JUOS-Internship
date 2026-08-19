// src/components/dashboard/TemplateCard.tsx
import { useNavigate } from 'react-router';
import { FileText, ChevronRight } from 'lucide-react';
import type { Template } from '../../types';

interface Props {
  template: Template;
}

export function TemplateCard({ template }: Props) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/letters/create?template=${template.id}`)}
      className="group flex items-center gap-3 w-full bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
        <FileText size={16} className="text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{template.nama}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {template.variabel.length} field · {template.jenis_surat}
        </p>
      </div>
      <ChevronRight
        size={14}
        className="text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0"
      />
    </button>
  );
}