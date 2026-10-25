import { useEffect, useState } from 'react';
import { Menu, Play, Sparkles } from 'lucide-react';
import { api, type SystemHealth } from '../../lib/api';

interface TopBarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  onRunQuickDemo: () => void;
  onNewExperiment: () => void;
  activeExperimentId?: string;
  isSimulating: boolean;
}

export const AppTopBar = ({
  mobileMenuOpen,
  setMobileMenuOpen,
  onRunQuickDemo,
  onNewExperiment,
  isSimulating,
}: TopBarProps) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch(() => {});
    const timer = setInterval(() => {
      api.getHealth().then(setHealth).catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-0 right-0 left-0 md:left-64 z-30 bg-ivory border-b border-copper/15 h-14 flex items-center px-4 md:px-6 justify-between transition-all">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="cursor-pointer md:hidden p-1.5 -ml-1 text-burgundy hover:text-copper transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>

        {/* Breadcrumb info */}
        <div className="font-mono text-xs text-burgundy/60 flex items-center gap-2 sm:gap-3 truncate">
          <span className="truncate">
            <span className="hidden sm:inline">Workspace: </span>
            <strong className="text-burgundy">ShopSphere Prod</strong>
          </span>
          <span className="text-copper/40">|</span>
          <span className="hidden md:flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${health?.database?.connected ? 'bg-emerald-600' : 'bg-amber-600'} inline-block`} />
            <span className="text-[11px] text-burgundy/70">
              DB: <strong className="text-burgundy">{health?.database?.connected ? 'MongoDB Online' : 'MongoDB Offline'}</strong>
            </span>
          </span>
          <span className="text-copper/40 hidden md:inline">|</span>
          <span className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${isSimulating ? 'bg-copper animate-ping' : 'bg-emerald-600'} inline-block`} />
            <strong className={isSimulating ? 'text-copper font-bold' : 'text-emerald-700'}>
              {isSimulating ? 'SIMULATION IN PROGRESS' : 'ENGINE READY'}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* 1-Click College Review Demo Button */}
        <button
          onClick={onRunQuickDemo}
          disabled={isSimulating}
          className="cursor-pointer flex items-center gap-1.5 bg-copper text-ivory px-3 sm:px-4 py-1.5 text-xs font-mono font-bold hover:bg-copper-dark transition-all rounded shadow-sm disabled:opacity-50"
          title="Runs the full 10-scenario ShopSphere test suite including API failure recovery"
        >
          <Sparkles size={13} className="animate-pulse" />
          <span className="hidden sm:inline">1-Click College Demo</span>
          <span className="sm:hidden">Demo</span>
        </button>

        {/* New Experiment Button */}
        <button
          onClick={onNewExperiment}
          className="cursor-pointer flex items-center gap-1 bg-burgundy text-ivory px-3 sm:px-3.5 py-1.5 text-xs font-sans font-semibold hover:bg-burgundy-light transition-colors rounded"
        >
          <Play size={12} />
          <span className="hidden sm:inline">New Experiment</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </div>
  );
};
