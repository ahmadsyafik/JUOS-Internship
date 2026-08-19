// src/components/dashboard/StatCard.tsx
interface Props {
  label: string;
  value: number;
  sub?: string;
  subColor?: string;
}

export function StatCard({ label, value, sub, subColor = 'text-gray-400' }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      <p className="text-2xl font-medium text-gray-800">{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
    </div>
  );
}