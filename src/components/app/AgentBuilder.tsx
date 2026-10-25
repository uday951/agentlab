import { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Shield,
  Activity,
  RefreshCw,
  GitBranch,
  Search,
  Wrench,
  FileCode,
  Terminal,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
} from 'lucide-react';
import { api, type Agent } from '../../lib/api';

export const AgentBuilder = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, any>>({});
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [expandedLogsId, setExpandedLogsId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connectionType, setConnectionType] = useState<'builtin' | 'api' | 'cli' | 'import'>('builtin');
  const [model, setModel] = useState('Deterministic Policy Planner v1.2');
  const [endpoint, setEndpoint] = useState('');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'api_key' | 'basic'>('none');
  const [authHeader, setAuthHeader] = useState('');
  const [cliCommand, setCliCommand] = useState('node agent.js');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [entrypoint, setEntrypoint] = useState('agent.py');
  const [runtime, setRuntime] = useState('nodejs');
  const [envVarsString, setEnvVarsString] = useState('');
  const [inspectingRepo, setInspectingRepo] = useState(false);
  const [repoInspection, setRepoInspection] = useState<any>(null);
  const [timeoutMs, setTimeoutMs] = useState(15000);

  const loadAgents = async () => {
    try {
      const data = await api.getAgents();
      setAgents(data);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const openCreateModal = () => {
    setEditingAgent(null);
    setName('');
    setDescription('');
    setConnectionType('builtin');
    setModel('Deterministic Policy Planner v1.2');
    setEndpoint('');
    setAuthType('none');
    setAuthHeader('');
    setCliCommand('node agent.js');
    setRepoUrl('');
    setBranch('main');
    setEntrypoint('agent.py');
    setRuntime('nodejs');
    setEnvVarsString('');
    setRepoInspection(null);
    setShowModal(true);
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setDescription(agent.description || '');
    setConnectionType(agent.connectionType);
    setModel(agent.model || 'Custom Model');
    setEndpoint(agent.endpoint || '');
    setAuthType(agent.authType || 'none');
    setAuthHeader(agent.authHeader || '');
    setCliCommand(agent.cliCommand || 'node agent.js');
    setRepoUrl(agent.repoUrl || '');
    setBranch((agent as any).branch || 'main');
    setEntrypoint(agent.entrypoint || 'agent.py');
    setRuntime((agent as any).runtime || 'nodejs');
    setEnvVarsString(
      (agent as any).envVars
        ? Object.entries((agent as any).envVars)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n')
        : ''
    );
    setShowModal(true);
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.testAgent(id);
      setTestResult((prev) => ({ ...prev, [id]: res }));
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [id]: { success: false, message: err.message },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handlePrepareAgent = async (id: string) => {
    setPreparingId(id);
    try {
      const res = await api.prepareAgent(id);
      if (res.success) {
        setExpandedLogsId(id);
        await loadAgents();
      } else {
        alert(`Preparation failed: ${res.data?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Preparation error: ${err.message}`);
    } finally {
      setPreparingId(null);
    }
  };

  const handleInspectRepo = async () => {
    if (!repoUrl) return;
    setInspectingRepo(true);
    try {
      const res = await api.inspectRepo(repoUrl);
      if (res.success && res.data) {
        setRepoInspection(res.data);
        if (res.data.suggestedEntrypoints?.length > 0) {
          setEntrypoint(res.data.suggestedEntrypoints[0]);
        }
        if (res.data.language === 'Python') {
          setRuntime('python');
        } else {
          setRuntime('nodejs');
        }
      }
    } catch (err: any) {
      alert(`Repository inspection error: ${err.message}`);
    } finally {
      setInspectingRepo(false);
    }
  };

  const parseEnvVars = (str: string): Record<string, string> => {
    const res: Record<string, string> = {};
    const lines = str.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        res[k] = v;
      }
    }
    return res;
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const payload: Partial<Agent> = {
      name,
      description,
      connectionType,
      model,
      endpoint: connectionType === 'api' ? endpoint : undefined,
      authType: connectionType === 'api' ? authType : undefined,
      authHeader: connectionType === 'api' && authHeader ? authHeader : undefined,
      cliCommand: connectionType === 'cli' ? cliCommand : undefined,
      repoUrl: connectionType === 'import' ? repoUrl : undefined,
      entrypoint: connectionType === 'import' ? entrypoint : undefined,
      branch: connectionType === 'import' ? branch : undefined,
      runtime: connectionType === 'import' ? runtime : undefined,
      envVars: parseEnvVars(envVarsString) as any,
      timeoutMs,
      capabilities: ['simulated_tools', 'rag_retrieval'],
      tools: ['lookup_order', 'retrieve_policy', 'check_refund_eligibility', 'process_refund', 'escalate_to_manager'],
    };

    try {
      if (editingAgent) {
        await api.updateAgent(editingAgent.id, payload);
      } else {
        await api.createAgent(payload);
      }
      setShowModal(false);
      loadAgents();
    } catch (err: any) {
      alert(`Error saving agent: ${err.message}`);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      await api.deleteAgent(id);
      loadAgents();
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-6xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">
            Agent Connection Center
          </h1>
          <p className="text-xs sm:text-sm text-burgundy/60">
            Configure, inspect, prepare, and validate autonomous agents across REST APIs, GitHub repositories, CLI binaries, or built-in test adapters.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="cursor-pointer flex items-center gap-2 bg-burgundy text-ivory px-4 py-2 text-xs font-bold hover:bg-burgundy-light rounded transition-colors self-start sm:self-auto shadow-sm"
        >
          <Plus size={15} />
          <span>Connect New Agent</span>
        </button>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded text-xs font-mono text-amber-900 flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Agents List */}
      <div className="space-y-4">
        {agents.map((agent) => {
          const result = testResult[agent.id];
          const isPreparing = preparingId === agent.id;
          const showLogs = expandedLogsId === agent.id;

          return (
            <div
              key={agent.id}
              className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm hover:border-copper/40 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded bg-[#3A0D1C] text-copper flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <Bot size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-burgundy">{agent.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper/15 text-copper font-bold uppercase">
                        {agent.connectionType}
                      </span>

                      {/* Preparation Status for Imported/CLI Agents */}
                      {agent.connectionType === 'import' && (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            agent.preparationStatus === 'ready'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : agent.preparationStatus === 'failed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {agent.preparationStatus === 'ready'
                            ? 'Sandbox Ready'
                            : agent.preparationStatus === 'failed'
                            ? 'Prep Failed'
                            : 'Needs Preparation'}
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-burgundy/50">
                        Model: {agent.model}
                      </span>
                    </div>

                    <p className="text-xs text-burgundy/60 mt-1 max-w-2xl">
                      {agent.description || 'No description provided.'}
                    </p>

                    {/* Metadata specs */}
                    {agent.connectionType === 'api' && (
                      <div className="font-mono text-[11px] text-copper mt-1.5 flex items-center gap-1.5">
                        <Activity size={12} />
                        <span>Endpoint: {agent.endpoint || 'Not configured'}</span>
                      </div>
                    )}

                    {agent.connectionType === 'cli' && (
                      <div className="font-mono text-[11px] text-zinc-600 mt-1.5 flex items-center gap-1.5">
                        <Terminal size={12} className="text-copper" />
                        <span>Command: <code>{agent.cliCommand || 'Not set'}</code></span>
                      </div>
                    )}

                    {agent.connectionType === 'import' && (
                      <div className="font-mono text-[11px] text-zinc-600 mt-1.5 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <GitBranch size={12} className="text-copper" />
                          <span>{agent.repoUrl || 'Local Repo'}</span>
                        </span>
                        <span>· Entrypoint: <code>{agent.entrypoint || 'index.js'}</code></span>
                        {(agent as any).runtime && <span>· Runtime: {(agent as any).runtime}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-end md:self-start">
                  {/* Prepare Environment Button for Imported Code */}
                  {agent.connectionType === 'import' && (
                    <button
                      onClick={() => handlePrepareAgent(agent.id)}
                      disabled={isPreparing}
                      className="cursor-pointer flex items-center gap-1.5 bg-copper text-ivory hover:bg-copper-dark px-3 py-1.5 text-xs font-mono rounded transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <Wrench size={12} className={isPreparing ? 'animate-spin' : ''} />
                      <span>{isPreparing ? 'Preparing Sandbox...' : 'Prepare Sandbox'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleTestConnection(agent.id)}
                    disabled={testingId === agent.id}
                    className="cursor-pointer flex items-center gap-1.5 border border-copper/30 text-copper hover:bg-copper hover:text-ivory px-3 py-1.5 text-xs font-mono rounded transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={testingId === agent.id ? 'animate-spin' : ''} />
                    <span>{testingId === agent.id ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  <button
                    onClick={() => openEditModal(agent)}
                    className="p-1.5 text-burgundy/60 hover:text-burgundy transition-colors cursor-pointer"
                    title="Edit Agent Configuration"
                  >
                    <Edit3 size={15} />
                  </button>

                  {agent.id !== 'agent-sample-support' && (
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="p-1.5 text-burgundy/40 hover:text-rose-700 transition-colors cursor-pointer"
                      title="Delete Agent"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Test Connection Output Feedback */}
              {result && (
                <div
                  className={`mt-4 p-3 rounded text-xs font-mono border ${
                    result.status === 'connected' || result.success
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : result.status === 'needs_configuration'
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-rose-50 text-rose-900 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-0.5">
                    {result.status === 'connected' || result.success ? (
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={14} className="text-amber-600" />
                    )}
                    <span>
                      {result.status === 'connected'
                        ? 'Operational & Ready'
                        : result.status === 'needs_configuration'
                        ? 'Configuration Required'
                        : 'Connection Error'}
                    </span>
                    {result.latencyMs !== undefined && (
                      <span className="text-[10px] text-zinc-500 font-normal">({result.latencyMs}ms ping)</span>
                    )}
                  </div>
                  <p className="text-[11px] mt-1">{result.message}</p>
                </div>
              )}

              {/* Preparation Logs Accordion */}
              {agent.preparationLogs && (
                <div className="mt-3">
                  <button
                    onClick={() => setExpandedLogsId(showLogs ? null : agent.id)}
                    className="text-[10px] font-mono text-copper hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FileCode size={11} />
                    <span>{showLogs ? 'Hide Preparation Logs' : 'View Sandbox Preparation Logs'}</span>
                    {showLogs ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>

                  {showLogs && (
                    <pre className="mt-2 p-3 bg-zinc-900 text-zinc-200 text-[10px] font-mono rounded max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {agent.preparationLogs}
                    </pre>
                  )}
                </div>
              )}

              {/* Configured Tools & Capabilities */}
              <div className="mt-4 pt-3 border-t border-copper/10 flex flex-wrap items-center gap-2 text-[10px] font-mono text-burgundy/60">
                <span className="font-bold text-burgundy/70">Tools:</span>
                {agent.tools.map((t, idx) => (
                  <span key={idx} className="bg-ivory border border-copper/15 px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Connect or Edit Agent */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-copper/30 rounded-lg max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-xl font-bold text-burgundy mb-1">
              {editingAgent ? `Edit Agent: ${editingAgent.name}` : 'Register New AI Agent'}
            </h2>
            <p className="text-xs text-burgundy/60 mb-5">
              Configure connection parameters, runtime settings, and sandboxed execution properties.
            </p>

            <form onSubmit={handleSaveAgent} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                  Connection Architecture
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'builtin', label: 'Built-in Agent' },
                    { id: 'api', label: 'HTTP REST API' },
                    { id: 'cli', label: 'CLI Runner' },
                    { id: 'import', label: 'Import / GitHub' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => {
                        setConnectionType(t.id as any);
                        if (t.id === 'builtin') setModel('Deterministic Policy Planner v1.2');
                        if (t.id === 'api') setModel('deepseek-chat');
                      }}
                      className={`cursor-pointer p-2 rounded text-center font-mono border text-[11px] transition-all ${
                        connectionType === t.id
                          ? 'border-copper bg-copper text-ivory font-bold'
                          : 'border-copper/20 text-burgundy hover:border-copper/40'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                  Agent Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SupportOperations-DeepSeek"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-copper/25 p-2 rounded focus:outline-none focus:border-copper bg-ivory font-sans"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Task responsibility, model, or team role..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-copper/25 p-2 rounded focus:outline-none focus:border-copper bg-ivory resize-none font-sans"
                />
              </div>

              {/* API Configuration */}
              {connectionType === 'api' && (
                <div className="space-y-3 p-3 bg-ivory/50 border border-copper/15 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                        API Endpoint URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://api.deepseek.com/chat/completions"
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                        Model ID
                      </label>
                      <input
                        type="text"
                        placeholder="deepseek-chat"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                    <Shield size={11} className="text-emerald-700" />
                    <span>Protected by SSRF guardrail (private networks blocked).</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                        Authentication Type
                      </label>
                      <select
                        value={authType}
                        onChange={(e) => setAuthType(e.target.value as any)}
                        className="w-full border border-copper/25 p-2 rounded bg-white text-xs"
                      >
                        <option value="none">None</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="api_key">API Key (X-API-Key)</option>
                        <option value="basic">Basic Auth</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        min={500}
                        max={60000}
                        value={timeoutMs}
                        onChange={(e) => setTimeoutMs(Number(e.target.value))}
                        className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                      />
                    </div>
                  </div>

                  {authType !== 'none' && (
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                        Credential Secret / Key
                      </label>
                      <input
                        type="password"
                        placeholder="Secret key or token..."
                        value={authHeader}
                        onChange={(e) => setAuthHeader(e.target.value)}
                        className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* CLI Configuration */}
              {connectionType === 'cli' && (
                <div className="space-y-3 p-3 bg-zinc-50 border border-zinc-200 rounded text-zinc-700">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                      Execution Command
                    </label>
                    <input
                      type="text"
                      placeholder="node agent.js or python agent.py"
                      value={cliCommand}
                      onChange={(e) => setCliCommand(e.target.value)}
                      className="w-full border border-zinc-300 p-2 rounded bg-white font-mono"
                    />
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Approved binaries: <code>node, python, python3, deno, bun, sh, bash</code>.
                    </div>
                  </div>
                </div>
              )}

              {/* GitHub / Project Import Configuration */}
              {connectionType === 'import' && (
                <div className="space-y-3 p-3 bg-copper/5 border border-copper/20 rounded">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                      GitHub Repository URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://github.com/owner/agent-repo"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        className="flex-1 border border-copper/25 p-2 rounded bg-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleInspectRepo}
                        disabled={inspectingRepo || !repoUrl}
                        className="cursor-pointer bg-burgundy text-ivory px-3 py-1.5 rounded font-mono text-[11px] hover:bg-burgundy-light flex items-center gap-1 disabled:opacity-50"
                      >
                        <Search size={12} className={inspectingRepo ? 'animate-spin' : ''} />
                        <span>{inspectingRepo ? 'Inspecting...' : 'Inspect'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                        Entrypoint File
                      </label>
                      <input
                        type="text"
                        value={entrypoint}
                        onChange={(e) => setEntrypoint(e.target.value)}
                        placeholder="backend/server.js or index.js"
                        className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                      />
                      {(repoInspection?.suggestedEntrypoints || editingAgent?.detectedManifest?.suggestedEntrypoints)?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1 items-center">
                          <span className="text-[9px] text-zinc-500 font-mono">Suggested:</span>
                          {(repoInspection?.suggestedEntrypoints || editingAgent?.detectedManifest?.suggestedEntrypoints).map((ep: string) => (
                            <button
                              key={ep}
                              type="button"
                              onClick={() => setEntrypoint(ep)}
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border cursor-pointer ${
                                entrypoint === ep
                                  ? 'bg-copper text-ivory border-copper font-bold'
                                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                              }`}
                            >
                              {ep}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Environment Variables Editor */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                      Custom Environment Variables (KEY=VALUE per line)
                    </label>
                    <textarea
                      rows={2}
                      value={envVarsString}
                      onChange={(e) => setEnvVarsString(e.target.value)}
                      placeholder="MODEL_NAME=gpt-4&#10;DEBUG=true"
                      className="w-full border border-copper/25 p-2 rounded bg-white font-mono text-xs"
                    />
                  </div>

                  {repoInspection && (
                    <div className="p-3 bg-white border border-copper/20 rounded font-mono text-[11px] text-zinc-700 space-y-1">
                      <div className="font-bold text-copper flex items-center gap-1">
                        <Check size={12} /> Repository Verified: {repoInspection.fullName}
                      </div>
                      <div>Language: <strong>{repoInspection.language}</strong></div>
                      <div>Default Branch: {repoInspection.defaultBranch}</div>
                      <div>
                        Suggested Entrypoints: {repoInspection.suggestedEntrypoints?.join(', ') || 'None'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-copper/15">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-copper/30 text-burgundy hover:bg-copper/5 rounded text-xs cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-burgundy text-ivory hover:bg-burgundy-light rounded text-xs font-bold cursor-pointer"
                >
                  {editingAgent ? 'Update Agent' : 'Save Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
