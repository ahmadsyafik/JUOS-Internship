// src/components/ui/ErrorAlert.tsx
import { AlertCircle } from 'lucide-react';

interface Props {
  message: string;
}

export function ErrorAlert({ message }: Props) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
      <AlertCircle size={15} className="shrink-0" />
      {message}
    </div>
  );
}