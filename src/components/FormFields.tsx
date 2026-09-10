import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

// Inputs com visual próprio via variáveis CSS (adaptável ao tema).
// Escuro: fundo azul-profundo com borda definida e glow ciano no foco.
// Claro: branco com borda suave e glow azul no foco.
const fieldBase =
  'w-full bg-[color:var(--input-bg)] border border-[color:var(--input-border)] rounded-xl px-3.5 py-2.5 text-[color:var(--input-text)] placeholder-[color:var(--input-placeholder)] shadow-sm ' +
  'focus:outline-none focus:border-[color:var(--input-focus-border)] focus:ring-2 focus:ring-[color:var(--input-focus-ring)] transition-all';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input className={`${fieldBase} ${className}`} {...props} />
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <select className={`${fieldBase} ${className} cursor-pointer`} {...props}>
        {children}
      </select>
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <textarea className={`${fieldBase} resize-none ${className}`} rows={3} {...props} />
    </div>
  );
}