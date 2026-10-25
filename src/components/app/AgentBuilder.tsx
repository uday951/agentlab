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
} from 'lucide-react';
import { api, type Agent } from '../../lib/api';

export const AgentBuilder = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, any>>({});
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connectionType, setConnectionType] = useState<'builtin' | 'api' | 'cli' | 'import'>('builtin');
  const [endpoint, setEndpoint] = useState('');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'api_key' | 'basic'>('none');
  const [authHeader, setAuthHeader] = useState('');
  const [cliCommand, setCliCommand] = useState('node agent.js');
  const [repoUrl, setRepoUrl] = useState('');
  const [entrypoint, setEntrypoint] = useState('agent.py');
  const [inspectingRepo, setInspectingRepo] = useState(false);
  const [repoInspection, setRepoInspection] = useState<any>(null);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const model = 'Deterministic Policy Planner v1.2';

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
      }
    } catch (err: any) {
      alert(`Repository inspection error: ${err.message}`);
    } finally {
      setInspectingRepo(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      await api.createAgent({
        name,
        description,
        connectionType,
        endpoint: connectionType === 'api' ? endpoint : undefined,
        authType: connectionType === 'api' ? authType : undefined,
        authHeader: connectionType === 'api' && authHeader ? authHeader : undefined,
        cliCommand: connectionType === 'cli' ? cliCommand : undefined,
        repoUrl: connectionType === 'import' ? repoUrl : undefined,
        entrypoint: connectionType === 'import' ? entrypoint : undefined,
        timeoutMs,
        model,
        capabilities: ['simulated_tools', 'rag_retrieval'],
        tools: ['lookup_order', 'retrieve_policy', 'check_refund_eligibility', 'process_refund', 'escalate_to_manager'],
      });
      setShowModal(false);
      setName('');
      setDescription('');
      setEndpoint('');
      setRepoUrl('');
      setRepoInspection(null);
      loadAgents();
    } catch (err: any) {
      alert(`Error creating agent: ${err.message}`);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      await api.deleteAgent(id);
      loadAgents();
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">
            Agent Connection Center
          </h1>
          <p className="font-sans text-xs sm:text-sm text-burgundy/60">
            Register autonomous agents via Built-in deterministic logic, external REST APIs, CLI runners, or project imports.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="cursor-pointer flex items-center gap-2 bg-burgundy text-ivory px-4 py-2 text-xs font-sans font-bold hover:bg-burgundy-light rounded transition-colors self-start sm:self-auto"
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
          return (
            <div
              key={agent.id}
              className="bg-white border border-copper/20 p-5 rounded shadow-sm hover:border-copper/40 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded bg-[#3A0D1C] text-copper flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-sans font-bold text-base text-burgundy">{agent.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper/15 text-copper font-bold uppercase">
                        {agent.connectionType}
                      </span>
                      {agent.authType && agent.authType !== 'none' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold uppercase">
                          Auth: {agent.authType}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-burgundy/40">
                        Model: {agent.model}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-burgundy/60 mt-1 max-w-2xl">
                      {agent.description || 'No description provided.'}
                    </p>

                    {agent.connectionType === 'api' && (
                      <div className="font-mono text-[11px] text-copper mt-1.5 flex items-center gap-1.5">
                        <Activity size={12} />
                        <span>Endpoint: {agent.endpoint || 'Not configured'}</span>
                      </div>
                    )}

                    {agent.connectionType === 'cli' && (
                      <div className="font-mono text-[11px] text-zinc-600 mt-1.5">
                        Command: <code>{agent.cliCommand || 'Not set'}</code>
                      </div>
                    )}

                    {agent.connectionType === 'import' && (
                      <div className="font-mono text-[11px] text-zinc-600 mt-1.5 flex items-center gap-2">
                        <GitBranch size={12} className="text-copper" />
                        <span>Repo: {agent.repoUrl || 'Not configured'}</span>
                        <span>· Entrypoint: {agent.entrypoint || 'agent.py'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center">
                  <button
                    onClick={() => handleTestConnection(agent.id)}
                    disabled={testingId === agent.id}
                    className="cursor-pointer flex items-center gap-1.5 border border-copper/30 text-copper hover:bg-copper hover:text-ivory px-3 py-1.5 text-xs font-mono rounded transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={testingId === agent.id ? 'animate-spin' : ''} />
                    <span>{testingId === agent.id ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  {agent.id !== 'agent-sample-support' && (
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="p-1.5 text-burgundy/40 hover:text-red-700 transition-colors cursor-pointer"
                      title="Delete Agent"
                    >
                      <Trash2 size={16} />
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
                        : 'Connection Check Failed'}
                    </span>
                    {result.latencyMs !== undefined && (
                      <span className="font-normal text-[10px] text-zinc-500">
                        ({result.latencyMs}ms roundtrip)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-1">{result.message}</p>
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

      {/* Modal: Connect New Agent */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-copper/30 rounded-lg max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-xl font-bold text-burgundy mb-1">
              Register New AI Agent
            </h2>
            <p className="font-sans text-xs text-burgundy/60 mb-5">
              Choose connection architecture and configure endpoint parameters.
            </p>

            <form onSubmit={handleCreateAgent} className="space-y-4 font-sans text-xs">
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
                      onClick={() => setConnectionType(t.id as any)}
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
                  placeholder="e.g. CustomerOperations-GPT4o"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-copper/25 p-2 rounded focus:outline-none focus:border-copper bg-ivory"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Task responsibility and capabilities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-copper/25 p-2 rounded focus:outline-none focus:border-copper bg-ivory resize-none"
                />
              </div>

              {/* API Configuration */}
              {connectionType === 'api' && (
                <div className="space-y-3 p-3 bg-ivory/50 border border-copper/15 rounded">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                      API Endpoint URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://my-agent.company.com/v1/chat"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      className="w-full border border-copper/25 p-2 rounded focus:outline-none focus:border-copper bg-white font-mono"
                    />
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1 font-mono">
                      <Shield size={11} className="text-emerald-700" />
                      <span>Protected by SSRF guardrail (private networks blocked).</span>
                    </div>
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
                      placeholder="node agent.js"
                      value={cliCommand}
                      onChange={(e) => setCliCommand(e.target.value)}
                      className="w-full border border-zinc-300 p-2 rounded bg-white font-mono"
                    />
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Approved binaries: <code>node, python, python3, deno, bun, sh, bash</code>.
                    </div>
                  </div>
                  <div className="text-[11px] bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-900">
                    <strong>Security Boundary:</strong> CLI execution requires <code>ENABLE_CLI_RUNNER=true</code> in your server <code>.env</code>.
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
                        className="cursor-pointer bg-copper text-ivory px-3 py-2 rounded font-mono text-[11px] font-bold hover:bg-copper-dark disabled:opacity-50 flex items-center gap-1"
                      >
                        <Search size={12} />
                        <span>{inspectingRepo ? 'Checking...' : 'Inspect'}</span>
                      </button>
                    </div>
                  </div>

                  {repoInspection && (
                    <div className="p-2.5 bg-white border border-copper/20 rounded text-[11px] font-mono space-y-1">
                      <div>Repository: <strong>{repoInspection.fullName}</strong></div>
                      <div>Branch: <strong>{repoInspection.defaultBranch}</strong></div>
                      <div>Language: <strong>{repoInspection.language}</strong></div>
                    </div>
                  )}

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                      Entry Point Script
                    </label>
                    <input
                      type="text"
                      placeholder="agent.py or src/index.js"
                      value={entrypoint}
                      onChange={(e) => setEntrypoint(e.target.value)}
                      className="w-full border border-copper/25 p-2 rounded bg-white font-mono"
                    />
                  </div>

                  <div className="text-[11px] bg-zinc-100 border border-zinc-300 p-2.5 rounded text-zinc-700 leading-relaxed">
                    <strong>Isolated Runner Requirement:</strong> Source repositories are not executed inside the web server. An isolated container runner (<code>AGENT_RUNNER_URL</code>) is required to execute imported code in Docker.
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-copper/15">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded border border-copper/30 text-burgundy hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-burgundy text-ivory font-bold hover:bg-burgundy-light cursor-pointer"
                >
                  Save Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
