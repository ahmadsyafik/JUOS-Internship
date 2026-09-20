import { useState } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/login', { email, password });
      const { token } = res.data;

      if (!token) {
        setError('Login gagal. Coba lagi.');
        return;
      }

      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Email atau kata sandi salah.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ─── Kiri: Branding ─── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#1a2744] p-12 text-white">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">PT. Jaringan Universal Online Solusindo</p>
            <p className="text-[11px] text-white/50">Sistem Penyuratan Digital Internal</p>
          </div>
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Kelola Surat<br />Perusahaan<br />
            <span className="text-amber-400">Lebih Efisien</span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Sistem pengelolaan surat digital PT. JUOS — dari pembuatan,
            persetujuan multi-tingkat, hingga pengarsipan otomatis.
          </p>
        </div>

        {/* Gaps */}
        <div>
        </div>
      </div>

      {/* ─── Kanan: Form ─── */}
      <div className="flex-1 flex items-center justify-center bg-white px-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">
            Selamat datang kembali
          </h2>
          <p className="text-sm text-gray-400 mb-8">
            Masuk ke Sistem Penyuratan Digital PT. JUOS
          </p>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="budi.santoso@aldm.co.id"
                autoComplete="email"
                className="w-full px-3 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-300 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kata Sandi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-3 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-300 transition"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a2744] text-white text-sm font-medium rounded-xl hover:bg-[#243561] disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Masuk...</>
              ) : (
                'Masuk'
              )}
            </button>

          </form>

          {/* Info */}
          <div className="mt-6 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Sistem internal — tidak tersedia untuk umum
            </p>
            <p className="text-xs text-blue-500 text-center mt-0.5">
              Hubungi Administrator IT jika Anda mengalami masalah login.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}