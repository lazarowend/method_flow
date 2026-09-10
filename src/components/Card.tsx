import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Variante de cor: aplica borda colorida + glow sutil */
  tone?: 'default' | 'blue' | 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald';
}

const toneMap: Record<NonNullable<CardProps['tone']>, string> = {
  default: 'bg-slate-800/70 border-slate-600/40',
  blue: 'bg-blue-500/10 border-blue-500/30 shadow-glow',
  cyan: 'bg-cyan-500/10 border-cyan-500/30 shadow-glow-cyan',
  violet: 'bg-violet-500/10 border-violet-500/30 shadow-glow-violet',
  amber: 'bg-amber-500/10 border-amber-500/30 shadow-glow-amber',
  rose: 'bg-rose-500/10 border-rose-500/30 shadow-glow-rose',
  emerald: 'bg-emerald-500/10 border-emerald-500/30 shadow-glow-emerald',
};

export function Card({ children, className = '', tone = 'default' }: CardProps) {
  return (
    <div
      className={`rounded-2xl backdrop-blur-sm border shadow-card transition-all ${toneMap[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  variant?: 'default' | 'profit' | 'loss' | 'neutral';
  /** Cor de acento do ícone/chip */
  accent?: 'blue' | 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald';
  icon?: ReactNode;
}

const accentText: Record<NonNullable<StatCardProps['accent']>, string> = {
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
  violet: 'text-violet-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  emerald: 'text-emerald-400',
};

const accentBg: Record<NonNullable<StatCardProps['accent']>, string> = {
  blue: 'bg-blue-500/15',
  cyan: 'bg-cyan-500/15',
  violet: 'bg-violet-500/15',
  amber: 'bg-amber-500/15',
  rose: 'bg-rose-500/15',
  emerald: 'bg-emerald-500/15',
};

export function StatCard({
  label,
  value,
  sublabel,
  variant = 'default',
  accent = 'blue',
  icon,
}: StatCardProps) {
  const colorMap = {
    default: 'text-slate-100',
    profit: 'text-emerald-400',
    loss: 'text-rose-400',
    neutral: 'text-cyan-300',
  };

  return (
    <Card className="p-5 hover:border-slate-500/50 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold mt-2 tracking-tight ${colorMap[variant]}`}>{value}</p>
          {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}
        </div>
        {icon && (
          <div className={`ml-3 p-2.5 rounded-xl shrink-0 ${accentBg[accent]} ${accentText[accent]}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}