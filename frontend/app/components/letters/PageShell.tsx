import { Check } from "lucide-react";
import { useNavigate } from "react-router";
import { Base } from '~/components/ui';

export function PageShell({ step, children }: { step: 1 | 2 | 3; children: React.ReactNode }) {
    const navigate = useNavigate();
    const steps = [
        { n: 1, label: 'Pilih Template' },
        { n: 2, label: 'Isi Konten' },
        { n: 3, label: 'Review & Kirim' },
    ];
    return (
        <Base>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                <button onClick={() => navigate('/dashboard')} className="hover:text-gray-600">Dashboard</button>
                <span>›</span><span>Buat Surat Baru</span>
                {step > 1 && <><span>›</span><span className="text-gray-600">{steps[step - 1].label}</span></>}
            </div>
            <h1 className="text-xl font-semibold text-gray-800 mb-6">Buat Surat Baru</h1>
            <div className="flex items-center mb-8">
                {steps.map((s, i) => (
                    <div key={s.n} className="flex items-center flex-1 last:flex-none">
                        <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${s.n < step ? 'bg-emerald-500 text-white' : s.n === step ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {s.n < step ? <Check size={13} /> : s.n}
                            </span>
                            <span className={`text-sm whitespace-nowrap ${s.n === step ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{s.label}</span>
                        </div>
                        {i < steps.length - 1 && <div className={`flex-1 h-px mx-3 ${s.n < step ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
                    </div>
                ))}
            </div>
            {children}
        </Base>
    );
}