import { useState, useEffect } from 'react';
import {
  Database,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Key,
  GitBranch,
  Terminal,
  Zap,
  Server,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '../../lib/api';

export const InfrastructureView = () => {
  const [infra, setInfra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<any>(null);
  const [testingGh, setTestingGh] = useState(false);
  const [ghTestResult, setGhTestResult] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [llmProvider, setLlmProvider] = useState('deepseek');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [llmModel, setLlmModel] = useState('deepseek-chat');
  const [githubToken, setGithubToken] = useState('');
  const [showGhToken, setShowGhToken] = useState(false);
  const [enableCliRunner, setEnableCliRunner] = useState(false);
  const [agentRunnerMode, setAgentRunnerMode] = useState<'builtin-sandbox' | 'external-docker'>('builtin-sandbox');
  const [agentRunnerUrl, setAgentRunnerUrl] = useState('');

  const loadInfra = async () => {
    try {
      setLoading(true);
      const data = await api.getInfrastructure();
      setInfra(data);
      if (data.config) {
        setLlmProvider(data.config.llmProvider || 'deepseek');
        setLlmModel(data.config.llmModel || 'deepseek-chat');
        setEnableCliRunner(!!data.config.enableCliRunner);
        setAgentRunnerMode(data.config.agentRunnerMode || 'builtin-sandbox');
        setAgentRunnerUrl(data.config.agentRunnerUrl || '');
      }
    } catch (err: any) {
      setToast({ message: `Failed to load infrastructure status: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfra();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      await api.updateInfrastructure({
        llmProvider,
        llmApiKey: llmApiKey.trim() || undefined,
        llmModel,
        githubToken: githubToken.trim() || undefined,
        enableCliRunner,
        agentRunnerMode,
        agentRunnerUrl: agentRunnerMode === 'external-docker' ? agentRunnerUrl : '',
      });

      setToast({ message: 'Platform infrastructure settings successfully saved to MongoDB.', type: 'success' });
      setLlmApiKey('');
      setGithubToken('');
      await loadInfra();
    } catch (err: any) {
      setToast({ message: `Error saving configuration: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestLlm = async () => {
    setTestingLlm(true);
    setLlmTestResult(null);
    try {
      const res = await api.testLlmProvider();
      setLlmTestResult(res);
    } catch (err: any) {
      setLlmTestResult({ success: false, error: err.message });
    } finally {
      setTestingLlm(false);
    }
  };

  const handleTestGh = async () => {
    setTestingGh(true);
    setGhTestResult(null);
    try {
      const res = await api.testGitHubToken();
      setGhTestResult(res);
    } catch (err: any) {
      setGhTestResult({ success: false, error: err.message });
    } finally {
      setTestingGh(false);
    }
  };

  if (loading && !infra) {
    return (
      <div className="p-8 text-center text-burgundy/60 font-mono text-xs">
        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-copper" />
        <span>Loading system infrastructure status...</span>
      </div>
    );
  }

  const db = infra?.database;
  const runner = infra?.runner;
  const cfg = infra?.config;

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy">
              Infrastructure & Runtime Setup
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-burgundy/60 max-w-2xl">
            Configure platform credentials, verify host runtimes, and manage isolated sandbox workers entirely in-app without manually editing environment files.
          </p>
        </div>

        <button
          onClick={loadInfra}
          className="cursor-pointer flex items-center gap-1.5 border border-copper/30 text-copper hover:bg-copper hover:text-ivory px-3 py-1.5 text-xs font-mono rounded transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {toast && (
        <div
          className={`mb-6 p-4 rounded text-xs font-mono border flex items-center justify-between gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-xs font-bold px-2 py-0.5 cursor-pointer">✕</button>
        </div>
      )}

      {/* Top Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Database Status */}
        <div className="bg-white border border-copper/20 p-5 rounded shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-copper" />
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-burgundy">Database</span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              db?.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {db?.connected ? 'Online' : 'Disconnected'}
            </span>
          </div>
          <div className="font-mono text-xs text-burgundy">
            <div className="font-bold text-sm text-burgundy">{db?.type || 'MongoDB'}</div>
            <div className="text-[11px] text-burgundy/60 mt-1">
              Active Collections: <strong className="text-burgundy">{db?.collectionsCount ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Runner Status */}
        <div className="bg-white border border-copper/20 p-5 rounded shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-copper" />
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-burgundy">Execution Runner</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold uppercase">
              Ready
            </span>
          </div>
          <div className="font-mono text-xs text-burgundy">
            <div className="font-bold text-sm text-burgundy">
              {runner?.mode === 'external-docker' ? 'External Docker Runner' : 'Platform-Managed Sandbox'}
            </div>
            <div className="text-[11px] text-burgundy/60 mt-1">
              Active Sandboxes: <strong className="text-burgundy">{runner?.sandboxesCount ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Host Runtimes */}
        <div className="bg-white border border-copper/20 p-5 rounded shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-copper" />
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-burgundy">Host Runtimes</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper/10 text-copper font-bold uppercase">
              Detected
            </span>
          </div>
          <div className="font-mono text-[11px] text-burgundy/70 space-y-0.5">
            <div>Node.js: <strong className="text-burgundy">{runner?.runtimes?.node || 'Not found'}</strong></div>
            <div>Python: <strong className="text-burgundy">{runner?.runtimes?.python || 'Not found'}</strong></div>
            <div>Git: <strong className="text-burgundy">{runner?.runtimes?.git || 'Not found'}</strong></div>
          </div>
        </div>
      </div>

      {/* Main Configuration Form */}
      <div className="bg-white border border-copper/25 rounded-lg p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex items-center gap-2 pb-4 mb-6 border-b border-copper/15">
          <Key size={18} className="text-copper" />
          <h2 className="font-display text-xl font-bold text-burgundy">
            Platform Provider Integrations & Secrets
          </h2>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-6 text-xs font-sans">
          {/* Section: LLM Provider */}
          <div className="p-4 bg-ivory/50 border border-copper/20 rounded space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-bold font-mono text-copper uppercase text-xs flex items-center gap-2">
                <Zap size={14} />
                <span>1. Language Model Provider (LLM)</span>
              </div>
              <button
                type="button"
                onClick={handleTestLlm}
                disabled={testingLlm}
                className="cursor-pointer font-mono text-[11px] px-3 py-1 bg-burgundy text-ivory rounded hover:bg-burgundy-light flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={11} className={testingLlm ? 'animate-spin' : ''} />
                <span>{testingLlm ? 'Pinging Provider...' : 'Test LLM Ping'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-copper uppercase font-bold mb-1">Provider</label>
                <select
                  value={llmProvider}
                  onChange={(e) => setLlmProvider(e.target.value)}
                  className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                >
                  <option value="deepseek">DeepSeek (OpenAI compatible)</option>
                  <option value="openai">OpenAI</option>
                  <option value="builtin-deterministic">Built-in Deterministic (No API Key)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-copper uppercase font-bold mb-1">Model Name</label>
                <input
                  type="text"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder="deepseek-chat"
                  className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-copper uppercase font-bold mb-1">
                  API Key {cfg?.hasLlmApiKey && <span className="text-emerald-700 lowercase">(active: {cfg.llmApiKeyMasked})</span>}
                </label>
                <div className="relative">
                  <input
                    type={showLlmKey ? 'text' : 'password'}
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    placeholder={cfg?.hasLlmApiKey ? 'Leave empty to keep current key' : 'sk-...'}
                    className="w-full border border-copper/25 p-2 pr-8 rounded bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLlmKey(!showLlmKey)}
                    className="absolute right-2 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showLlmKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {llmTestResult && (
              <div className={`p-3 rounded text-xs font-mono border ${
                llmTestResult.success ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                {llmTestResult.message || llmTestResult.error}
              </div>
            )}
          </div>

          {/* Section: GitHub Integration */}
          <div className="p-4 bg-ivory/50 border border-copper/20 rounded space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-bold font-mono text-copper uppercase text-xs flex items-center gap-2">
                <GitBranch size={14} />
                <span>2. GitHub Repository Inspection Token</span>
              </div>
              <button
                type="button"
                onClick={handleTestGh}
                disabled={testingGh}
                className="cursor-pointer font-mono text-[11px] px-3 py-1 bg-burgundy text-ivory rounded hover:bg-burgundy-light flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={11} className={testingGh ? 'animate-spin' : ''} />
                <span>{testingGh ? 'Verifying...' : 'Verify Rate Limit'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-copper uppercase font-bold mb-1">
                  Personal Access Token (PAT) {cfg?.hasGithubToken && <span className="text-emerald-700 lowercase">(active: {cfg.githubTokenMasked})</span>}
                </label>
                <div className="relative">
                  <input
                    type={showGhToken ? 'text' : 'password'}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder={cfg?.hasGithubToken ? 'Leave empty to keep current token' : 'github_pat_...'}
                    className="w-full border border-copper/25 p-2 pr-8 rounded bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGhToken(!showGhToken)}
                    className="absolute right-2 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showGhToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center text-[11px] text-zinc-500 pt-5">
                Used to inspect private/public repositories and clone code into isolated sandboxes.
              </div>
            </div>

            {ghTestResult && (
              <div className={`p-3 rounded text-xs font-mono border ${
                ghTestResult.success ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                {ghTestResult.message || ghTestResult.error}
              </div>
            )}
          </div>

          {/* Section: Sandbox & CLI Execution Policies */}
          <div className="p-4 bg-ivory/50 border border-copper/20 rounded space-y-4">
            <div className="font-bold font-mono text-copper uppercase text-xs flex items-center gap-2">
              <Server size={14} />
              <span>3. Execution Sandbox Mode & Safety Gates</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] text-copper uppercase font-bold mb-1">
                  Runner Infrastructure Architecture
                </label>
                <select
                  value={agentRunnerMode}
                  onChange={(e) => setAgentRunnerMode(e.target.value as any)}
                  className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                >
                  <option value="builtin-sandbox">Platform-Managed Isolated Sandbox (Recommended - Zero Setup)</option>
                  <option value="external-docker">External Docker / Worker Container</option>
                </select>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Built-in mode automatically isolates repositories, installs dependencies, and executes with restricted process trees.
                </p>
              </div>

              {agentRunnerMode === 'external-docker' && (
                <div>
                  <label className="block font-mono text-[10px] text-copper uppercase font-bold mb-1">
                    External Runner URL
                  </label>
                  <input
                    type="url"
                    value={agentRunnerUrl}
                    onChange={(e) => setAgentRunnerUrl(e.target.value)}
                    placeholder="http://localhost:5000"
                    className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                  />
                </div>
              )}

              <div className="md:col-span-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableCliRunner}
                    onChange={(e) => setEnableCliRunner(e.target.checked)}
                    className="w-4 h-4 text-copper rounded border-copper/30 focus:ring-copper"
                  />
                  <div>
                    <span className="font-bold font-mono text-burgundy text-xs">Authorize Local CLI Runner</span>
                    <p className="text-[11px] text-zinc-500">
                      Allows agents configured with <code>node</code> or <code>python</code> binaries to execute in sandbox without manually editing .env.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer bg-copper text-ivory px-6 py-2.5 rounded font-sans font-bold hover:bg-copper-dark transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saving ? 'Saving to Database...' : 'Save Configuration In-App'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
