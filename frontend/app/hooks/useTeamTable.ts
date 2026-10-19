import { useState, useRef } from 'react';
import { parseCsvAllRows } from '../utils/csv';

export interface TeamMember {
  nama: string;
  jabatan: string;
}

export function useTeamTable(hasTeamTable: boolean) {
  const [teamRows, setTeamRows] = useState<TeamMember[]>([]);
  const teamCsvRef = useRef<HTMLInputElement>(null);

  const addRow = () => {
    setTeamRows((prev) => [...prev, { nama: '', jabatan: '' }]);
  };

  const removeRow = (index: number) => {
    setTeamRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: 'nama' | 'jabatan', value: string) => {
    setTeamRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { headers, rows } = parseCsvAllRows(text);
      const namaCol = headers.find((h) => h.toLowerCase().includes('nama')) ?? headers[0];
      const jabatanCol = headers.find((h) => h.toLowerCase().includes('jabatan')) ?? headers[1];

      const team = rows
        .map((row) => ({
          nama: row[namaCol] ?? '',
          jabatan: row[jabatanCol] ?? '',
        }))
        .filter((r) => r.nama || r.jabatan);

      setTeamRows(team);
    } finally {
      if (teamCsvRef.current) teamCsvRef.current.value = '';
    }
  };

  const isTeamManagedKey = (key: string): boolean => {
    return hasTeamTable && (key === 'nama' || key === 'jabatan');
  };

  return {
    teamRows,
    setTeamRows,
    teamCsvRef,
    addRow,
    removeRow,
    updateRow,
    handleCsvUpload,
    isTeamManagedKey,
  };
}
