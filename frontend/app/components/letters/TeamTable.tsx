import React from 'react';
import { Upload, X } from 'lucide-react';
import type { TeamMember } from '../../hooks/useTeamTable';

interface TeamTableProps {
  rows: TeamMember[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, field: 'nama' | 'jabatan', value: string) => void;
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  csvInputRef: React.RefObject<HTMLInputElement | null>;
}

export function TeamTable({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onCsvUpload,
  csvInputRef,
}: TeamTableProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Tim Teknis
      </label>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* Header + import CSV */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
          <span className="text-xs text-gray-500">{rows.length} anggota tim</span>
          <div className="flex gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onCsvUpload}
            />
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
            >
              <Upload size={11} className="text-emerald-600" /> Import CSV Tim
            </button>
            <button
              type="button"
              onClick={onAddRow}
              className="text-xs px-2 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              + Tambah Baris
            </button>
          </div>
        </div>

        {/* Tabel */}
        {rows.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2 text-left text-gray-500 font-medium w-8">No</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Nama</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Jabatan</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-1.5 text-gray-400">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={row.nama}
                      onChange={(e) => onUpdateRow(idx, 'nama', e.target.value)}
                      placeholder="Nama anggota"
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-300 text-gray-800"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={row.jabatan}
                      onChange={(e) => onUpdateRow(idx, 'jabatan', e.target.value)}
                      placeholder="Jabatan"
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-300 text-gray-800"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => onRemoveRow(idx)}
                      className="text-gray-300 hover:text-red-400"
                      title="Hapus baris"
                    >
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            Import CSV atau tambah baris manual
          </div>
        )}
      </div>
    </div>
  );
}
