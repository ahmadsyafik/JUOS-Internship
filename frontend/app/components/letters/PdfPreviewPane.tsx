import React from 'react';
import { Upload, Loader2, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface PdfPreviewPaneProps {
  pdfUrl: string | null;
  loadingPreview: boolean;
  previewError: string;
  csvFileName: string;
  csvLoading: boolean;
  csvMsg: { type: 'success' | 'error'; text: string } | null;
  csvRows: Record<string, string>[];
  csvHeaders: string[];
  showCsvPicker: boolean;
  csvInputRef: React.RefObject<HTMLInputElement | null>;
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectCsvRow: (index: number) => void;
  onCloseCsvPicker: () => void;
}

export function PdfPreviewPane({
  pdfUrl,
  loadingPreview,
  previewError,
  csvFileName,
  csvLoading,
  csvMsg,
  csvRows,
  csvHeaders,
  showCsvPicker,
  csvInputRef,
  onCsvUpload,
  onSelectCsvRow,
  onCloseCsvPicker,
}: PdfPreviewPaneProps) {
  return (
    <div className="flex flex-col">
      {/* Header pratinjau */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Pratinjau Surat
        </p>
        <div>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onCsvUpload}
          />
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={csvLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors disabled:opacity-50"
          >
            {csvLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} className="text-emerald-600" />
            )}
            {csvLoading ? 'Memproses...' : 'Import CSV'}
          </button>
        </div>
      </div>

      {csvFileName && (
        <p className="text-xs text-gray-400 mb-2 truncate">File: {csvFileName}</p>
      )}

      {csvMsg && (
        <div
          className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg mb-2 ${
            csvMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-red-50 text-red-600 border border-red-100'
          }`}
        >
          {csvMsg.type === 'success' ? (
            <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
          )}
          <span>{csvMsg.text}</span>
        </div>
      )}

      {/* CSV Row Picker */}
      {showCsvPicker && csvRows.length > 0 && (
        <div className="mb-3 border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border-b border-emerald-100">
            <p className="text-xs font-semibold text-emerald-700">
              Pilih nomor data ({csvRows.length} baris)
            </p>
            <button onClick={onCloseCsvPicker}>
              <X size={13} className="text-emerald-400 hover:text-emerald-700" />
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 bg-white">
            {csvRows.map((row, idx) => (
              <button
                key={idx}
                onClick={() => onSelectCsvRow(idx)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 text-left transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs text-gray-600 truncate flex-1">
                  {csvHeaders.slice(0, 3).map((h) => row[h] || '—').join(' · ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDF Iframe */}
      <div
        className="flex-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white"
        style={{ height: '750px' }}
      >
        {loadingPreview && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-gray-300 gap-3">
            <Loader2 size={22} className="animate-spin" />
            <p className="text-xs text-gray-400">Membuat pratinjau...</p>
          </div>
        )}
        {!loadingPreview && previewError && (
          <div className="p-5">
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-0.5">Pratinjau tidak tersedia</p>
                <p>{previewError}</p>
              </div>
            </div>
          </div>
        )}
        {!loadingPreview && !previewError && !pdfUrl && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-gray-300">
            <FileText size={28} className="mb-2" />
            <p className="text-xs italic text-center px-4">
              Pratinjau PDF muncul setelah template dipilih
            </p>
          </div>
        )}
        {pdfUrl && !loadingPreview && (
          <iframe
            key={pdfUrl}
            src={pdfUrl}
            title="Pratinjau Surat"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        )}
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        PDF dirender via LibreOffice · Update 0.9 detik setelah input berubah
      </p>
    </div>
  );
}
