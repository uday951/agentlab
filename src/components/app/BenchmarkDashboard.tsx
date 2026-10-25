import { useState, useEffect, useRef } from 'react';
import {
  GitBranch,
  Upload,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Layers,
  Shield,
  CheckSquare,
  FileCode,
  Zap,
  Sparkles,
  Link2,
  ExternalLink,
  Check,
  Eye,
} from 'lucide-react';
import {
  api,
  type BenchmarkProject,
  type BenchmarkRun,
  type BenchmarkDefinition,
  type BenchmarkDashboardStats,
  type BenchmarkOrigin,
  type ProviderConnection,
  type GenerationJob,
} from '../../lib/api';

const ORIGIN_CONFIG: Record<BenchmarkOrigin, { label: string; color: string; bg: string }> = {
  lovable: { label: 'Lovable', color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200' },
  bolt: { label: 'Bolt.new', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  replit: { label: 'Replit Agent', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  emergent: { label: 'Emergent', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  generic_github: { label: 'GitHub Repo', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
  zip_upload: { label: 'ZIP Upload', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  agentlab_agent: { label: 'AgentLab Agent', color: 'text-burgundy', bg: 'bg-copper/10 border-copper/30' },
};

export function BenchmarkDashboard({ onNavigateToCompare }: { onNavigateToCompare?: () => void }) {
  const [stats, setStats] = useState<BenchmarkDashboardStats | null>(null);
  const [projects, setProjects] = useState<BenchmarkProject[]>([]);
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Panels
  const [selectedProject, setSelectedProject] = useState<BenchmarkProject | null>(null);
  const [activeBenchmark, setActiveBenchmark] = useState<BenchmarkDefinition | null>(null);
  const [selectedRun, setSelectedRun] = useState<BenchmarkRun | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'scenarios' | 'results'>('dashboard');

  // Form states for Add Project
  const [sourceType, setSourceType] = useState<'github' | 'zip'>('github');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formOrigin, setFormOrigin] = useState<BenchmarkOrigin>('lovable');
  const [formRepoUrl, setFormRepoUrl] = useState('');
  const [formBranch, setFormBranch] = useState('main');
  const [formToken, setFormToken] = useState('');
  const [formCategory, setFormCategory] = useState('auto');
  const [formZipFile, setFormZipFile] = useState<File | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Env vars editor
  const [envKey, setEnvKey] = useState('');
  const [envVal, setEnvVal] = useState('');

  // AI Coding Platforms & Direct Generation State
  const [providers, setProviders] = useState<ProviderConnection[]>([]);
  const [providerNotice, setProviderNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Unified "Start New Benchmark" Modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [startModalMode, setStartModalMode] = useState<'generate' | 'connect' | 'import'>('generate');

  // Direct Generation Form State
  const [genProvider, setGenProvider] = useState<BenchmarkOrigin>('lovable');
  const [genProjectName, setGenProjectName] = useState('');
  const [genPrompt, setGenPrompt] = useState('');
  const [genCategory, setGenCategory] = useState('auto');
  const [genPreviewLoading, setGenPreviewLoading] = useState(false);
  const [genPreviewSpec, setGenPreviewSpec] = useState<any | null>(null);
  const [genCreditAccepted, setGenCreditAccepted] = useState(false);
  const [genSubmitting, setGenSubmitting] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const pollTimerRef = useRef<any>(null);

  // Manual Token / Credentials Input for Provider
  const [manualToken, setManualToken] = useState('');
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  const loadProviders = async () => {
    try {
      const list = await api.getProviders();
      setProviders(list);
    } catch {
      // Providers endpoint gracefully handled
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, projectsRes, runsRes, provList] = await Promise.all([
        api.getBenchmarkStats().catch(() => null),
        api.getBenchmarkProjects().catch(() => []),
        api.getBenchmarkRuns().catch(() => []),
        api.getProviders().catch(() => []),
      ]);
      setStats(statsRes);
      setProjects(projectsRes);
      setRuns(runsRes);
      setProviders(provList);
    } catch (err: any) {
      setError(err.message || 'Failed to load benchmark data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Check OAuth return query parameters
    const params = new URLSearchParams(window.location.search);
    const connectedParam = params.get('connected');
    const errorParam = params.get('error');

    if (connectedParam) {
      setProviderNotice({
        type: 'success',
        text: `Successfully authenticated & connected to ${connectedParam.toUpperCase()} via official OAuth!`,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorParam) {
      setProviderNotice({
        type: 'error',
        text: `OAuth authorization failed: ${decodeURIComponent(errorParam)}`,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Poll active generation job
  useEffect(() => {
    if (activeJob && !['completed', 'failed'].includes(activeJob.status)) {
      pollTimerRef.current = setTimeout(async () => {
        try {
          const updated = await api.getGenerationJob(activeJob.id);
          setActiveJob(updated);
          if (updated.status === 'completed') {
            await loadAllData();
          }
        } catch {}
      }, 2500);
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [activeJob]);

  const handlePreviewGeneration = async () => {
    if (!genPrompt.trim()) {
      setGenError('Please provide a description or prompt for the application.');
      return;
    }
    setGenPreviewLoading(true);
    setGenError(null);
    try {
      const res = await api.previewGeneration({
        provider: genProvider,
        prompt: genPrompt,
        name: genProjectName || undefined,
        category: genCategory,
      });
      setGenPreviewSpec(res.inferredSpec);
    } catch (err: any) {
      setGenError(err.message || 'Failed to infer benchmark specification.');
    } finally {
      setGenPreviewLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    if (!genPrompt.trim()) {
      setGenError('Please enter a benchmark application prompt.');
      return;
    }
    if (!genCreditAccepted) {
      setGenError('You must confirm acceptance that generation consumes provider credits.');
      return;
    }

    setGenSubmitting(true);
    setGenError(null);
    try {
      const job = await api.startGeneration({
        provider: genProvider,
        name: genProjectName || undefined,
        prompt: genPrompt,
        benchmarkCategory: genCategory,
        creditWarningAccepted: true,
      });
      setActiveJob(job);
    } catch (err: any) {
      setGenError(err.message || 'Failed to start direct generation job.');
    } finally {
      setGenSubmitting(false);
    }
  };

  const handleConnectOAuth = async (provider: string) => {
    try {
      if (provider !== 'lovable') {
        alert(`OAuth is currently supported for Lovable. For ${provider}, use Git/ZIP sync.`);
        return;
      }
      const { authUrl } = await api.getLovableAuthUrl();
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (err: any) {
      alert(`OAuth initialization error: ${err.message}`);
    }
  };

  const handleConnectToken = async (provider: string) => {
    if (!manualToken.trim()) return;
    setConnectingProvider(provider);
    try {
      await api.connectProvider(provider, { apiKey: manualToken.trim(), accessToken: manualToken.trim() });
      setManualToken('');
      await loadProviders();
      setProviderNotice({ type: 'success', text: `Successfully connected ${provider.toUpperCase()}!` });
    } catch (err: any) {
      alert(`Connection failed: ${err.message}`);
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDisconnectProvider = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;
    try {
      await api.disconnectProvider(provider);
      await loadProviders();
      setProviderNotice({ type: 'success', text: `Disconnected ${provider}.` });
    } catch (err: any) {
      alert(`Disconnect failed: ${err.message}`);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      let created: BenchmarkProject;
      if (sourceType === 'zip') {
        if (!formZipFile) throw new Error('Please select a .zip project file to upload.');
        const formData = new FormData();
        formData.append('name', formName);
        formData.append('description', formDesc);
        formData.append('source', 'zip');
        formData.append('origin', formOrigin);
        formData.append('benchmarkCategory', formCategory);
        formData.append('zipFile', formZipFile);
        created = await api.addBenchmarkProject(formData);
      } else {
        if (!formRepoUrl) throw new Error('Please enter a GitHub repository URL.');
        created = await api.addBenchmarkProject({
          name: formName,
          description: formDesc,
          source: 'github',
          origin: formOrigin,
          repoUrl: formRepoUrl,
          branch: formBranch,
          benchmarkCategory: formCategory,
          githubToken: formToken || undefined,
        });
      }

      setShowStartModal(false);
      resetForm();
      await loadAllData();
      inspectProject(created);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add project.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormRepoUrl('');
    setFormBranch('main');
    setFormToken('');
    setFormZipFile(null);
    setFormError(null);
  };

  const inspectProject = async (project: BenchmarkProject) => {
    setSelectedProject(project);
    setActiveTab('analysis');
    try {
      const defs = await api.getBenchmarkDefinitions(project.id);
      if (defs.length > 0) setActiveBenchmark(defs[0]);
    } catch {}
  };

  const handlePrepare = async (projId: string) => {
    try {
      const updated = await api.prepareBenchmarkProject(projId);
      setSelectedProject(updated);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      const defs = await api.getBenchmarkDefinitions(updated.id);
      if (defs.length > 0) setActiveBenchmark(defs[0]);
    } catch (err: any) {
      alert(`Preparation error: ${err.message}`);
    }
  };

  const handleAddEnvVar = async () => {
    if (!selectedProject || !envKey) return;
    const current = selectedProject.envVars || {};
    const updatedVars = { ...current, [envKey]: envVal };
    try {
      const updated = await api.updateBenchmarkProjectConfig(selectedProject.id, { envVars: updatedVars });
      setSelectedProject(updated);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEnvKey('');
      setEnvVal('');
    } catch (err: any) {
      alert(`Failed to save env var: ${err.message}`);
    }
  };

  const handleRunBenchmark = async (project: BenchmarkProject) => {
    setIsExecuting(true);
    setSelectedProject(project);
    try {
      const defs = await api.getBenchmarkDefinitions(project.id);
      const defId = defs[0]?.id;
      const run = await api.executeBenchmarkRun(project.id, defId);
      setSelectedRun(run);
      setActiveTab('results');
      await loadAllData();
    } catch (err: any) {
      alert(`Benchmark execution failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDeleteProject = async (projId: string) => {
    if (!confirm('Are you sure you want to delete this benchmark project and its sandbox?')) return;
    try {
      await api.deleteBenchmarkProject(projId);
      if (selectedProject?.id === projId) {
        setSelectedProject(null);
        setActiveTab('dashboard');
      }
      await loadAllData();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-copper/15">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-burgundy">
              AI Coding Agent Benchmarks
            </h1>
            <span className="text-[10px] bg-copper/20 text-copper px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
              Where Agents Meet Reality
            </span>
          </div>
          <p className="text-sm text-burgundy/70 mt-1">
            Empirical evaluation of AI-generated codebases from Lovable, Emergent, Bolt.new, and Replit Agent.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToCompare && (
            <button
              onClick={onNavigateToCompare}
              className="px-3 py-2 text-xs font-semibold rounded border border-copper/30 text-burgundy hover:bg-copper/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Layers size={14} className="text-copper" />
              <span>Compare Providers</span>
            </button>
          )}
          <button
            onClick={() => {
              setStartModalMode('connect');
              setShowStartModal(true);
            }}
            className="px-3 py-2 text-xs font-semibold rounded border border-copper/30 text-burgundy hover:bg-copper/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Link2 size={14} className="text-copper" />
            <span>Platforms</span>
          </button>
          <button
            onClick={() => {
              setStartModalMode('generate');
              setShowStartModal(true);
            }}
            className="px-4 py-2 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer border border-copper/30"
          >
            <Sparkles size={15} className="text-copper animate-pulse" />
            <span>Start New Benchmark</span>
          </button>
        </div>
      </div>

      {providerNotice && (
        <div
          className={`p-3 rounded text-xs font-mono flex items-center justify-between border ${
            providerNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {providerNotice.type === 'success' ? (
              <CheckCircle size={15} className="text-emerald-700 flex-shrink-0" />
            ) : (
              <AlertTriangle size={15} className="text-red-700 flex-shrink-0" />
            )}
            <span>{providerNotice.text}</span>
          </div>
          <button
            onClick={() => setProviderNotice(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-xs font-mono flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-700 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Subtabs */}
      {selectedProject && (
        <div className="flex items-center gap-2 border-b border-copper/15 pb-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-burgundy text-ivory font-bold' : 'text-burgundy/60 hover:text-burgundy'
            }`}
          >
            All Projects & Stats
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analysis' ? 'bg-burgundy text-ivory font-bold' : 'text-burgundy/60 hover:text-burgundy'
            }`}
          >
            <FileCode size={13} />
            <span>Project Analysis: {selectedProject.name}</span>
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scenarios' ? 'bg-burgundy text-ivory font-bold' : 'text-burgundy/60 hover:text-burgundy'
            }`}
          >
            <CheckSquare size={13} />
            <span>Benchmark Scenarios</span>
          </button>
          {selectedRun && (
            <button
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'results' ? 'bg-burgundy text-ivory font-bold' : 'text-burgundy/60 hover:text-burgundy'
              }`}
            >
              <Zap size={13} className="text-copper" />
              <span>Run Results ({selectedRun.summary.overallScore}%)</span>
            </button>
          )}
        </div>
      )}

      {/* MAIN VIEW: Dashboard & Overview Metrics */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* AI Coding Platform Connections (No Manual Import Required) */}
          <div className="bg-ivory border border-copper/25 rounded shadow-sm overflow-hidden">
            <div className="p-4 border-b border-copper/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-ivory-dark/40">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-copper" />
                <h2 className="text-sm font-bold text-burgundy font-display">
                  Connected AI Coding Platforms
                </h2>
                <span className="text-[10px] bg-copper/20 text-copper px-2 py-0.5 rounded font-mono font-bold uppercase">
                  Direct Pipeline
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setStartModalMode('connect');
                    setShowStartModal(true);
                  }}
                  className="text-xs font-mono text-burgundy/70 hover:text-burgundy flex items-center gap-1 cursor-pointer"
                >
                  <span>Manage Connections</span>
                  <ExternalLink size={11} />
                </button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Lovable Card */}
              {(() => {
                const prov = providers.find((p) => p.provider === 'lovable');
                const isConnected = prov?.status === 'connected';
                return (
                  <div className="border border-pink-200 bg-pink-50/50 rounded p-3 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-pink-700 flex items-center gap-1.5">
                          <Sparkles size={13} className="text-pink-600" />
                          Lovable
                        </span>
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                            <CheckCircle size={10} />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                            Disconnected
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-burgundy/60 mt-1">
                        MCP Server: <span className="font-semibold text-burgundy">mcp.lovable.dev</span>
                      </div>
                      <p className="text-[11px] text-burgundy/70 mt-1 line-clamp-2">
                        Official OAuth & MCP JSON-RPC protocol. Generates code directly into AgentLab sandboxes.
                      </p>
                      {prov?.discoveredTools && prov.discoveredTools.length > 0 && (
                        <div className="mt-2 text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-1.5 flex items-center gap-1">
                          <Check size={11} className="text-emerald-700 flex-shrink-0" />
                          <span>{prov.discoveredTools.length} MCP tools discovered</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t border-pink-100 flex items-center gap-1.5">
                      {isConnected ? (
                        <button
                          onClick={() => {
                            setGenProvider('lovable');
                            setStartModalMode('generate');
                            setShowStartModal(true);
                          }}
                          className="w-full py-1.5 px-2 bg-burgundy text-ivory text-[11px] font-bold rounded hover:bg-burgundy/90 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Play size={10} className="text-copper" />
                          <span>Generate App</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnectOAuth('lovable')}
                          className="w-full py-1.5 px-2 bg-pink-700 text-white text-[11px] font-bold rounded hover:bg-pink-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Link2 size={10} />
                          <span>Connect OAuth</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Bolt.new Card */}
              {(() => {
                const prov = providers.find((p) => p.provider === 'bolt');
                return (
                  <div className="border border-amber-200 bg-amber-50/50 rounded p-3 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700">Bolt.new</span>
                        <span className="text-[10px] font-mono font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          Git / ZIP Sync
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-burgundy/60 mt-1">
                        StackBlitz Platform
                      </div>
                      <p className="text-[11px] text-burgundy/70 mt-1 line-clamp-2">
                        {prov?.syncStrategyNotes || 'Connect via StackBlitz GitHub repository sync or download ZIP.'}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-amber-100">
                      <button
                        onClick={() => {
                          setFormOrigin('bolt');
                          setStartModalMode('import');
                          setShowStartModal(true);
                        }}
                        className="w-full py-1.5 px-2 border border-amber-300 text-amber-900 text-[11px] font-medium rounded hover:bg-amber-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload size={10} />
                        <span>Import Project</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Replit Agent Card */}
              {(() => {
                const prov = providers.find((p) => p.provider === 'replit');
                return (
                  <div className="border border-orange-200 bg-orange-50/50 rounded p-3 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-orange-700">Replit Agent</span>
                        <span className="text-[10px] font-mono font-medium text-orange-800 bg-orange-100 px-2 py-0.5 rounded border border-orange-300">
                          Git Sync
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-burgundy/60 mt-1">
                        Replit Workspaces
                      </div>
                      <p className="text-[11px] text-burgundy/70 mt-1 line-clamp-2">
                        {prov?.syncStrategyNotes || 'Sync codebase via connected GitHub repository from Replit workspace.'}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-orange-100">
                      <button
                        onClick={() => {
                          setFormOrigin('replit');
                          setStartModalMode('import');
                          setShowStartModal(true);
                        }}
                        className="w-full py-1.5 px-2 border border-orange-300 text-orange-900 text-[11px] font-medium rounded hover:bg-orange-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload size={10} />
                        <span>Import Project</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Emergent Card */}
              {(() => {
                const prov = providers.find((p) => p.provider === 'emergent');
                return (
                  <div className="border border-indigo-200 bg-indigo-50/50 rounded p-3 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700">Emergent</span>
                        <span className="text-[10px] font-mono font-medium text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-300">
                          Export / Import
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-burgundy/60 mt-1">
                        Autonomous Builder
                      </div>
                      <p className="text-[11px] text-burgundy/70 mt-1 line-clamp-2">
                        {prov?.syncStrategyNotes || 'Export generated project package and evaluate in AgentLab.'}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-indigo-100">
                      <button
                        onClick={() => {
                          setFormOrigin('emergent');
                          setStartModalMode('import');
                          setShowStartModal(true);
                        }}
                        className="w-full py-1.5 px-2 border border-indigo-300 text-indigo-900 text-[11px] font-medium rounded hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload size={10} />
                        <span>Import Project</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-ivory border border-copper/20 rounded p-4 shadow-sm">
              <span className="text-[11px] font-mono text-burgundy/60 uppercase">Total Projects</span>
              <div className="text-2xl font-bold font-display text-burgundy mt-1">
                {stats?.totalProjects ?? projects.length}
              </div>
              <span className="text-[10px] text-burgundy/50">Across all providers</span>
            </div>

            <div className="bg-ivory border border-copper/20 rounded p-4 shadow-sm">
              <span className="text-[11px] font-mono text-burgundy/60 uppercase">Completed Runs</span>
              <div className="text-2xl font-bold font-display text-emerald-700 mt-1">
                {stats?.completedRuns ?? 0}
              </div>
              <span className="text-[10px] text-burgundy/50">{stats?.failedRuns ?? 0} failed / unverified</span>
            </div>

            <div className="bg-ivory border border-copper/20 rounded p-4 shadow-sm">
              <span className="text-[11px] font-mono text-burgundy/60 uppercase">Build Success Rate</span>
              <div className="text-2xl font-bold font-display text-copper mt-1">
                {stats ? `${stats.buildSuccessRate}%` : 'N/A'}
              </div>
              <span className="text-[10px] text-burgundy/50">Clean production bundles</span>
            </div>

            <div className="bg-ivory border border-copper/20 rounded p-4 shadow-sm">
              <span className="text-[11px] font-mono text-burgundy/60 uppercase">Average Test Pass</span>
              <div className="text-2xl font-bold font-display text-burgundy mt-1">
                {stats ? `${stats.averageTestPassRate}%` : 'N/A'}
              </div>
              <span className="text-[10px] text-burgundy/50">5-pillar scenario pass</span>
            </div>

            <div className="bg-ivory border border-copper/20 rounded p-4 shadow-sm col-span-2 md:col-span-1">
              <span className="text-[11px] font-mono text-burgundy/60 uppercase">Avg Run Duration</span>
              <div className="text-2xl font-bold font-display text-burgundy mt-1">
                {stats ? `${Math.round(stats.averageExecutionDurationMs / 1000)}s` : '0s'}
              </div>
              <span className="text-[10px] text-burgundy/50">Isolated sandbox time</span>
            </div>
          </div>

          {/* Provider Comparison Mini-Grid */}
          {stats && stats.providerComparisons && stats.providerComparisons.length > 0 && (
            <div className="bg-ivory border border-copper/20 rounded p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-burgundy">
                  Origin Platform Breakdown
                </h3>
                <span className="text-[10px] font-mono text-burgundy/60">
                  Real benchmark scores grouped by provider
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.providerComparisons.map((item) => {
                  const cfg = ORIGIN_CONFIG[item.origin] || { label: item.origin, color: 'text-burgundy', bg: 'bg-ivory' };
                  return (
                    <div key={item.origin} className={`border rounded p-3 ${cfg.bg}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-[10px] font-mono font-semibold text-burgundy/60">
                          {item.runsCount} run{item.runsCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-lg font-bold font-display text-burgundy">
                          {item.averageScore > 0 ? `${item.averageScore}%` : 'Not run'}
                        </span>
                        <span className="text-[10px] font-mono text-burgundy/60">
                          Build: {item.buildSuccessRate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Imported Projects Table */}
          <div className="bg-ivory border border-copper/20 rounded shadow-sm overflow-hidden">
            <div className="p-4 border-b border-copper/15 flex items-center justify-between bg-ivory-dark/40">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-copper" />
                <h2 className="text-sm font-bold text-burgundy font-display">
                  Imported Coding Projects ({projects.length})
                </h2>
              </div>
              <button
                onClick={loadAllData}
                disabled={loading}
                className="text-xs font-mono text-burgundy/60 hover:text-burgundy flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileCode size={36} className="text-copper/40 mx-auto" />
                <h3 className="text-sm font-bold text-burgundy">No Benchmark Projects Imported Yet</h3>
                <p className="text-xs text-burgundy/60 max-w-md mx-auto">
                  Import an AI-generated codebase from Lovable, Emergent, Bolt.new, or Replit to inspect its structure, prepare the runtime, and benchmark it.
                </p>
                <button
                  onClick={() => {
                    setStartModalMode('generate');
                    setShowStartModal(true);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={14} className="text-copper" />
                  <span>Start First Benchmark</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-ivory-dark/60 text-burgundy/70 border-b border-copper/15 font-mono text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Project</th>
                      <th className="py-2.5 px-3">Origin</th>
                      <th className="py-2.5 px-3">Detected Stack</th>
                      <th className="py-2.5 px-3">Environment</th>
                      <th className="py-2.5 px-3">Latest Score</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-copper/10">
                    {projects.map((proj) => {
                      const cfg = ORIGIN_CONFIG[proj.origin] || { label: proj.origin, color: 'text-burgundy', bg: 'bg-ivory' };
                      const latestRun = runs.find((r) => r.projectId === proj.id);

                      return (
                        <tr key={proj.id} className="hover:bg-ivory-dark/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-burgundy">{proj.name}</div>
                            <div className="text-[10px] font-mono text-burgundy/50 truncate max-w-xs">
                              {proj.source === 'github' ? proj.repoUrl : proj.zipFileName}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${cfg.bg} ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {proj.analysis ? (
                              <div>
                                <span className="font-semibold text-burgundy">
                                  {proj.analysis.framework}
                                </span>
                                <div className="text-[10px] font-mono text-burgundy/50">
                                  {proj.analysis.packageManager} • {proj.analysis.language}
                                </div>
                              </div>
                            ) : (
                              <span className="text-burgundy/40 italic">Pending analysis</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {proj.preparationStatus === 'ready' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle size={11} />
                                <span>Ready</span>
                              </span>
                            ) : proj.preparationStatus === 'needs_configuration' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <AlertTriangle size={11} />
                                <span>Needs Config</span>
                              </span>
                            ) : proj.preparationStatus === 'preparing' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <RefreshCw size={11} className="animate-spin" />
                                <span>Preparing</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                <span>Not Prepared</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {latestRun ? (
                              <div>
                                <span
                                  className={`text-sm font-bold font-display ${
                                    latestRun.summary.overallScore >= 70 ? 'text-emerald-700' : 'text-amber-700'
                                  }`}
                                >
                                  {latestRun.summary.overallScore}%
                                </span>
                                <div className="text-[10px] font-mono text-burgundy/50">
                                  {latestRun.summary.passedScenarios}/{latestRun.summary.totalScenarios} passed
                                </div>
                              </div>
                            ) : (
                              <span className="text-burgundy/40 text-[11px] italic">No runs yet</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              onClick={() => inspectProject(proj)}
                              className="px-2.5 py-1 text-[11px] rounded border border-copper/30 text-burgundy hover:bg-copper/10 transition-colors cursor-pointer"
                              title="Inspect Analysis & Config"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleRunBenchmark(proj)}
                              disabled={isExecuting}
                              className="px-2.5 py-1 text-[11px] font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Run Full Benchmark"
                            >
                              <Play size={10} className="text-copper" />
                              <span>Benchmark</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProject(proj.id)}
                              className="p-1 text-burgundy/40 hover:text-red-700 transition-colors cursor-pointer"
                              title="Delete project"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: Project Code Analysis & Environment Preparation */}
      {activeTab === 'analysis' && selectedProject && (
        <div className="space-y-6">
          <div className="bg-ivory border border-copper/20 rounded p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-copper/15">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-display text-burgundy">
                    {selectedProject.name}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      ORIGIN_CONFIG[selectedProject.origin]?.bg
                    } ${ORIGIN_CONFIG[selectedProject.origin]?.color}`}
                  >
                    {ORIGIN_CONFIG[selectedProject.origin]?.label}
                  </span>
                </div>
                <div className="text-xs font-mono text-burgundy/60 mt-0.5">
                  ID: {selectedProject.id} • Revision:{' '}
                  {selectedProject.source === 'github' ? selectedProject.repoUrl : selectedProject.zipFileName}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrepare(selectedProject.id)}
                  className="px-3 py-1.5 text-xs font-bold rounded border border-copper/40 text-burgundy hover:bg-copper/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Re-Prepare Environment</span>
                </button>
                <button
                  onClick={() => handleRunBenchmark(selectedProject)}
                  disabled={isExecuting}
                  className="px-4 py-1.5 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={12} className="text-copper" />
                  <span>Execute Benchmark</span>
                </button>
              </div>
            </div>

            {/* Analysis Grid */}
            {selectedProject.analysis ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                {/* Column 1: Stack & Architecture */}
                <div className="bg-ivory-dark/40 border border-copper/15 rounded p-4 space-y-2.5">
                  <span className="font-mono text-[11px] font-bold text-copper uppercase">
                    Framework & Runtime
                  </span>
                  <div>
                    <div className="text-burgundy/60 text-[10px]">Framework:</div>
                    <div className="font-semibold text-burgundy">{selectedProject.analysis.framework}</div>
                  </div>
                  <div>
                    <div className="text-burgundy/60 text-[10px]">Language & Runtime:</div>
                    <div className="font-semibold text-burgundy">
                      {selectedProject.analysis.language} ({selectedProject.analysis.runtime})
                    </div>
                  </div>
                  <div>
                    <div className="text-burgundy/60 text-[10px]">Package Manager:</div>
                    <div className="font-semibold text-burgundy">
                      {selectedProject.analysis.packageManager}{' '}
                      {selectedProject.analysis.lockfileDetected ? '(Lockfile verified)' : '(No lockfile)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-burgundy/60 text-[10px]">Structure:</div>
                    <div className="font-semibold text-burgundy">
                      {selectedProject.analysis.structure.isMonorepo
                        ? `Monorepo (Frontend: ${selectedProject.analysis.structure.frontendDir}, Backend: ${selectedProject.analysis.structure.backendDir})`
                        : 'Single Directory Project'}
                    </div>
                  </div>
                </div>

                {/* Column 2: Entrypoints & Integrations */}
                <div className="bg-ivory-dark/40 border border-copper/15 rounded p-4 space-y-2.5">
                  <span className="font-mono text-[11px] font-bold text-copper uppercase">
                    Entrypoints & Services
                  </span>
                  <div>
                    <div className="text-burgundy/60 text-[10px]">Frontend Entrypoint:</div>
                    <div className="font-mono text-burgundy">
                      {selectedProject.analysis.entrypoints.frontend || 'None'}
                    </div>
                  </div>
                  <div>
                    <div className="text-burgundy/60 text-[10px]">Backend Entrypoint:</div>
                    <div className="font-mono text-burgundy">
                      {selectedProject.analysis.entrypoints.backend || 'None'}
                    </div>
                  </div>
                  <div>
                    <div className="text-burgundy/60 text-[10px]">Database Detected:</div>
                    <div className="font-semibold text-burgundy">
                      {selectedProject.analysis.databaseDetected || 'None detected'}
                    </div>
                  </div>
                  <div>
                    <div className="text-burgundy/60 text-[10px]">Auth Detected:</div>
                    <div className="font-semibold text-burgundy">
                      {selectedProject.analysis.authDetected || 'None detected'}
                    </div>
                  </div>
                </div>

                {/* Column 3: Capabilities & Tests */}
                <div className="bg-ivory-dark/40 border border-copper/15 rounded p-4 space-y-2.5">
                  <span className="font-mono text-[11px] font-bold text-copper uppercase">
                    Inferred Capabilities
                  </span>
                  <div className="space-y-1">
                    {selectedProject.analysis.likelyCapabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-burgundy font-medium">
                        <CheckCircle size={12} className="text-emerald-700 flex-shrink-0" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-copper/10">
                    <div className="text-burgundy/60 text-[10px]">Author Test Files:</div>
                    <div className="font-semibold text-burgundy">
                      {selectedProject.analysis.existingTestFiles.length > 0
                        ? `${selectedProject.analysis.existingTestFiles.length} file(s) found`
                        : 'None found in repo'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-mono text-burgundy/60">
                Project has not yet been prepared or analyzed. Click "Re-Prepare Environment" above.
              </div>
            )}

            {/* Environment Variables & Secrets Config */}
            <div className="mt-4 pt-4 border-t border-copper/15 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold font-mono text-burgundy uppercase">
                    Environment Variables & Secrets
                  </h3>
                  <p className="text-[11px] text-burgundy/60">
                    Provide required credentials or database strings securely without editing backend .env files.
                  </p>
                </div>
              </div>

              {selectedProject.missingRequirements && selectedProject.missingRequirements.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-700" />
                    <span>Referenced Variables Requiring Configuration:</span>
                  </div>
                  {selectedProject.missingRequirements.map((req, i) => (
                    <div key={i} className="text-[11px] font-mono pl-5">
                      • {req}
                    </div>
                  ))}
                </div>
              )}

              {/* Secure Key/Value Input */}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="KEY (e.g. VITE_SUPABASE_URL)"
                  value={envKey}
                  onChange={(e) => setEnvKey(e.target.value)}
                  className="w-1/3 px-3 py-1.5 text-xs font-mono border border-copper/30 rounded bg-white"
                />
                <input
                  type="password"
                  placeholder="SECRET VALUE (masked)"
                  value={envVal}
                  onChange={(e) => setEnvVal(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs font-mono border border-copper/30 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddEnvVar}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors cursor-pointer"
                >
                  Save Secret
                </button>
              </div>

              {/* Configured Keys */}
              {selectedProject.envVars && Object.keys(selectedProject.envVars).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {Object.keys(selectedProject.envVars).map((k) => (
                    <span
                      key={k}
                      className="px-2 py-1 rounded bg-copper/15 border border-copper/30 text-[10px] font-mono text-burgundy flex items-center gap-1"
                    >
                      <Shield size={10} className="text-copper" />
                      <strong>{k}</strong>: ••••••••
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Preparation Logs */}
            {selectedProject.preparationLogs && (
              <div className="mt-4 pt-4 border-t border-copper/15">
                <span className="font-mono text-[11px] font-bold text-burgundy/70 uppercase">
                  Sandbox Preparation Console Output
                </span>
                <pre className="mt-1 p-3 bg-burgundy/95 text-ivory font-mono text-[10px] rounded max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {selectedProject.preparationLogs}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: Benchmark Scenarios & 5-Pillar Test Definition */}
      {activeTab === 'scenarios' && activeBenchmark && (
        <div className="bg-ivory border border-copper/20 rounded p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-copper/15">
            <div>
              <h2 className="text-base font-bold font-display text-burgundy">{activeBenchmark.name}</h2>
              <p className="text-xs text-burgundy/60">{activeBenchmark.description}</p>
            </div>
            <button
              onClick={() => selectedProject && handleRunBenchmark(selectedProject)}
              disabled={isExecuting}
              className="px-4 py-2 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Play size={12} className="text-copper" />
              <span>{isExecuting ? 'Running...' : 'Run This Benchmark'}</span>
            </button>
          </div>

          {/* Scoring Weights Banner */}
          <div className="p-3 bg-ivory-dark/40 border border-copper/20 rounded flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <span className="font-bold text-burgundy">Configured Scoring Weights:</span>
            <div className="flex gap-3 text-burgundy/80">
              <span>Functional: {activeBenchmark.scoringWeights.functional}%</span>
              <span>Build: {activeBenchmark.scoringWeights.buildReliability}%</span>
              <span>Accessibility: {activeBenchmark.scoringWeights.accessibility}%</span>
              <span>Responsive: {activeBenchmark.scoringWeights.responsive}%</span>
              <span>Security: {activeBenchmark.scoringWeights.security}%</span>
            </div>
          </div>

          {/* Scenario Cards */}
          <div className="space-y-3">
            {activeBenchmark.scenarios.map((sc, idx) => (
              <div key={sc.id} className="border border-copper/15 rounded p-4 bg-white space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-copper">#{idx + 1}</span>
                    <h3 className="text-xs font-bold text-burgundy">{sc.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper/15 text-burgundy">
                      {sc.category} ({sc.type})
                    </span>
                  </div>
                </div>
                <p className="text-xs text-burgundy/70">{sc.objective}</p>
                <div className="bg-ivory-dark/30 rounded p-2 text-[11px] font-mono text-burgundy/80">
                  <div className="text-[10px] uppercase font-bold text-burgundy/50 mb-0.5">Execution Steps:</div>
                  {sc.executionSteps.map((step, sIdx) => (
                    <div key={sIdx}>
                      {sIdx + 1}. {step}
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-emerald-800 font-medium">
                  <strong>Expected:</strong> {sc.expectedResult}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: Run Results with Evidence & Screenshots */}
      {activeTab === 'results' && selectedRun && (
        <div className="bg-ivory border border-copper/20 rounded p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-copper/15">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display text-burgundy">
                  Benchmark Run Results: {selectedRun.projectName}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    selectedRun.summary.overallScore >= 70
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedRun.status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs font-mono text-burgundy/60 mt-1">
                Run ID: {selectedRun.id} • Completed:{' '}
                {selectedRun.completedAt ? new Date(selectedRun.completedAt).toLocaleString() : 'Just now'} • Duration:{' '}
                {Math.round(selectedRun.executionDurationMs / 1000)}s
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold font-display text-burgundy">
                  {selectedRun.summary.overallScore}%
                </div>
                <div className="text-[10px] font-mono text-burgundy/60">Overall Weighted Score</div>
              </div>
            </div>
          </div>

          {/* 5-Pillar Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="border border-copper/20 rounded p-3 bg-white text-center">
              <span className="text-[10px] font-mono text-burgundy/60 uppercase">Functional (50%)</span>
              <div className="text-xl font-bold font-display text-burgundy mt-1">
                {selectedRun.summary.categoryScores.functional.score}%
              </div>
              <span className="text-[9px] text-burgundy/50">Core Capabilities</span>
            </div>

            <div className="border border-copper/20 rounded p-3 bg-white text-center">
              <span className="text-[10px] font-mono text-burgundy/60 uppercase">Build/Compile (20%)</span>
              <div
                className={`text-xl font-bold font-display mt-1 ${
                  selectedRun.buildStatus === 'passed' ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {selectedRun.summary.categoryScores.buildReliability.score}%
              </div>
              <span className="text-[9px] text-burgundy/50">{selectedRun.buildStatus.toUpperCase()}</span>
            </div>

            <div className="border border-copper/20 rounded p-3 bg-white text-center">
              <span className="text-[10px] font-mono text-burgundy/60 uppercase">Accessibility (10%)</span>
              <div className="text-xl font-bold font-display text-burgundy mt-1">
                {selectedRun.summary.categoryScores.accessibility.score}%
              </div>
              <span className="text-[9px] text-burgundy/50">WCAG 2.1 Semantics</span>
            </div>

            <div className="border border-copper/20 rounded p-3 bg-white text-center">
              <span className="text-[10px] font-mono text-burgundy/60 uppercase">Responsive (10%)</span>
              <div className="text-xl font-bold font-display text-burgundy mt-1">
                {selectedRun.summary.categoryScores.responsive.score}%
              </div>
              <span className="text-[9px] text-burgundy/50">Multi-Viewport</span>
            </div>

            <div className="border border-copper/20 rounded p-3 bg-white text-center col-span-2 md:col-span-1">
              <span className="text-[10px] font-mono text-burgundy/60 uppercase">Security (10%)</span>
              <div className="text-xl font-bold font-display text-burgundy mt-1">
                {selectedRun.summary.categoryScores.security.score}%
              </div>
              <span className="text-[9px] text-burgundy/50">Secrets & Injections</span>
            </div>
          </div>

          {/* Actionable Debugging Suggestions */}
          {selectedRun.summary.actionableDebuggingSuggestions &&
            selectedRun.summary.actionableDebuggingSuggestions.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-2">
                <h3 className="text-xs font-bold font-mono uppercase text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-700" />
                  <span>Actionable Debugging Suggestions</span>
                </h3>
                <ul className="text-xs text-amber-900 space-y-1 list-disc pl-5">
                  {selectedRun.summary.actionableDebuggingSuggestions.map((sug, i) => (
                    <li key={i}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Individual Scenario Execution Results */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-mono uppercase text-burgundy tracking-wider">
              Scenario Execution Breakdown ({selectedRun.scenarioRuns.length} Tests)
            </h3>
            {selectedRun.scenarioRuns.map((sr) => (
              <div
                key={sr.scenarioId}
                className={`border rounded p-4 bg-white space-y-2 ${
                  sr.status === 'passed' ? 'border-emerald-200' : 'border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {sr.status === 'passed' ? (
                      <CheckCircle size={16} className="text-emerald-700" />
                    ) : (
                      <XCircle size={16} className="text-red-700" />
                    )}
                    <span className="text-xs font-bold text-burgundy">{sr.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper/15 text-burgundy">
                      {sr.category}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-burgundy/50">{sr.durationMs}ms</span>
                </div>

                <div className="text-xs text-burgundy/80">
                  <strong>Outcome:</strong> {sr.actualResult}
                </div>

                {sr.logs && sr.logs.length > 0 && (
                  <pre className="p-2 bg-ivory-dark/40 rounded font-mono text-[10px] text-burgundy/70 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {sr.logs.join('\n')}
                  </pre>
                )}

                {/* Real Browser Screenshot when available */}
                {sr.screenshots && sr.screenshots.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono font-bold text-burgundy/60 uppercase block mb-1">
                      Live Rendered Headless Browser Evidence:
                    </span>
                    <img
                      src={sr.screenshots[0]}
                      alt="Execution Screenshot"
                      className="max-h-64 rounded border border-copper/20 shadow-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Unified "Start New Benchmark" Modal (3 Modes) */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-ivory border border-copper/30 rounded-lg max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header with Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-copper/15">
              <div>
                <h2 className="text-base font-bold font-display text-burgundy flex items-center gap-2">
                  <Sparkles size={16} className="text-copper" />
                  <span>Start New AI Benchmark</span>
                </h2>
                <p className="text-xs text-burgundy/60">
                  Connect AI platforms, generate new apps directly, or import existing code.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowStartModal(false);
                  setActiveJob(null);
                  setGenError(null);
                  setGenPreviewSpec(null);
                }}
                className="text-burgundy/50 hover:text-burgundy text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-ivory-dark/60 p-1 rounded border border-copper/20 text-xs font-mono">
              <button
                type="button"
                onClick={() => setStartModalMode('generate')}
                className={`py-2 px-2 rounded text-center font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  startModalMode === 'generate'
                    ? 'bg-burgundy text-ivory shadow-sm'
                    : 'text-burgundy/70 hover:text-burgundy'
                }`}
              >
                <Zap size={13} className={startModalMode === 'generate' ? 'text-copper' : ''} />
                <span>1. Generate App</span>
              </button>
              <button
                type="button"
                onClick={() => setStartModalMode('connect')}
                className={`py-2 px-2 rounded text-center font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  startModalMode === 'connect'
                    ? 'bg-burgundy text-ivory shadow-sm'
                    : 'text-burgundy/70 hover:text-burgundy'
                }`}
              >
                <Link2 size={13} />
                <span>2. Connect Platform</span>
              </button>
              <button
                type="button"
                onClick={() => setStartModalMode('import')}
                className={`py-2 px-2 rounded text-center font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  startModalMode === 'import'
                    ? 'bg-burgundy text-ivory shadow-sm'
                    : 'text-burgundy/70 hover:text-burgundy'
                }`}
              >
                <Upload size={13} />
                <span>3. Import Code</span>
              </button>
            </div>

            {/* ============================================================== */}
            {/* MODE 1: Direct Generation Workflow (No Manual Import Needed) */}
            {/* ============================================================== */}
            {startModalMode === 'generate' && (
              <div className="space-y-4 text-xs font-sans">
                {activeJob ? (
                  /* Active Generation Progress Tracker */
                  <div className="space-y-4 bg-white border border-copper/20 rounded p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-copper/15">
                      <div>
                        <div className="font-bold text-burgundy text-sm">
                          {activeJob.projectName}
                        </div>
                        <div className="text-[10px] font-mono text-burgundy/60">
                          Job ID: {activeJob.id} • Provider: {activeJob.provider.toUpperCase()}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
                          activeJob.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : activeJob.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-copper/20 text-copper'
                        }`}
                      >
                        {activeJob.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Step Pipeline */}
                    <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono">
                      {[
                        { key: 'prompt_approved', label: '1. Approved' },
                        { key: 'submitting', label: '2. Submitting' },
                        { key: 'generating', label: '3. Generating' },
                        { key: 'retrieving_code', label: '4. Retrieving' },
                        { key: 'executing_benchmark', label: '5. Benchmark' },
                      ].map((step, idx) => {
                        const statuses = ['prompt_approved', 'submitting', 'generating', 'retrieving_code', 'preparing_environment', 'executing_benchmark', 'completed'];
                        const currentIdx = statuses.indexOf(activeJob.status);
                        const isDone = currentIdx > idx || activeJob.status === 'completed';
                        const isCurrent = activeJob.status === step.key;

                        return (
                          <div
                            key={step.key}
                            className={`p-2 rounded border ${
                              isDone
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : isCurrent
                                ? 'bg-copper/15 border-copper text-burgundy font-bold animate-pulse'
                                : 'bg-ivory-dark/40 border-copper/15 text-burgundy/40'
                            }`}
                          >
                            <div>{step.label}</div>
                            {isDone ? '✓' : isCurrent ? '...' : ''}
                          </div>
                        );
                      })}
                    </div>

                    {/* Live Execution Logs */}
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-burgundy/60 block mb-1">
                        Pipeline Activity Log:
                      </span>
                      <pre className="p-3 bg-burgundy/95 text-ivory rounded font-mono text-[10px] max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {activeJob.logs.join('\n')}
                      </pre>
                    </div>

                    {/* Failure details if any */}
                    {activeJob.status === 'failed' && (
                      <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <XCircle size={14} className="text-red-700" />
                          <span>Generation or Test Suite Failed ({activeJob.failureType || 'Error'})</span>
                        </div>
                        <p className="text-[11px] font-mono">{activeJob.failureReason}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 flex justify-end gap-2">
                      {activeJob.status === 'completed' && activeJob.createdProjectId && (
                        <button
                          type="button"
                          onClick={async () => {
                            const p = projects.find((x) => x.id === activeJob.createdProjectId);
                            setShowStartModal(false);
                            setActiveJob(null);
                            if (p) inspectProject(p);
                            else await loadAllData();
                          }}
                          className="px-4 py-2 rounded bg-burgundy text-ivory font-bold hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play size={12} className="text-copper" />
                          <span>View Generated Project & Benchmark</span>
                        </button>
                      )}
                      {['completed', 'failed'].includes(activeJob.status) && (
                        <button
                          type="button"
                          onClick={() => setActiveJob(null)}
                          className="px-3 py-1.5 border border-copper/30 rounded text-burgundy hover:bg-copper/10 transition-colors cursor-pointer"
                        >
                          Start Another
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Generation Configuration Form */
                  <div className="space-y-4">
                    {genError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-700 flex-shrink-0" />
                        <span>{genError}</span>
                      </div>
                    )}

                    {/* Provider Selection */}
                    <div>
                      <label className="block font-bold text-burgundy mb-1">Target AI Coding Platform</label>
                      <div className="p-3 border border-pink-200 bg-pink-50/60 rounded flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-pink-600" />
                          <div>
                            <div className="font-bold text-pink-900">Lovable (Official MCP Server)</div>
                            <div className="text-[10px] font-mono text-burgundy/60">
                              Endpoint: https://mcp.lovable.dev • Protocol: MCP JSON-RPC
                            </div>
                          </div>
                        </div>
                        {providers.find((p) => p.provider === 'lovable')?.status === 'connected' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                            <CheckCircle size={10} />
                            Connected
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConnectOAuth('lovable')}
                            className="text-[11px] font-bold text-pink-700 bg-white border border-pink-300 px-2.5 py-1 rounded hover:bg-pink-100 transition-colors cursor-pointer"
                          >
                            Connect Account
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Project Name */}
                    <div>
                      <label className="block font-bold text-burgundy mb-1">Benchmark Project Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Lovable Task Management App"
                        value={genProjectName}
                        onChange={(e) => setGenProjectName(e.target.value)}
                        className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs"
                      />
                    </div>

                    {/* Benchmark Task Prompt */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-burgundy">Benchmark Task Prompt *</label>
                        <span className="text-[10px] text-burgundy/50">Describe the desired application</span>
                      </div>
                      <textarea
                        rows={3}
                        required
                        placeholder="e.g. Build a task management application with user authentication, CRUD operations, responsive UI, drag-and-drop status columns, and persistent storage."
                        value={genPrompt}
                        onChange={(e) => setGenPrompt(e.target.value)}
                        className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                      />
                    </div>

                    {/* Benchmark Category */}
                    <div>
                      <label className="block font-bold text-burgundy mb-1">Evaluation Category & Test Suite</label>
                      <select
                        value={genCategory}
                        onChange={(e) => setGenCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs"
                      >
                        <option value="auto">Auto-detect from prompt</option>
                        <option value="task_management">Task & Workflow Management</option>
                        <option value="ecommerce">E-commerce & Storefront</option>
                        <option value="dashboard">Analytics & Dashboard</option>
                        <option value="authentication">Authentication & Authorization</option>
                        <option value="api_service">Backend API & Microservice</option>
                        <option value="general_web">General Web Application</option>
                      </select>
                    </div>

                    {/* Preview Benchmark Spec Button */}
                    <div>
                      <button
                        type="button"
                        onClick={handlePreviewGeneration}
                        disabled={genPreviewLoading || !genPrompt.trim()}
                        className="px-3 py-1.5 border border-copper/40 text-burgundy hover:bg-copper/10 rounded font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {genPreviewLoading ? <RefreshCw size={12} className="animate-spin" /> : <Eye size={12} />}
                        <span>Preview Inferred Benchmark Spec & Cost</span>
                      </button>
                    </div>

                    {/* Inferred Spec & Credit Warning Box */}
                    {genPreviewSpec && (
                      <div className="p-3 bg-ivory-dark/40 border border-copper/25 rounded space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-copper uppercase">
                            Inferred Benchmark Specification
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper/20 text-burgundy font-bold">
                            {genPreviewSpec.category}
                          </span>
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-burgundy/60 uppercase font-bold">
                            5-Pillar Test Scenarios to be Evaluated:
                          </div>
                          <ul className="text-[11px] text-burgundy list-disc pl-5 mt-1 space-y-0.5">
                            {genPreviewSpec.suggestedScenarios.map((sc: string, idx: number) => (
                              <li key={idx}>{sc}</li>
                            ))}
                          </ul>
                        </div>

                        {/* PROMINENT CREDIT WARNING NOTICE */}
                        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-950 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                            <AlertTriangle size={14} className="text-amber-700 flex-shrink-0" />
                            <span>Provider Credit Consumption Notice</span>
                          </div>
                          <p className="text-[11px]">
                            {genPreviewSpec.creditNotice ||
                              'Generating this project connects to the AI platform and will consume credits from your connected account.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Credit Acceptance Checkbox */}
                    <div className="p-3 border border-copper/30 rounded bg-white flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="creditAccept"
                        checked={genCreditAccepted}
                        onChange={(e) => setGenCreditAccepted(e.target.checked)}
                        className="mt-0.5 text-burgundy rounded cursor-pointer"
                      />
                      <label htmlFor="creditAccept" className="text-xs text-burgundy font-medium cursor-pointer">
                        I confirm and accept that submitting this benchmark task may consume credits on my connected AI coding platform account.
                      </label>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 border-t border-copper/15 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowStartModal(false)}
                        className="px-4 py-2 border border-copper/30 rounded text-burgundy hover:bg-copper/10 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleStartGeneration}
                        disabled={genSubmitting || !genCreditAccepted || !genPrompt.trim()}
                        className="px-4 py-2 rounded bg-burgundy text-ivory font-bold hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {genSubmitting ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>Submitting to Platform...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} className="text-copper" />
                            <span>Generate & Benchmark Application</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* MODE 2: Connect AI Coding Platforms */}
            {/* ============================================================== */}
            {startModalMode === 'connect' && (
              <div className="space-y-4 text-xs font-sans">
                <p className="text-burgundy/70 text-xs">
                  Connect supported AI coding platforms directly via official OAuth and MCP servers. Discovered tools and workspaces are automatically detected.
                </p>

                {/* Lovable MCP Connector */}
                <div className="border border-pink-200 bg-pink-50/40 rounded p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-pink-900 text-sm flex items-center gap-1.5">
                        <Sparkles size={14} className="text-pink-600" />
                        Lovable (Official MCP Server)
                      </div>
                      <div className="text-[10px] font-mono text-burgundy/60">
                        mcp.lovable.dev • OAuth 2.0 & MCP JSON-RPC
                      </div>
                    </div>
                    {providers.find((p) => p.provider === 'lovable')?.status === 'connected' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-300">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <p className="text-burgundy/70 text-[11px]">
                    Connects directly to the official Lovable MCP endpoint using standard OAuth. Enables listing workspaces, creating benchmark projects, and retrieving generated source code.
                  </p>

                  {/* Discovered MCP Tools List */}
                  {(() => {
                    const prov = providers.find((p) => p.provider === 'lovable');
                    return prov?.discoveredTools && prov.discoveredTools.length > 0 ? (
                      <div className="bg-white border border-pink-100 rounded p-2.5 space-y-1.5">
                        <span className="text-[10px] font-mono uppercase font-bold text-burgundy/60">
                          Discovered Lovable MCP Tools:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {prov.discoveredTools.map((tool) => (
                            <div key={tool.name} className="text-[10px] font-mono bg-pink-50/80 p-1.5 rounded border border-pink-200">
                              <span className="font-bold text-pink-900">{tool.name}</span>
                              <div className="text-burgundy/60 truncate">{tool.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleConnectOAuth('lovable')}
                      className="px-3 py-1.5 bg-pink-700 text-white rounded font-bold hover:bg-pink-800 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Link2 size={12} />
                      <span>Connect via Lovable OAuth</span>
                    </button>
                    {providers.find((p) => p.provider === 'lovable')?.status === 'connected' && (
                      <button
                        type="button"
                        onClick={() => handleDisconnectProvider('lovable')}
                        className="px-3 py-1.5 border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors cursor-pointer text-xs"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>

                  {/* Token Fallback */}
                  <div className="pt-2 border-t border-pink-100 flex gap-2 items-center">
                    <input
                      type="password"
                      placeholder="Or enter Lovable Bearer Access Token directly"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono border border-copper/30 rounded bg-white text-burgundy"
                    />
                    <button
                      type="button"
                      onClick={() => handleConnectToken('lovable')}
                      disabled={!manualToken.trim() || connectingProvider === 'lovable'}
                      className="px-3 py-1.5 bg-burgundy text-ivory rounded font-bold hover:bg-burgundy/90 transition-colors cursor-pointer disabled:opacity-50 text-xs"
                    >
                      {connectingProvider === 'lovable' ? 'Connecting...' : 'Save Token'}
                    </button>
                  </div>
                </div>

                {/* Truthful Platform Integration Guides */}
                <div className="space-y-2">
                  <div className="border border-amber-200 bg-amber-50/40 rounded p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900">Bolt.new (StackBlitz)</span>
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        Git / ZIP Export Supported
                      </span>
                    </div>
                    <p className="text-[11px] text-burgundy/70 mt-1">
                      Bolt projects are hosted in StackBlitz WebContainers. To evaluate, push to GitHub via Bolt's integrated repository sync or export ZIP and import into AgentLab.
                    </p>
                  </div>

                  <div className="border border-orange-200 bg-orange-50/40 rounded p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-900">Replit Agent</span>
                      <span className="text-[10px] font-mono text-orange-800 bg-orange-100 px-2 py-0.5 rounded border border-orange-300">
                        Git Sync Supported
                      </span>
                    </div>
                    <p className="text-[11px] text-burgundy/70 mt-1">
                      Replit provides integrated Git version control. Connect your repository to AgentLab to run automated builds and 5-pillar benchmarks on every commit.
                    </p>
                  </div>

                  <div className="border border-indigo-200 bg-indigo-50/40 rounded p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900">Emergent</span>
                      <span className="text-[10px] font-mono text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-300">
                        Export / Import Supported
                      </span>
                    </div>
                    <p className="text-[11px] text-burgundy/70 mt-1">
                      Export generated application bundles from Emergent and import via ZIP or Git repository for sandbox execution.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* MODE 3: Import Existing Project (GitHub / ZIP) */}
            {/* ============================================================== */}
            {startModalMode === 'import' && (
              <form onSubmit={handleAddProject} className="space-y-4 text-xs font-sans">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs">
                    {formError}
                  </div>
                )}

                {/* Source Selector */}
                <div>
                  <label className="block font-bold text-burgundy mb-1">Source Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSourceType('github')}
                      className={`py-2 px-3 rounded border text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5 ${
                        sourceType === 'github'
                          ? 'bg-burgundy text-ivory border-burgundy'
                          : 'border-copper/30 text-burgundy hover:bg-copper/10'
                      }`}
                    >
                      <GitBranch size={13} />
                      <span>GitHub Repository</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceType('zip')}
                      className={`py-2 px-3 rounded border text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5 ${
                        sourceType === 'zip'
                          ? 'bg-burgundy text-ivory border-burgundy'
                          : 'border-copper/30 text-burgundy hover:bg-copper/10'
                      }`}
                    >
                      <Upload size={13} />
                      <span>ZIP Upload</span>
                    </button>
                  </div>
                </div>

                {/* Origin Platform */}
                <div>
                  <label className="block font-bold text-burgundy mb-1">Origin AI Coding Tool</label>
                  <select
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value as BenchmarkOrigin)}
                    className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs"
                  >
                    <option value="lovable">Lovable (lovable.dev)</option>
                    <option value="bolt">Bolt.new (StackBlitz)</option>
                    <option value="replit">Replit Agent</option>
                    <option value="emergent">Emergent</option>
                    <option value="generic_github">Generic GitHub / Other AI</option>
                    <option value="zip_upload">ZIP Archive Upload</option>
                  </select>
                </div>

                {/* Project Name */}
                <div>
                  <label className="block font-bold text-burgundy mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lovable Task Tracker, Bolt E-Shop"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs"
                  />
                </div>

                {/* GitHub Fields */}
                {sourceType === 'github' ? (
                  <>
                    <div>
                      <label className="block font-bold text-burgundy mb-1">GitHub Repository URL *</label>
                      <input
                        type="url"
                        required
                        placeholder="https://github.com/username/project.git"
                        value={formRepoUrl}
                        onChange={(e) => setFormRepoUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy font-mono text-[11px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-burgundy mb-1">Branch</label>
                        <input
                          type="text"
                          placeholder="main"
                          value={formBranch}
                          onChange={(e) => setFormBranch(e.target.value)}
                          className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-burgundy mb-1">Personal Token (Private repos)</label>
                        <input
                          type="password"
                          placeholder="ghp_•••• (optional)"
                          value={formToken}
                          onChange={(e) => setFormToken(e.target.value)}
                          className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* ZIP Upload Input */
                  <div>
                    <label className="block font-bold text-burgundy mb-1">ZIP Archive File *</label>
                    <input
                      type="file"
                      accept=".zip"
                      required
                      onChange={(e) => setFormZipFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-burgundy file:text-ivory"
                    />
                    <span className="text-[10px] text-burgundy/60 mt-1 block">
                      Upload extracted project folder in a standard .zip archive (max 100MB).
                    </span>
                  </div>
                )}

                {/* Benchmark Category */}
                <div>
                  <label className="block font-bold text-burgundy mb-1">Benchmark Test Suite Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs"
                  >
                    <option value="auto">Auto-detect from source code</option>
                    <option value="task_management">Task & Workflow Management</option>
                    <option value="ecommerce">E-commerce & Storefront</option>
                    <option value="dashboard">Analytics & Dashboard</option>
                    <option value="authentication">Authentication & Authorization</option>
                    <option value="api_service">Backend API & Microservice</option>
                    <option value="general_web">General Web Application</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-copper/15 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStartModal(false)}
                    className="px-4 py-2 border border-copper/30 rounded text-burgundy hover:bg-copper/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-4 py-2 rounded bg-burgundy text-ivory font-bold hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {formSubmitting && <RefreshCw size={12} className="animate-spin" />}
                    <span>{formSubmitting ? 'Importing...' : 'Import & Analyze Project'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
