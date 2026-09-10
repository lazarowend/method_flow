import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_18px_-4px_rgba(59,130,246,0.7)] hover:shadow-[0_6px_24px_-4px_rgba(59,130,246,0.8)] hover:-translate-y-px',
    secondary:
      'bg-slate-700/70 hover:bg-slate-600/70 text-slate-100 border border-slate-600/50',
    danger:
      'bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-600/30',
    ghost: 'hover:bg-slate-700/50 text-slate-300',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`rounded-lg font-medium transition-all duration-200 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}