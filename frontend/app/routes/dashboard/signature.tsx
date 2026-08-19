import { useState, useRef, useEffect } from 'react';
import { Upload, X, ImageIcon, Check, Loader2, AlertCircle } from 'lucide-react';
import { userService } from '../../services/api';
import {Base, ScreenHeader} from '~/components/ui';

export default function SignaturePage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentUrl, setCurrentUrl]   = useState<string | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  const [newFile, setNewFile]         = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);

  const [uploading, setUploading]     = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');
  const [errorMsg, setErrorMsg]       = useState('');

  useEffect(() => {
    userService.getSignature()
      .then((res) => {
        // FIX P2: pakai signature_path dan prefix /storage/ agar melewati Vite proxy
        // signature_url dari backend adalah URL absolut (http://backend:8000/...)
        // yang tidak bisa diakses browser secara langsung
        const path = res.data?.data?.signature_path;
        if (path) {
          setCurrentUrl(`/storage/${path}`);
        }
      })
      .catch(() => {
        // 403 = non-direktur, 404/500 = belum ada — diam saja, cukup kosong
      })
      .finally(() => setLoadingCurrent(false));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setNewFile(f);
    setSuccessMsg('');
    setErrorMsg('');
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleRemove = () => {
    setNewFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = '';
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleUpload = async () => {
    if (!newFile) return;

    setUploading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await userService.uploadSignature(newFile);
      // FIX P2: sama — gunakan signature_path bukan signature_url
      const path = res.data?.data?.signature_path;
      if (path) {
        setCurrentUrl(`/storage/${path}`);
      }
      setSuccessMsg('Tanda tangan berhasil disimpan.');
      setNewFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message ?? 'Gagal menyimpan tanda tangan.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Base>
      <ScreenHeader
        title="Pengaturan Tanda Tangan"
        description="Upload gambar tanda tangan Direktur. Tanda tangan ini akan digunakan pada dokumen surat yang telah disetujui."
      />

      <div className="max-w-xl mt-6 space-y-6">

        {/* Tanda Tangan Saat Ini */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Tanda Tangan Aktif</p>

          {loadingCurrent ? (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Memuat...</span>
            </div>
          ) : currentUrl ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 inline-block">
              <img
                src={currentUrl}
                alt="Tanda tangan aktif"
                className="max-h-24 max-w-[240px] object-contain"
                onError={() => setCurrentUrl(null)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 py-4 text-gray-400">
              <ImageIcon size={18} className="text-gray-300" />
              <span className="text-sm">Belum ada tanda tangan yang diupload.</span>
            </div>
          )}
        </div>

        {/* Upload Tanda Tangan Baru */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">
            {currentUrl ? 'Ganti Tanda Tangan' : 'Upload Tanda Tangan'}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Format yang diterima: PNG, JPG, JPEG. Gunakan latar belakang transparan atau putih.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileSelect}
          />

          {!newFile ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors"
            >
              <Upload size={22} />
              <span className="text-sm">Klik untuk pilih gambar</span>
              <span className="text-xs text-gray-300">PNG, JPG, JPEG</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="relative border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex items-start gap-3">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-24 max-w-[200px] object-contain border border-gray-200 rounded bg-white p-1"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{newFile.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(newFile.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={handleRemove}
                      className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
                    >
                      <X size={12} /> Hapus
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {uploading ? (
                  <><Loader2 size={15} className="animate-spin" /> Menyimpan...</>
                ) : (
                  <><Check size={15} /> Simpan Tanda Tangan</>
                )}
              </button>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <Check size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-medium">Catatan:</span> Tanda tangan akan disisipkan otomatis
            pada placeholder{' '}
            <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">{'${tanda_tangan}'}</code>
            {' '}di dalam dokumen Word saat surat disetujui oleh Direktur.
          </p>
        </div>

      </div>
    </Base>
  );
}