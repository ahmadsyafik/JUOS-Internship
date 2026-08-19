// src/components/ui/SectionHeader.tsx
import { useNavigate } from 'react-router';

interface Props {
  title: string;
  linkLabel?: string;
  linkTo?: string;
}

export function SectionHeader({ title, linkLabel, linkTo }: Props) {
  const navigate = useNavigate();

  console.log("SectionHeader rendered with linkTo:", linkTo);

  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-medium text-gray-700">{title}</h2>
      {linkLabel && linkTo && (
        <button
          onClick={() => navigate(linkTo)}
          className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          {linkLabel} →
        </button>
      )}
    </div>
  );
}