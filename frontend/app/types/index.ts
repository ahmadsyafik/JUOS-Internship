export type Role = 'pembuat' | 'direktur' | 'admin';
export type LetterStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'revision';

export interface User {
  id: number;
  nama: string;
  email: string;
  role: Role;
  signature_path?: string;
}

export interface Template {
  id: number;
  nama: string;
  path_docx: string | null;
  jenis_surat: string;
  variabel: string[];
  raw_content?: string;     // ← teks plain dari docx untuk fallback preview
  is_active: boolean;
  created_by: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Letter {
  id: number;
  template_id: number;
  created_by: number;
  nomor_surat: string;
  data_surat: Record<string, string>;
  path_docx: string;
  path_pdf?: string;
  status: LetterStatus;
  catatan_reject?: string;
  created_at: string;
  updated_at: string;
  template?: Template;
  creator?: User;
  latest_approval?: Approval;
}

export interface Approval {
  id: number;
  letter_id: number;
  reviewed_by: number;
  status: 'approved' | 'rejected' | 'revision';
  catatan?: string;
  reviewed_at: string;
  reviewer?: User;
}