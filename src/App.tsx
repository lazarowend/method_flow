import { useState, useEffect } from 'react';
import { LayoutDashboard, Plus, History, BarChart3, Wallet, Menu, X, TrendingUp, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { OperationForm } from '@/views/OperationForm';
import { ExtraForm } from '@/views/ExtraForm';
import { Dashboard } from '@/views/Dashboard';
import { History as HistoryView } from '@/views/History';
import { Statistics } from '@/views/Statistics';
import { BankManagement } from '@/views/BankManagement';
import { useOperations } from '@/lib/useOperations';
import { useExtras } from '@/lib/useExtras';
import { useBank } from '@/lib/useBank';
import type { OperationInput, ExtraInput } from '@/lib/types';

type Tab = 'dashboard' | 'historico' | 'estatisticas' | 'banca';

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { id: 'banca', label: 'Banca', icon: Wallet },
];

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('dg-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
  const { operations, loading, insertOperation, updateOperation, deleteOperation, importOperations } = useOperations();
  const { extras, insertExtra, updateExtra, deleteExtra, importExtras } = useExtras();
  const { bank, updateBank } = useBank();

  // Aplica o tema no <html> e persiste
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dg-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Atalho de teclado: 'N' abre nova operação (exceto ao digitar em campos)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
      if (e.altKey || e.ctrlKey || e.metaKey || typing) return;
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowForm(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const bankInitial = bank?.initialValue ?? 0;

  const handleInsert = async (input: OperationInput) => {
    await insertOperation(input);
    setShowForm(false);
  };

  const handleInsertExtra = async (input: ExtraInput) => {
    await insertExtra(input);
    setShowExtras(false);
  };

  const navigate = (id: Tab) => {
    setTab(id);
    setMobileMenu(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[color:var(--sidebar-bg)] backdrop-blur-xl border-r border-[color:var(--sidebar-border)] flex flex-col transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileMenu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-[color:var(--sidebar-border)]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-glow">
            <TrendingUp size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold text-slate-100 tracking-tight">Duplo Green</h1>
            <p className="text-xs text-slate-500">Gestão de Operações</p>
          </div>
        </div>

        {/* Botão nova operação */}
        <div className="px-4 py-4">
          <Button onClick={() => { setShowForm(true); setMobileMenu(false); }} className="w-full">
            <Plus size={18} />
            Nova Operação
          </Button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => navigate(t.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-500/15 text-[color:var(--accent-strong)] border border-blue-500/30 shadow-glow'
                    : 'text-slate-500 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon size={18} />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-[color:var(--sidebar-border)] flex items-center justify-between">
          <p className="text-xs text-slate-500">Duplo Green · v1.0</p>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {mobileMenu && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileMenu(false)} />
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="sticky top-0 z-20 bg-[color:var(--sidebar-bg)] backdrop-blur-xl border-b border-[color:var(--sidebar-border)] lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-glow">
                <TrendingUp size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-base font-bold text-slate-100 tracking-tight">Duplo Green</h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800"
                aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => setMobileMenu(!mobileMenu)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800"
                aria-label="Menu"
              >
                {mobileMenu ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="animate-fade-in max-w-7xl mx-auto" key={tab}>
              {tab === 'dashboard' && <Dashboard operations={operations} extras={extras} bankInitial={bankInitial} />}
              {tab === 'historico' && (
                <HistoryView
                  operations={operations}
                  extras={extras}
                  onEdit={updateOperation}
                  onDelete={deleteOperation}
                  onEditExtra={updateExtra}
                  onDeleteExtra={deleteExtra}
                  onImportOperations={importOperations}
                  onImportExtras={importExtras}
                />
              )}
              {tab === 'estatisticas' && <Statistics operations={operations} bankInitial={bankInitial} />}
              {tab === 'banca' && (
                <BankManagement
                  bankInitial={bankInitial}
                  operations={operations}
                  onUpdateBank={updateBank}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal Nova Operação */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Operação">
        <OperationForm
          onSubmit={handleInsert}
          onCancel={() => setShowForm(false)}
          onOpenExtras={() => { setShowExtras(true); }}
        />
      </Modal>

      {/* Modal Extras */}
      <Modal open={showExtras} onClose={() => setShowExtras(false)} title="Registrar Extra">
        <ExtraForm onSubmit={handleInsertExtra} onCancel={() => setShowExtras(false)} />
      </Modal>
    </div>
  );
}

export default App;