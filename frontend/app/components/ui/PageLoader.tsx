// src/components/ui/PageLoader.tsx
import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <Loader2 size={20} className="animate-spin mr-2" />
      <span className="text-sm">Memuat...</span>
    </div>
  );
}