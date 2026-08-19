// src/components/dashboard/RecentLettersTable.tsx
import { useNavigate } from 'react-router';
import LetterStatusBadge from '../letters/LetterStatusBadge';
import type { Letter } from '../../types';

interface Props {
  letters: Letter[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function RecentLettersTable({ letters }: Props) {
  const navigate = useNavigate();

  if (letters.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-10 text-center text-sm text-gray-400">
        Belum ada surat yang dibuat.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Nomor surat</th>
            <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Jenis</th>
            <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Pembuat</th>
            <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Tanggal</th>
            <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {letters.map((letter, i) => (
            <tr
              key={letter.id}
              className={`hover:bg-gray-50 transition-colors ${i < letters.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <td className="px-4 py-3 font-medium text-gray-800">{letter.nomor_surat}</td>
              <td className="px-4 py-3 text-gray-500">{letter.template?.jenis_surat ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{letter.creator?.nama ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{formatDate(letter.created_at)}</td>
              <td className="px-4 py-3">
                <LetterStatusBadge status={letter.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => navigate(`/letters/${letter.id}`)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                >
                  {letter.status === 'pending_approval' ? 'Review' : 'Lihat'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}