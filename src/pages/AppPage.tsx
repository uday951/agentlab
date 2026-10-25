import { useState, useEffect } from 'react';
import { AppSidebar } from '../components/app/AppSidebar';
import { AppTopBar } from '../components/app/AppTopBar';
import { OverviewPanel } from '../components/app/OverviewPanel';
import { AgentBuilder } from '../components/app/AgentBuilder';
import { EnvironmentBuilder } from '../components/app/EnvironmentBuilder';
import { ExperimentCreator } from '../components/app/ExperimentCreator';
import { SimulationCenter } from '../components/app/SimulationCenter';
import { ResultsView } from '../components/app/ResultsView';
import { KnowledgeView } from '../components/app/KnowledgeView';
import { SettingsView } from '../components/app/SettingsView';
import { api, type SystemHealth } from '../lib/api';
import { AlertTriangle, Database } from 'lucide-react';

export default function AppPage() {
  const [active, setActive] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) return tabParam;
    }
    return 'overview';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeExperimentId, setActiveExperimentId] = useState<string | undefined>(undefined);
  const [isSimulating, setIsSimulating] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  const handleRunQuickDemo = async () => {
    setIsSimulating(true);
    try {
      const res = await api.runQuickDemo();
      if (res.success && res.experiment) {
        setActiveExperimentId(res.experiment.id);
        setActive('simulations');
      }
    } catch (err: any) {
      alert(`Demo execution error: ${err.message}`);
      setIsSimulating(false);
    }
  };

  const handleExperimentStarted = (expId: string) => {
    setActiveExperimentId(expId);
    setIsSimulating(true);
    setActive('simulations');
  };

  const handleViewResults = (expId: string) => {
    setActiveExperimentId(expId);
    setIsSimulating(false);
    setActive('results');
  };

  const handleNavigate = (tab: string, expId?: string) => {
    if (expId) setActiveExperimentId(expId);
    setActive(tab);
  };

  const renderContent = () => {
    switch (active) {
      case 'overview':
        return <OverviewPanel onNavigate={handleNavigate} onRunQuickDemo={handleRunQuickDemo} />;
      case 'agents':
        return <AgentBuilder />;
      case 'worlds':
      case 'environments':
        return <EnvironmentBuilder />;
      case 'experiments':
        return <ExperimentCreator onExperimentStarted={handleExperimentStarted} />;
      case 'simulations':
        return (
          <SimulationCenter
            experimentId={activeExperimentId}
            onViewResults={handleViewResults}
            onRunQuickDemo={handleRunQuickDemo}
          />
        );
      case 'results':
      case 'evaluations':
        return (
          <ResultsView
            experimentId={activeExperimentId}
            onRunAgain={(expId) => {
              api.runExperiment(expId).then(() => {
                setActiveExperimentId(expId);
                setIsSimulating(true);
                setActive('simulations');
              });
            }}
          />
        );
      case 'knowledge':
        return <KnowledgeView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewPanel onNavigate={handleNavigate} onRunQuickDemo={handleRunQuickDemo} />;
    }
  };

  return (
    <div className="bg-ivory-dark min-h-screen text-burgundy overflow-x-hidden">
      <AppSidebar
        active={active}
        setActive={setActive}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isSimulating={isSimulating}
      />
      <AppTopBar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onRunQuickDemo={handleRunQuickDemo}
        onNewExperiment={() => setActive('experiments')}
        activeExperimentId={activeExperimentId}
        isSimulating={isSimulating}
      />

      {/* Main Content View */}
      <main className="md:ml-64 pt-14 min-h-screen transition-all">
        {/* Explicit Database Offline / Unconfigured Notice */}
        {health && !health.database.connected && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs font-mono text-amber-900 flex items-center justify-between gap-3 sticky top-14 z-30 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
              <span>
                <strong>MongoDB Database Offline / Unconfigured:</strong>{' '}
                {health.database.error || 'MONGODB_URI not configured in .env'}. Persistent records require a running MongoDB instance. Silent mock fallback is disabled.
              </span>
            </div>
            <button
              onClick={() => setActive('settings')}
              className="text-[11px] underline font-bold hover:text-amber-950 flex-shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Database size={12} />
              <span>Configure Database</span>
            </button>
          </div>
        )}

        {renderContent()}
      </main>
    </div>
  );
}
