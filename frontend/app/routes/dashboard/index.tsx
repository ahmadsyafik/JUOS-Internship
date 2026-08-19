// src/routes/dashboard/index.tsx
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { useDashboardStats } from '~/hooks/useDashboardStats'
import { StatCard, TemplateCard, RecentLettersTable } from '~/components/dashboard/';
import { SectionHeader, PageLoader, ErrorAlert, ScreenHeader, GreenButton } from '~/components/ui/';

function formatToday(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { stats, recentLetters, templates, loading, error } = useDashboardStats();

  if (loading) return <PageLoader />;

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <ScreenHeader title="Dashboard" description={formatToday()} />
        <GreenButton onClick={() => navigate('/dashboard/templates')} >
          <Plus size={15} />
          Buat surat baru
        </GreenButton>
      </div>

      {/* Error */}
      {error && <div className="mb-6"><ErrorAlert message={error} /></div>}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Total surat"
          value={stats.total}
          sub="Semua periode"
        />
        <StatCard
          label="Menunggu approval"
          value={stats.pending}
          sub={stats.pending > 0 ? 'Perlu ditinjau' : 'Semua selesai'}
          subColor={stats.pending > 0 ? 'text-amber-500' : 'text-gray-400'}
        />
        <StatCard
          label="Disetujui"
          value={stats.approved}
          sub="Siap dieksport"
          subColor="text-emerald-500"
        />
        <StatCard
          label="Ditolak"
          value={stats.rejected}
          sub="Perlu revisi"
        />
      </div>

      {/* Recent Letters */}
      <div className="mb-8">
        <SectionHeader
          title="Surat terbaru"
          linkLabel="Lihat semua"
          linkTo="/letters"
        />
        <RecentLettersTable letters={recentLetters} />
      </div>

      {/* Templates */}
      <div>
        <SectionHeader
          title="Template tersedia"
          linkLabel="Kelola template"
          linkTo="/dashboard/templates"
        />
        {templates.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada template. Hubungi admin.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}