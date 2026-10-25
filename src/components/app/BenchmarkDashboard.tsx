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
  Server,
  Plus,
  Code,
  Radio,
  Send,
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
  type McpConnectionRecord,
  type McpToolDefinition,
  type McpBenchmarkJob,
  type McpTransport,
  type McpAuthType,
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
  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'scenarios' | 'results' | 'mcp_explorer'>('dashboard');

  // Universal MCP Registry & Explorer State
  const [mcpConnections, setMcpConnections] = useState<McpConnectionRecord[]>([]);
  const [selectedMcpConn, setSelectedMcpConn] = useState<McpConnectionRecord | null>(null);
  const [selectedMcpTool, setSelectedMcpTool] = useState<McpToolDefinition | null>(null);
  const [toolArgsInput, setToolArgsInput] = useState('{}');
  const [toolExecuting, setToolExecuting] = useState(false);
  const [toolResult, setToolResult] = useState<any | null>(null);
  const [toolError, setToolError] = useState<string | null>(null);
  const [toolApprovalPrompt, setToolApprovalPrompt] = useState(false);

  // Universal MCP Connect Form State
  const [connDisplayName, setConnDisplayName] = useState('');
  const [connPreset, setConnPreset] = useState<'lovable' | 'bolt' | 'replit' | 'emergent' | 'custom'>('lovable');
  const [connTransport, setConnTransport] = useState<McpTransport>('streamable_http');
  const [connServerUrl, setConnServerUrl] = useState('https://mcp.lovable.dev');
  const [connLocalCommand, setConnLocalCommand] = useState('npx');
  const [connLocalArgs, setConnLocalArgs] = useState('-y @modelcontextprotocol/server-everything');
  const [connAuthType, setConnAuthType] = useState<McpAuthType>('oauth_dcr');
  const [connBearerToken, setConnBearerToken] = useState('');
  const [connApiKey, setConnApiKey] = useState('');
  const [connClientId, setConnClientId] = useState('');
  const [connClientSecret, setConnClientSecret] = useState('');
  const [connSubmitting, setConnSubmitting] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<any | null>(null);
  const [discovering, setDiscovering] = useState(false);

  // Universal MCP Benchmark State
  const [selectedBenchmarkMcpId, setSelectedBenchmarkMcpId] = useState<string>('');
  const [mcpBenchmarkPrompt, setMcpBenchmarkPrompt] = useState('');
  const [mcpBenchmarkCategory, setMcpBenchmarkCategory] = useState('auto');
  const [activeMcpJob, setActiveMcpJob] = useState<McpBenchmarkJob | null>(null);
  const [mcpBenchSubmitting, setMcpBenchSubmitting] = useState(false);
  const [mcpBenchError, setMcpBenchError] = useState<string | null>(null);
  const mcpPollTimerRef = useRef<any>(null);

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
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const pollTimerRef = useRef<any>(null);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, projectsRes, runsRes, provList, mcpList] = await Promise.all([
        api.getBenchmarkStats().catch(() => null),
        api.getBenchmarkProjects().catch(() => []),
        api.getBenchmarkRuns().catch(() => []),
        api.getProviders().catch(() => []),
        api.getMcpConnections().catch(() => []),
      ]);
      setStats(statsRes);
      setProjects(projectsRes);
      setRuns(runsRes);
      setProviders(provList);
      setMcpConnections(mcpList);
      if (mcpList.length > 0 && !selectedMcpConn) {
        setSelectedMcpConn(mcpList[0]);
        if (mcpList[0].discoveredTools.length > 0) {
          setSelectedMcpTool(mcpList[0].discoveredTools[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load benchmark data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Check OAuth return query parameters (including universal MCP)
    const params = new URLSearchParams(window.location.search);
    const mcpConnectedParam = params.get('mcp_connected');
    const mcpErrorParam = params.get('mcp_error');
    const connectedParam = params.get('connected');
    const errorParam = params.get('error');

    if (mcpConnectedParam) {
      setProviderNotice({
        type: 'success',
        text: `Successfully authenticated & verified MCP server connection!`,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (mcpErrorParam) {
      setProviderNotice({
        type: 'error',
        text: `MCP Authorization Error: ${decodeURIComponent(mcpErrorParam)}`,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (connectedParam) {
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

  // Poll active MCP benchmark job
  useEffect(() => {
    if (activeMcpJob && !['completed', 'failed'].includes(activeMcpJob.status)) {
      mcpPollTimerRef.current = setTimeout(async () => {
        try {
          const updated = await api.getMcpBenchmarkJob(activeMcpJob.id);
          setActiveMcpJob(updated);
          if (updated.status === 'completed') {
            await loadAllData();
          }
        } catch {}
      }, 2500);
    }
    return () => {
      if (mcpPollTimerRef.current) clearTimeout(mcpPollTimerRef.current);
    };
  }, [activeMcpJob]);

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

  // ==========================================
  // Universal MCP Actions & Handlers
  // ==========================================

  const handleDiscoverServer = async () => {
    if (!connServerUrl.trim()) return;
    setDiscovering(true);
    setConnError(null);
    try {
      const disc = await api.discoverMcpServer(connServerUrl.trim(), connTransport);
      setDiscoveryResult(disc);

      // Auto-set the best supported auth type
      if (disc.supportedAuth && disc.supportedAuth.length > 0) {
        if (disc.supportedAuth.includes('oauth_dcr')) {
          setConnAuthType('oauth_dcr');
        } else if (disc.supportedAuth.includes('oauth_client_credentials')) {
          setConnAuthType('oauth_client_credentials');
        } else if (disc.supportedAuth.includes('none') && disc.publicAccess) {
          setConnAuthType('none');
        } else if (disc.supportedAuth.includes('bearer')) {
          setConnAuthType('bearer');
        }
      }
    } catch (err: any) {
      setConnError(`Discovery failed: ${err.message}`);
    } finally {
      setDiscovering(false);
    }
  };

  const handleConnectMcpServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnSubmitting(true);
    setConnError(null);

    try {
      // If OAuth is selected, start standards-compliant OAuth flow with PKCE
      if (connAuthType === 'oauth_dcr' || connAuthType === 'oauth_client_credentials') {
        const { authUrl } = await api.getMcpOAuthAuthorizeUrl({
          serverUrl: connServerUrl.trim(),
          displayName: connDisplayName.trim() || 'MCP Server',
          preset: connPreset,
          clientId: connClientId.trim() || undefined,
          clientSecret: connClientSecret.trim() || undefined,
        });

        if (authUrl) {
          window.location.href = authUrl;
          return;
        }
      }

      // Otherwise connect directly (Bearer, API Key, None, or Stdio)
      const parsedArgs = connTransport === 'stdio'
        ? connLocalArgs.split(' ').map((s) => s.trim()).filter(Boolean)
        : [];

      const created = await api.connectMcpServer({
        displayName: connDisplayName.trim() || 'Custom MCP Server',
        preset: connPreset,
        transport: connTransport,
        serverUrl: connTransport !== 'stdio' ? connServerUrl.trim() : undefined,
        localCommand: connTransport === 'stdio' ? connLocalCommand.trim() : undefined,
        localArgs: parsedArgs,
        authType: connAuthType,
        bearerToken: connBearerToken.trim() || undefined,
        apiKey: connApiKey.trim() || undefined,
      });

      setShowStartModal(false);
      await loadAllData();
      setSelectedMcpConn(created);
      setActiveTab('mcp_explorer');
      setProviderNotice({ type: 'success', text: `Connected to MCP server "${created.displayName}" (${created.discoveredTools.length} tools discovered)!` });
    } catch (err: any) {
      setConnError(err.message || 'Failed to connect MCP server.');
    } finally {
      setConnSubmitting(false);
    }
  };

  const handleReconnectMcp = async (connId: string) => {
    try {
      const updated = await api.reconnectMcpConnection(connId);
      setMcpConnections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedMcpConn?.id === updated.id) setSelectedMcpConn(updated);
      setProviderNotice({ type: 'success', text: `Reconnected to "${updated.displayName}" successfully.` });
    } catch (err: any) {
      alert(`Reconnect error: ${err.message}`);
    }
  };

  const handleDisconnectMcp = async (connId: string) => {
    try {
      const updated = await api.disconnectMcpConnection(connId);
      setMcpConnections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedMcpConn?.id === updated.id) setSelectedMcpConn(updated);
      setProviderNotice({ type: 'success', text: 'Disconnected MCP server.' });
    } catch (err: any) {
      alert(`Disconnect error: ${err.message}`);
    }
  };

  const handleDeleteMcp = async (connId: string) => {
    if (!confirm('Are you sure you want to permanently delete this MCP connection and stored credentials?')) return;
    try {
      await api.deleteMcpConnection(connId);
      setMcpConnections((prev) => prev.filter((c) => c.id !== connId));
      if (selectedMcpConn?.id === connId) {
        setSelectedMcpConn(null);
        setSelectedMcpTool(null);
      }
      setProviderNotice({ type: 'success', text: 'MCP connection deleted.' });
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleInvokeTool = async (approvalConfirmed = false) => {
    if (!selectedMcpConn || !selectedMcpTool) return;
    setToolExecuting(true);
    setToolError(null);
    setToolResult(null);

    let parsedArgs: Record<string, any> = {};
    try {
      parsedArgs = JSON.parse(toolArgsInput || '{}');
    } catch {
      setToolError('Invalid JSON format for tool arguments.');
      setToolExecuting(false);
      return;
    }

    try {
      const res = await api.callMcpTool(selectedMcpConn.id, selectedMcpTool.name, parsedArgs, approvalConfirmed);
      if (res && res.requiresApproval) {
        setToolApprovalPrompt(true);
      } else {
        setToolResult(res);
        setToolApprovalPrompt(false);
      }
    } catch (err: any) {
      setToolError(err.message || 'Tool execution failed.');
    } finally {
      setToolExecuting(false);
    }
  };

  const handleStartMcpBenchmark = async () => {
    if (!selectedBenchmarkMcpId) {
      setMcpBenchError('Please select a connected MCP server.');
      return;
    }
    if (!mcpBenchmarkPrompt.trim()) {
      setMcpBenchError('Please enter a benchmark task prompt.');
      return;
    }

    setMcpBenchSubmitting(true);
    setMcpBenchError(null);
    try {
      const job = await api.startMcpBenchmark({
        connectionId: selectedBenchmarkMcpId,
        prompt: mcpBenchmarkPrompt.trim(),
        benchmarkCategory: mcpBenchmarkCategory,
      });
      setActiveMcpJob(job);
    } catch (err: any) {
      setMcpBenchError(err.message || 'Failed to start benchmark task.');
    } finally {
      setMcpBenchSubmitting(false);
    }
  };

  const handlePresetSelect = (preset: 'lovable' | 'bolt' | 'replit' | 'emergent' | 'custom') => {
    setConnPreset(preset);
    setDiscoveryResult(null);
    setConnError(null);

    if (preset === 'lovable') {
      setConnDisplayName('Lovable Platform');
      setConnTransport('streamable_http');
      setConnServerUrl('https://mcp.lovable.dev');
      setConnAuthType('oauth_dcr');
    } else if (preset === 'bolt') {
      setConnDisplayName('Bolt.new');
      setConnTransport('streamable_http');
      setConnServerUrl('');
      setConnAuthType('none');
    } else if (preset === 'replit') {
      setConnDisplayName('Replit Agent');
      setConnTransport('streamable_http');
      setConnServerUrl('');
      setConnAuthType('api_key');
    } else if (preset === 'emergent') {
      setConnDisplayName('Emergent');
      setConnTransport('streamable_http');
      setConnServerUrl('');
      setConnAuthType('api_key');
    } else {
      setConnDisplayName('Custom MCP Server');
      setConnTransport('streamable_http');
      setConnServerUrl('');
      setConnAuthType('none');
    }
  };

  const handleConnectOAuth = async (_provider?: string) => {
    try {
      const { authUrl } = await api.getMcpOAuthAuthorizeUrl({
        serverUrl: 'https://mcp.lovable.dev',
        displayName: 'Lovable Platform',
        preset: 'lovable',
      });
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (err: any) {
      setProviderNotice({
        type: 'error',
        text: `OAuth initialization error: ${err.message}`,
      });
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
      <div className="flex items-center gap-2 border-b border-copper/15 pb-2 text-xs font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'bg-burgundy text-ivory font-bold' : 'text-burgundy/60 hover:text-burgundy'
          }`}
        >
          All Projects & Stats
        </button>
        <button
          onClick={() => setActiveTab('mcp_explorer')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'mcp_explorer' ? 'bg-burgundy text-ivory font-bold' : 'text-burgundy/60 hover:text-burgundy'
          }`}
        >
          <Server size={13} />
          <span>MCP Servers & Tool Explorer ({mcpConnections.length})</span>
        </button>
        {selectedProject && (
          <>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'analysis' ? 'bg-burgundy text-ivory font-bold' : 'text-burgundy/60 hover:text-burgundy'
              }`}
            >
              <FileCode size={13} />
              <span>Project: {selectedProject.name}</span>
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'scenarios' ? 'bg-burgundy text-ivory font-bold' : 'text-burgundy/60 hover:text-burgundy'
              }`}
            >
              <CheckSquare size={13} />
              <span>Scenarios</span>
            </button>
          </>
        )}
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
                            const lovableMcp = mcpConnections.find((c) => c.preset === 'lovable');
                            if (lovableMcp) setSelectedBenchmarkMcpId(lovableMcp.id);
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

      {/* ========================================================================= */}
      {/* VIEW: Universal MCP Server Registry & Dynamic Tool Explorer */}
      {/* ========================================================================= */}
      {activeTab === 'mcp_explorer' && (
        <div className="space-y-6">
          {/* Top Bar for MCP Explorer */}
          <div className="bg-ivory border border-copper/25 rounded p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Server size={18} className="text-copper" />
                <h2 className="text-base font-bold font-display text-burgundy">
                  Universal MCP Server Registry & Tool Explorer
                </h2>
                <span className="text-[10px] bg-copper/20 text-copper px-2 py-0.5 rounded font-mono font-bold uppercase">
                  Standardized Model Context Protocol
                </span>
              </div>
              <p className="text-xs text-burgundy/70 mt-0.5">
                Connect compatible remote or local stdio MCP servers (Lovable, Bolt, Replit, Emergent, custom). Discover schemas, test tools, and run coding benchmarks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setStartModalMode('connect');
                  setShowStartModal(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus size={13} className="text-copper" />
                <span>Connect MCP Server</span>
              </button>
            </div>
          </div>

          {mcpConnections.length === 0 ? (
            <div className="bg-ivory border border-copper/20 rounded p-12 text-center space-y-3">
              <Server size={36} className="text-copper/40 mx-auto" />
              <h3 className="text-sm font-bold text-burgundy">No MCP Servers Connected Yet</h3>
              <p className="text-xs text-burgundy/60 max-w-md mx-auto">
                Connect an official MCP server (such as Lovable at <span className="font-mono text-burgundy">https://mcp.lovable.dev</span>), an arbitrary remote Streamable HTTP / SSE endpoint, or a local stdio server process.
              </p>
              <button
                onClick={() => {
                  setStartModalMode('connect');
                  setShowStartModal(true);
                }}
                className="px-4 py-2 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} className="text-copper" />
                <span>Connect First MCP Server</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Registered MCP Connections List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-burgundy uppercase">
                  <span>Registered Servers ({mcpConnections.length})</span>
                  <button
                    onClick={loadAllData}
                    className="text-[10px] text-burgundy/60 hover:text-burgundy flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {mcpConnections.map((c) => {
                    const isSelected = selectedMcpConn?.id === c.id;
                    const isConn = c.connectionStatus === 'connected';

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedMcpConn(c);
                          if (c.discoveredTools.length > 0) setSelectedMcpTool(c.discoveredTools[0]);
                          setToolResult(null);
                          setToolError(null);
                        }}
                        className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-ivory border-copper shadow-sm ring-1 ring-copper/40'
                            : 'bg-white border-copper/20 hover:border-copper/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-burgundy flex items-center gap-1.5 truncate">
                            <Radio size={12} className={isConn ? 'text-emerald-600' : 'text-slate-400'} />
                            {c.displayName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              isConn
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {c.connectionStatus}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-burgundy/60 mt-1 truncate">
                          {c.transport === 'stdio' ? `stdio: ${c.localCommand}` : c.serverUrl}
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-burgundy/70 border-t border-copper/10 pt-2">
                          <span>{c.discoveredTools.length} tools • {c.authType}</span>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleReconnectMcp(c.id)}
                              className="text-burgundy/60 hover:text-burgundy p-0.5"
                              title="Reconnect / Handshake"
                            >
                              <RefreshCw size={11} />
                            </button>
                            <button
                              onClick={() => handleDisconnectMcp(c.id)}
                              className="text-burgundy/60 hover:text-amber-700 p-0.5"
                              title="Disconnect"
                            >
                              <Radio size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteMcp(c.id)}
                              className="text-burgundy/60 hover:text-red-700 p-0.5"
                              title="Delete server"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Dynamic Tool Explorer & Invocation Panel */}
              <div className="md:col-span-2 space-y-4">
                {selectedMcpConn ? (
                  <div className="bg-ivory border border-copper/25 rounded p-5 shadow-sm space-y-4">
                    {/* Server Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-copper/15">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold font-display text-burgundy text-base">
                            {selectedMcpConn.displayName}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper/20 text-burgundy font-bold">
                            {selectedMcpConn.transport.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-burgundy/60 mt-0.5">
                          Protocol: {selectedMcpConn.protocolVersion || '2024-11-05'} • Auth: {selectedMcpConn.authType}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBenchmarkMcpId(selectedMcpConn.id);
                            setStartModalMode('generate');
                            setShowStartModal(true);
                          }}
                          className="px-3 py-1.5 bg-burgundy text-ivory text-xs font-bold rounded hover:bg-burgundy/90 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Play size={11} className="text-copper" />
                          <span>Run Benchmark on Platform</span>
                        </button>
                      </div>
                    </div>

                    {/* Discovered Tools Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-burgundy uppercase">
                          Discovered Tools ({selectedMcpConn.discoveredTools.length})
                        </span>
                        <span className="text-[10px] font-mono text-burgundy/60">
                          Click a tool to inspect schema and test execution
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {selectedMcpConn.discoveredTools.map((t) => {
                          const isSelectedTool = selectedMcpTool?.name === t.name;
                          return (
                            <div
                              key={t.name}
                              onClick={() => {
                                setSelectedMcpTool(t);
                                setToolResult(null);
                                setToolError(null);
                                setToolApprovalPrompt(false);
                                // Prepopulate sample arguments from schema
                                const sampleArgs: Record<string, any> = {};
                                const props = t.inputSchema?.properties || {};
                                for (const k of Object.keys(props)) {
                                  sampleArgs[k] = props[k].type === 'string' ? '' : props[k].type === 'number' ? 0 : {};
                                }
                                setToolArgsInput(JSON.stringify(sampleArgs, null, 2));
                              }}
                              className={`p-2.5 rounded border text-xs cursor-pointer transition-all ${
                                isSelectedTool
                                  ? 'bg-burgundy text-ivory border-burgundy'
                                  : 'bg-white border-copper/20 hover:border-copper/40 text-burgundy'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold font-mono text-[11px] truncate">{t.name}</span>
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                    isSelectedTool
                                      ? 'bg-ivory/20 text-ivory'
                                      : t.isReadOnly
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {t.category}
                                </span>
                              </div>
                              <p className={`text-[10px] line-clamp-1 mt-1 ${isSelectedTool ? 'text-ivory/80' : 'text-burgundy/60'}`}>
                                {t.description || 'No description provided'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Tool Invocation Inspector */}
                    {selectedMcpTool && (
                      <div className="border border-copper/20 bg-white rounded p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-burgundy text-xs flex items-center gap-1.5">
                              <Code size={13} className="text-copper" />
                              <span className="font-mono">{selectedMcpTool.name}</span>
                              {selectedMcpTool.requiresApproval && (
                                <span className="text-[9px] font-mono bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                                  Requires Explicit Approval
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-burgundy/70 mt-0.5">
                              {selectedMcpTool.description}
                            </p>
                          </div>
                        </div>

                        {/* Schema Inspector */}
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-burgundy/60 block mb-1">
                            Input Schema (JSON Schema):
                          </span>
                          <pre className="p-2 bg-ivory-dark/40 border border-copper/15 rounded text-[10px] font-mono text-burgundy/80 max-h-28 overflow-y-auto">
                            {JSON.stringify(selectedMcpTool.inputSchema, null, 2)}
                          </pre>
                        </div>

                        {/* JSON Arguments Editor */}
                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-burgundy/60 block mb-1">
                            Arguments (JSON payload):
                          </label>
                          <textarea
                            rows={3}
                            value={toolArgsInput}
                            onChange={(e) => setToolArgsInput(e.target.value)}
                            className="w-full p-2 text-xs font-mono border border-copper/30 rounded bg-white text-burgundy"
                          />
                        </div>

                        {/* Approval Confirmation Warning if triggered */}
                        {toolApprovalPrompt && (
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 space-y-2">
                            <div className="font-bold flex items-center gap-1.5 text-xs">
                              <AlertTriangle size={14} className="text-amber-700" />
                              <span>Confirmation Required for Mutating Tool</span>
                            </div>
                            <p className="text-[11px]">
                              Tool <strong className="font-mono">{selectedMcpTool.name}</strong> will modify external state or consume provider credits. Are you sure you want to proceed?
                            </p>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setToolApprovalPrompt(false)}
                                className="px-3 py-1 text-xs border border-copper/30 rounded hover:bg-copper/10 text-burgundy cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleInvokeTool(true)}
                                className="px-3 py-1 text-xs font-bold rounded bg-amber-700 text-white hover:bg-amber-800 transition-colors cursor-pointer"
                              >
                                Confirm & Execute
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Execution Error */}
                        {toolError && (
                          <div className="p-2.5 bg-red-50 border border-red-300 text-red-900 rounded text-[11px] font-mono flex items-center gap-1.5">
                            <AlertTriangle size={13} className="text-red-700 flex-shrink-0" />
                            <span>{toolError}</span>
                          </div>
                        )}

                        {/* Tool Execution Result */}
                        {toolResult && (
                          <div>
                            <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block mb-1">
                              Tool Execution Response:
                            </span>
                            <pre className="p-3 bg-burgundy/95 text-ivory rounded text-[10px] font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {JSON.stringify(toolResult, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleInvokeTool(false)}
                            disabled={toolExecuting}
                            className="px-4 py-1.5 bg-burgundy text-ivory rounded font-bold hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                          >
                            {toolExecuting ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} className="text-copper" />}
                            <span>{toolExecuting ? 'Executing...' : 'Invoke Tool Safely'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-ivory border border-copper/20 rounded p-8 text-center text-xs font-mono text-burgundy/60">
                    Select an MCP server on the left to explore its tools and schemas.
                  </div>
                )}
              </div>
            </div>
          )}
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

      {/* ========================================================================= */}
      {/* VIEW: Universal MCP Server Registry & Dynamic Tool Explorer */}
      {/* ========================================================================= */}
      {activeTab === 'mcp_explorer' && (
        <div className="space-y-6">
          {/* Top Bar for MCP Explorer */}
          <div className="bg-ivory border border-copper/25 rounded p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Server size={18} className="text-copper" />
                <h2 className="text-base font-bold font-display text-burgundy">
                  Universal MCP Server Registry & Tool Explorer
                </h2>
                <span className="text-[10px] bg-copper/20 text-copper px-2 py-0.5 rounded font-mono font-bold uppercase">
                  Standardized Model Context Protocol
                </span>
              </div>
              <p className="text-xs text-burgundy/70 mt-0.5">
                Connect compatible remote or local stdio MCP servers (Lovable, Bolt, Replit, Emergent, custom). Discover schemas, test tools, and run coding benchmarks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setStartModalMode('connect');
                  setShowStartModal(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus size={13} className="text-copper" />
                <span>Connect MCP Server</span>
              </button>
            </div>
          </div>

          {mcpConnections.length === 0 ? (
            <div className="bg-ivory border border-copper/20 rounded p-12 text-center space-y-3">
              <Server size={36} className="text-copper/40 mx-auto" />
              <h3 className="text-sm font-bold text-burgundy">No MCP Servers Connected Yet</h3>
              <p className="text-xs text-burgundy/60 max-w-md mx-auto">
                Connect an official MCP server (such as Lovable at <span className="font-mono text-burgundy">https://mcp.lovable.dev</span>), an arbitrary remote Streamable HTTP / SSE endpoint, or a local stdio server process.
              </p>
              <button
                onClick={() => {
                  setStartModalMode('connect');
                  setShowStartModal(true);
                }}
                className="px-4 py-2 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} className="text-copper" />
                <span>Connect First MCP Server</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Registered MCP Connections List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-burgundy uppercase">
                  <span>Registered Servers ({mcpConnections.length})</span>
                  <button
                    onClick={loadAllData}
                    className="text-[10px] text-burgundy/60 hover:text-burgundy flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {mcpConnections.map((c) => {
                    const isSelected = selectedMcpConn?.id === c.id;
                    const isConn = c.connectionStatus === 'connected';

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedMcpConn(c);
                          if (c.discoveredTools.length > 0) setSelectedMcpTool(c.discoveredTools[0]);
                          setToolResult(null);
                          setToolError(null);
                        }}
                        className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-ivory border-copper shadow-sm ring-1 ring-copper/40'
                            : 'bg-white border-copper/20 hover:border-copper/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-burgundy flex items-center gap-1.5 truncate">
                            <Radio size={12} className={isConn ? 'text-emerald-600' : 'text-slate-400'} />
                            {c.displayName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              isConn
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {c.connectionStatus}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-burgundy/60 mt-1 truncate">
                          {c.transport === 'stdio' ? `stdio: ${c.localCommand}` : c.serverUrl}
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-burgundy/70 border-t border-copper/10 pt-2">
                          <span>{c.discoveredTools.length} tools • {c.authType}</span>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleReconnectMcp(c.id)}
                              className="text-burgundy/60 hover:text-burgundy p-0.5"
                              title="Reconnect / Handshake"
                            >
                              <RefreshCw size={11} />
                            </button>
                            <button
                              onClick={() => handleDisconnectMcp(c.id)}
                              className="text-burgundy/60 hover:text-amber-700 p-0.5"
                              title="Disconnect"
                            >
                              <Radio size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteMcp(c.id)}
                              className="text-burgundy/60 hover:text-red-700 p-0.5"
                              title="Delete server"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Dynamic Tool Explorer & Invocation Panel */}
              <div className="md:col-span-2 space-y-4">
                {selectedMcpConn ? (
                  <div className="bg-ivory border border-copper/25 rounded p-5 shadow-sm space-y-4">
                    {/* Server Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-copper/15">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold font-display text-burgundy text-base">
                            {selectedMcpConn.displayName}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper/20 text-burgundy font-bold">
                            {selectedMcpConn.transport.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-burgundy/60 mt-0.5">
                          Protocol: {selectedMcpConn.protocolVersion || '2024-11-05'} • Auth: {selectedMcpConn.authType}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBenchmarkMcpId(selectedMcpConn.id);
                            setStartModalMode('generate');
                            setShowStartModal(true);
                          }}
                          className="px-3 py-1.5 bg-burgundy text-ivory text-xs font-bold rounded hover:bg-burgundy/90 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Play size={11} className="text-copper" />
                          <span>Run Benchmark on Platform</span>
                        </button>
                      </div>
                    </div>

                    {/* Discovered Tools Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-burgundy uppercase">
                          Discovered Tools ({selectedMcpConn.discoveredTools.length})
                        </span>
                        <span className="text-[10px] font-mono text-burgundy/60">
                          Click a tool to inspect schema and test execution
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {selectedMcpConn.discoveredTools.map((t) => {
                          const isSelectedTool = selectedMcpTool?.name === t.name;
                          return (
                            <div
                              key={t.name}
                              onClick={() => {
                                setSelectedMcpTool(t);
                                setToolResult(null);
                                setToolError(null);
                                setToolApprovalPrompt(false);
                                // Prepopulate sample arguments from schema
                                const sampleArgs: Record<string, any> = {};
                                const props = t.inputSchema?.properties || {};
                                for (const k of Object.keys(props)) {
                                  sampleArgs[k] = props[k].type === 'string' ? '' : props[k].type === 'number' ? 0 : {};
                                }
                                setToolArgsInput(JSON.stringify(sampleArgs, null, 2));
                              }}
                              className={`p-2.5 rounded border text-xs cursor-pointer transition-all ${
                                isSelectedTool
                                  ? 'bg-burgundy text-ivory border-burgundy'
                                  : 'bg-white border-copper/20 hover:border-copper/40 text-burgundy'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold font-mono text-[11px] truncate">{t.name}</span>
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                    isSelectedTool
                                      ? 'bg-ivory/20 text-ivory'
                                      : t.isReadOnly
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {t.category}
                                </span>
                              </div>
                              <p className={`text-[10px] line-clamp-1 mt-1 ${isSelectedTool ? 'text-ivory/80' : 'text-burgundy/60'}`}>
                                {t.description || 'No description provided'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Tool Invocation Inspector */}
                    {selectedMcpTool && (
                      <div className="border border-copper/20 bg-white rounded p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-burgundy text-xs flex items-center gap-1.5">
                              <Code size={13} className="text-copper" />
                              <span className="font-mono">{selectedMcpTool.name}</span>
                              {selectedMcpTool.requiresApproval && (
                                <span className="text-[9px] font-mono bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                                  Requires Explicit Approval
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-burgundy/70 mt-0.5">
                              {selectedMcpTool.description}
                            </p>
                          </div>
                        </div>

                        {/* Schema Inspector */}
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-burgundy/60 block mb-1">
                            Input Schema (JSON Schema):
                          </span>
                          <pre className="p-2 bg-ivory-dark/40 border border-copper/15 rounded text-[10px] font-mono text-burgundy/80 max-h-28 overflow-y-auto">
                            {JSON.stringify(selectedMcpTool.inputSchema, null, 2)}
                          </pre>
                        </div>

                        {/* JSON Arguments Editor */}
                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-burgundy/60 block mb-1">
                            Arguments (JSON payload):
                          </label>
                          <textarea
                            rows={3}
                            value={toolArgsInput}
                            onChange={(e) => setToolArgsInput(e.target.value)}
                            className="w-full p-2 text-xs font-mono border border-copper/30 rounded bg-white text-burgundy"
                          />
                        </div>

                        {/* Approval Confirmation Warning if triggered */}
                        {toolApprovalPrompt && (
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 space-y-2">
                            <div className="font-bold flex items-center gap-1.5 text-xs">
                              <AlertTriangle size={14} className="text-amber-700" />
                              <span>Confirmation Required for Mutating Tool</span>
                            </div>
                            <p className="text-[11px]">
                              Tool <strong className="font-mono">{selectedMcpTool.name}</strong> will modify external state or consume provider credits. Are you sure you want to proceed?
                            </p>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setToolApprovalPrompt(false)}
                                className="px-3 py-1 text-xs border border-copper/30 rounded hover:bg-copper/10 text-burgundy cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleInvokeTool(true)}
                                className="px-3 py-1 text-xs font-bold rounded bg-amber-700 text-white hover:bg-amber-800 transition-colors cursor-pointer"
                              >
                                Confirm & Execute
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Execution Error */}
                        {toolError && (
                          <div className="p-2.5 bg-red-50 border border-red-300 text-red-900 rounded text-[11px] font-mono flex items-center gap-1.5">
                            <AlertTriangle size={13} className="text-red-700 flex-shrink-0" />
                            <span>{toolError}</span>
                          </div>
                        )}

                        {/* Tool Execution Result */}
                        {toolResult && (
                          <div>
                            <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block mb-1">
                              Tool Execution Response:
                            </span>
                            <pre className="p-3 bg-burgundy/95 text-ivory rounded text-[10px] font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {JSON.stringify(toolResult, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleInvokeTool(false)}
                            disabled={toolExecuting}
                            className="px-4 py-1.5 bg-burgundy text-ivory rounded font-bold hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                          >
                            {toolExecuting ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} className="text-copper" />}
                            <span>{toolExecuting ? 'Executing...' : 'Invoke Tool Safely'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-ivory border border-copper/20 rounded p-8 text-center text-xs font-mono text-burgundy/60">
                    Select an MCP server on the left to explore its tools and schemas.
                  </div>
                )}
              </div>
            </div>
          )}
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
                  setActiveMcpJob(null);
                  setConnError(null);
                  setMcpBenchError(null);
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
            {/* MODE 1: Direct Generation Workflow (Universal MCP & Platforms) */}
            {/* ============================================================== */}
            {startModalMode === 'generate' && (
              <div className="space-y-4 text-xs font-sans">
                {activeMcpJob ? (
                  /* Active MCP Benchmark Progress Tracker */
                  <div className="space-y-4 bg-white border border-copper/20 rounded p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-copper/15">
                      <div>
                        <div className="font-bold text-burgundy text-sm">
                          Universal MCP Benchmark Job
                        </div>
                        <div className="text-[10px] font-mono text-burgundy/60">
                          Job ID: {activeMcpJob.id} • Category: {activeMcpJob.benchmarkCategory}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
                          activeMcpJob.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : activeMcpJob.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-copper/20 text-copper'
                        }`}
                      >
                        {activeMcpJob.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Step Pipeline */}
                    <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono">
                      {[
                        { key: 'analyzing_capabilities', label: '1. Capabilities' },
                        { key: 'submitting_task', label: '2. Submitting' },
                        { key: 'retrieving_code', label: '3. Code Retrieval' },
                        { key: 'evaluating', label: '4. Evaluation' },
                        { key: 'completed', label: '5. Complete' },
                      ].map((step, idx) => {
                        const statuses = [
                          'pending',
                          'analyzing_capabilities',
                          'submitting_task',
                          'monitoring_generation',
                          'retrieving_code',
                          'preparing_sandbox',
                          'evaluating',
                          'completed',
                        ];
                        const currentIdx = statuses.indexOf(activeMcpJob.status);
                        const isDone = currentIdx > idx || activeMcpJob.status === 'completed';
                        const isCurrent =
                          activeMcpJob.status === step.key ||
                          (step.key === 'submitting_task' && activeMcpJob.status === 'monitoring_generation') ||
                          (step.key === 'evaluating' && activeMcpJob.status === 'preparing_sandbox');

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

                    {/* Live MCP Execution Logs */}
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-burgundy/60 block mb-1">
                        MCP Orchestrator Execution Log:
                      </span>
                      <pre className="p-3 bg-burgundy/95 text-ivory rounded font-mono text-[10px] max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {activeMcpJob.logs && activeMcpJob.logs.length > 0
                          ? activeMcpJob.logs.join('\n')
                          : 'Initializing benchmark orchestrator...'}
                      </pre>
                    </div>

                    {/* Failure details if any */}
                    {activeMcpJob.status === 'failed' && (
                      <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <XCircle size={14} className="text-red-700" />
                          <span>MCP Benchmark Failed ({activeMcpJob.failureType || 'Error'})</span>
                        </div>
                        <p className="text-[11px] font-mono">{activeMcpJob.failureReason}</p>
                      </div>
                    )}

                    {/* Completed Overall Score Banner */}
                    {activeMcpJob.status === 'completed' && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-emerald-900">Benchmark Completed Successfully!</div>
                          <div className="text-[10px] font-mono text-emerald-700">Code retrieved into sandbox and 5 pillars evaluated</div>
                        </div>
                        <div className="text-xl font-bold font-display text-emerald-800">
                          {activeMcpJob.overallScore !== undefined ? `${activeMcpJob.overallScore}%` : 'Done'}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 flex justify-end gap-2">
                      {activeMcpJob.status === 'completed' && (
                        <button
                          type="button"
                          onClick={async () => {
                            setShowStartModal(false);
                            setActiveMcpJob(null);
                            await loadAllData();
                            setActiveTab('dashboard');
                          }}
                          className="px-4 py-2 rounded bg-burgundy text-ivory font-bold hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                        >
                          <Play size={12} className="text-copper" />
                          <span>View Dashboard & Results</span>
                        </button>
                      )}
                      {['completed', 'failed'].includes(activeMcpJob.status) && (
                        <button
                          type="button"
                          onClick={() => setActiveMcpJob(null)}
                          className="px-3 py-1.5 border border-copper/30 rounded text-burgundy hover:bg-copper/10 transition-colors cursor-pointer text-xs"
                        >
                          Start Another
                        </button>
                      )}
                    </div>
                  </div>
                ) : activeJob ? (
                  /* Active Generation Progress Tracker (Legacy Provider) */
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
                  /* Universal MCP & Platform Benchmark Form */
                  <div className="space-y-4">
                    {mcpBenchError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-700 flex-shrink-0" />
                        <span>{mcpBenchError}</span>
                      </div>
                    )}

                    {/* Target Platform / MCP Server Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-burgundy">Target MCP Server / Platform *</label>
                        <button
                          type="button"
                          onClick={() => setStartModalMode('connect')}
                          className="text-[10px] font-mono text-copper hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={10} />
                          <span>Connect New Server</span>
                        </button>
                      </div>

                      {mcpConnections.length === 0 ? (
                        <div className="p-4 border border-dashed border-copper/30 bg-ivory-dark/30 rounded text-center space-y-2">
                          <Server size={24} className="text-copper/50 mx-auto" />
                          <p className="text-xs text-burgundy/80">
                            No MCP servers currently connected. Connect Lovable, an arbitrary remote MCP server, or a local stdio process to start.
                          </p>
                          <button
                            type="button"
                            onClick={() => setStartModalMode('connect')}
                            className="px-3 py-1.5 bg-burgundy text-ivory rounded font-bold hover:bg-burgundy/90 transition-colors text-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Link2 size={12} className="text-copper" />
                            <span>Connect MCP Platform</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <select
                            value={selectedBenchmarkMcpId || (mcpConnections[0]?.id ?? '')}
                            onChange={(e) => setSelectedBenchmarkMcpId(e.target.value)}
                            className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                          >
                            {mcpConnections.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.displayName} ({c.preset || c.transport}) — {c.connectionStatus}
                              </option>
                            ))}
                          </select>

                          {/* Selected Server Capability Badges */}
                          {(() => {
                            const cur = mcpConnections.find((c) => c.id === (selectedBenchmarkMcpId || mcpConnections[0]?.id));
                            if (!cur) return null;
                            const hasCreation = cur.discoveredTools.some((t) =>
                              ['project_creation', 'code_generation'].includes(t.category)
                            );
                            const hasRetrieval = cur.discoveredTools.some((t) =>
                              ['code_retrieval'].includes(t.category)
                            );
                            const toolCount = cur.discoveredTools.length;

                            return (
                              <div className="p-2.5 bg-ivory-dark/40 border border-copper/20 rounded flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-burgundy">{cur.displayName}</span>
                                  <span className="text-[10px] font-mono text-burgundy/60">
                                    {toolCount} tool{toolCount === 1 ? '' : 's'} discovered
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                      hasCreation
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}
                                  >
                                    {hasCreation ? 'Code Gen: Available' : 'No Gen Tools'}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                      hasRetrieval
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}
                                  >
                                    {hasRetrieval ? 'Retrieval: Supported' : 'Manual Retrieval'}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Benchmark Task Prompt */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-burgundy">Benchmark Task Prompt *</label>
                        <span className="text-[10px] text-burgundy/50">Prompt submitted to MCP server</span>
                      </div>
                      <textarea
                        rows={3}
                        required
                        placeholder="e.g. Build a task management application with user authentication, CRUD operations, responsive UI, drag-and-drop status columns, and persistent storage."
                        value={mcpBenchmarkPrompt}
                        onChange={(e) => setMcpBenchmarkPrompt(e.target.value)}
                        className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                      />
                    </div>

                    {/* Benchmark Category */}
                    <div>
                      <label className="block font-bold text-burgundy mb-1">Evaluation Category & Test Suite</label>
                      <select
                        value={mcpBenchmarkCategory}
                        onChange={(e) => setMcpBenchmarkCategory(e.target.value)}
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

                    {/* Credit Notice and Approval Gate */}
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded space-y-1.5 text-amber-950">
                      <div className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                        <AlertTriangle size={14} className="text-amber-700 flex-shrink-0" />
                        <span>Execution & Credit Consumption Notice</span>
                      </div>
                      <p className="text-[11px]">
                        Executing this benchmark invokes MCP tools on the connected platform. If the target platform (e.g. Lovable) charges credits for project generation or prompt turns, credits will be consumed from your connected account.
                      </p>
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
                        onClick={() => {
                          const targetId = selectedBenchmarkMcpId || (mcpConnections[0]?.id ?? '');
                          if (!selectedBenchmarkMcpId && targetId) {
                            setSelectedBenchmarkMcpId(targetId);
                          }
                          handleStartMcpBenchmark();
                        }}
                        disabled={
                          mcpBenchSubmitting ||
                          !mcpBenchmarkPrompt.trim() ||
                          mcpConnections.length === 0
                        }
                        className="px-4 py-2 rounded bg-burgundy text-ivory font-bold hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {mcpBenchSubmitting ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>Submitting to MCP Server...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} className="text-copper" />
                            <span>Start MCP Benchmark Run</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* MODE 2: Universal MCP Connection Engine & Provider Presets */}
            {/* ============================================================== */}
            {startModalMode === 'connect' && (
              <div className="space-y-4 text-xs font-sans">
                {/* Presets Bar */}
                <div>
                  <label className="block font-bold text-burgundy mb-1.5">
                    Platform Presets & Connection Type
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { id: 'lovable', label: 'Lovable', desc: 'mcp.lovable.dev' },
                      { id: 'bolt', label: 'Bolt.new', desc: 'StackBlitz' },
                      { id: 'replit', label: 'Replit', desc: 'Agent' },
                      { id: 'emergent', label: 'Emergent', desc: 'Autonomous' },
                      { id: 'custom', label: 'Custom HTTP', desc: 'Remote URL' },
                      { id: 'stdio', label: 'Local stdio', desc: 'Subprocess' },
                    ].map((p) => {
                      const isSelected =
                        p.id === 'stdio'
                          ? connTransport === 'stdio'
                          : connPreset === p.id && connTransport !== 'stdio';
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (p.id === 'stdio') {
                              setConnTransport('stdio');
                              setConnPreset('custom');
                              setConnDisplayName('Local MCP Stdio Process');
                            } else {
                              handlePresetSelect(p.id as any);
                            }
                          }}
                          className={`p-2 rounded border text-left cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-burgundy text-ivory border-burgundy shadow-sm'
                              : 'bg-white border-copper/20 text-burgundy hover:bg-copper/10'
                          }`}
                        >
                          <div className="font-bold text-[11px] truncate">{p.label}</div>
                          <div className={`text-[9px] font-mono truncate ${isSelected ? 'text-ivory/80' : 'text-burgundy/50'}`}>
                            {p.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {connError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-700 flex-shrink-0" />
                    <span>{connError}</span>
                  </div>
                )}

                {/* Connection Form */}
                <form onSubmit={handleConnectMcpServer} className="space-y-3 bg-white border border-copper/20 rounded p-4">
                  {/* Server Display Name */}
                  <div>
                    <label className="block font-bold text-burgundy mb-1">Connection Display Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lovable Production MCP"
                      value={connDisplayName}
                      onChange={(e) => setConnDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs"
                    />
                  </div>

                  {/* Transport */}
                  <div>
                    <label className="block font-bold text-burgundy mb-1">MCP Transport Protocol *</label>
                    <select
                      value={connTransport}
                      onChange={(e) => setConnTransport(e.target.value as McpTransport)}
                      className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                    >
                      <option value="streamable_http">Streamable HTTP (Modern MCP Standard - POST JSON-RPC)</option>
                      <option value="sse">Server-Sent Events (Legacy SSE + HTTP POST)</option>
                      <option value="stdio">Local Stdio Process (Command + Arguments)</option>
                    </select>
                  </div>

                  {/* Remote Server Details (streamable_http or sse) */}
                  {connTransport !== 'stdio' ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-burgundy">Remote MCP Server URL *</label>
                          <span className="text-[10px] font-mono text-burgundy/50">SSRF protected</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            required
                            placeholder="https://mcp.lovable.dev"
                            value={connServerUrl}
                            onChange={(e) => setConnServerUrl(e.target.value)}
                            className="flex-1 px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleDiscoverServer}
                            disabled={discovering || !connServerUrl.trim()}
                            className="px-3 py-2 border border-copper/30 rounded text-burgundy font-semibold hover:bg-copper/10 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {discovering ? <RefreshCw size={12} className="animate-spin" /> : <Eye size={12} />}
                            <span>Discover</span>
                          </button>
                        </div>
                      </div>

                      {/* Discovery Metadata Preview */}
                      {discoveryResult && (
                        <div className="p-3 bg-ivory-dark/40 border border-copper/25 rounded space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-copper uppercase">
                              Server Metadata Discovered
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              Protocol {discoveryResult.protocolVersion || 'v1.0'}
                            </span>
                          </div>
                          {discoveryResult.oauthMetadata && (
                            <div className="text-[11px] font-mono text-emerald-800 space-y-0.5">
                              <div>OAuth Issuer: {discoveryResult.oauthMetadata.issuer}</div>
                              {discoveryResult.oauthMetadata.supportsDynamicRegistration && (
                                <div className="text-emerald-700 font-bold">
                                  ✓ RFC 7591 Dynamic Client Registration Supported (No manual client registration needed!)
                                </div>
                              )}
                              <div>Token Methods: {discoveryResult.oauthMetadata.tokenEndpointAuthMethodsSupported?.join(', ') || 'client_secret_post'}</div>
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-burgundy/60">
                            Supported Auth Methods: {discoveryResult.supportedAuth?.join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Authentication Type Selector */}
                      <div>
                        <label className="block font-bold text-burgundy mb-1">Authentication Method</label>
                        <select
                          value={connAuthType}
                          onChange={(e) => setConnAuthType(e.target.value as McpAuthType)}
                          className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                        >
                          <option value="oauth_dcr">OAuth 2.0 (Dynamic Client Registration & PKCE)</option>
                          <option value="oauth_client_credentials">OAuth 2.0 (Custom Client ID / Secret & PKCE)</option>
                          <option value="bearer">Bearer Token (Header Authorization: Bearer &lt;token&gt;)</option>
                          <option value="api_key">API Key (Header / Query Parameter)</option>
                          <option value="none">Public / No Authentication</option>
                        </select>
                      </div>

                      {/* Dynamic Registration OAuth Notice */}
                      {connAuthType === 'oauth_dcr' && (
                        <div className="p-3 bg-pink-50 border border-pink-200 rounded text-pink-950 space-y-1.5">
                          <div className="font-bold flex items-center gap-1.5 text-xs text-pink-900">
                            <Sparkles size={13} className="text-pink-600" />
                            <span>Standards-Based OAuth 2.0 Flow</span>
                          </div>
                          <p className="text-[11px]">
                            AgentLab will query RFC 8414 metadata, dynamically register a secure client with the server via RFC 7591, and redirect through the official authorization flow using RFC 7636 PKCE.
                          </p>
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleConnectOAuth(connPreset)}
                              className="px-3.5 py-1.5 bg-pink-700 text-white font-bold rounded hover:bg-pink-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer text-xs"
                            >
                              <Link2 size={12} />
                              <span>Authorize with {connDisplayName || 'Platform'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Custom Client ID & Secret for OAuth without DCR */}
                      {connAuthType === 'oauth_client_credentials' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-burgundy mb-1">Registered Client ID *</label>
                            <input
                              type="text"
                              required
                              placeholder="OAuth Client ID"
                              value={connClientId}
                              onChange={(e) => setConnClientId(e.target.value)}
                              className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-burgundy mb-1">Client Secret (Optional)</label>
                            <input
                              type="password"
                              placeholder="Client Secret if confidential"
                              value={connClientSecret}
                              onChange={(e) => setConnClientSecret(e.target.value)}
                              className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Bearer Token Input */}
                      {connAuthType === 'bearer' && (
                        <div>
                          <label className="block font-bold text-burgundy mb-1">Bearer Access Token *</label>
                          <input
                            type="password"
                            required
                            placeholder="ey..."
                            value={connBearerToken}
                            onChange={(e) => setConnBearerToken(e.target.value)}
                            className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                          />
                        </div>
                      )}

                      {/* API Key Input */}
                      {connAuthType === 'api_key' && (
                        <div>
                          <label className="block font-bold text-burgundy mb-1">API Key *</label>
                          <input
                            type="password"
                            required
                            placeholder="Enter API Key"
                            value={connApiKey}
                            onChange={(e) => setConnApiKey(e.target.value)}
                            className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Local Stdio Process Configuration */
                    <div className="space-y-3">
                      <div>
                        <label className="block font-bold text-burgundy mb-1">Executable Command *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. npx or node or python"
                          value={connLocalCommand}
                          onChange={(e) => setConnLocalCommand(e.target.value)}
                          className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-burgundy mb-1">Command Arguments</label>
                        <input
                          type="text"
                          placeholder="e.g. -y @modelcontextprotocol/server-everything"
                          value={connLocalArgs}
                          onChange={(e) => setConnLocalArgs(e.target.value)}
                          className="w-full px-3 py-2 border border-copper/30 rounded bg-white text-burgundy text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit / Handshake Button */}
                  <div className="pt-2 border-t border-copper/15 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowStartModal(false)}
                      className="px-4 py-2 border border-copper/30 rounded text-burgundy hover:bg-copper/10 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    {connAuthType !== 'oauth_dcr' && (
                      <button
                        type="submit"
                        disabled={connSubmitting}
                        className="px-4 py-2 rounded bg-burgundy text-ivory font-bold hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {connSubmitting ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>Verifying Handshake...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} className="text-copper" />
                            <span>Connect & Handshake</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
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

      {/* ========================================================================= */}
      {/* VIEW: Universal MCP Server Registry & Dynamic Tool Explorer */}
      {/* ========================================================================= */}
      {activeTab === 'mcp_explorer' && (
        <div className="space-y-6">
          {/* Top Bar for MCP Explorer */}
          <div className="bg-ivory border border-copper/25 rounded p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Server size={18} className="text-copper" />
                <h2 className="text-base font-bold font-display text-burgundy">
                  Universal MCP Server Registry & Tool Explorer
                </h2>
                <span className="text-[10px] bg-copper/20 text-copper px-2 py-0.5 rounded font-mono font-bold uppercase">
                  Standardized Model Context Protocol
                </span>
              </div>
              <p className="text-xs text-burgundy/70 mt-0.5">
                Connect compatible remote or local stdio MCP servers (Lovable, Bolt, Replit, Emergent, custom). Discover schemas, test tools, and run coding benchmarks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setStartModalMode('connect');
                  setShowStartModal(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus size={13} className="text-copper" />
                <span>Connect MCP Server</span>
              </button>
            </div>
          </div>

          {mcpConnections.length === 0 ? (
            <div className="bg-ivory border border-copper/20 rounded p-12 text-center space-y-3">
              <Server size={36} className="text-copper/40 mx-auto" />
              <h3 className="text-sm font-bold text-burgundy">No MCP Servers Connected Yet</h3>
              <p className="text-xs text-burgundy/60 max-w-md mx-auto">
                Connect an official MCP server (such as Lovable at <span className="font-mono text-burgundy">https://mcp.lovable.dev</span>), an arbitrary remote Streamable HTTP / SSE endpoint, or a local stdio server process.
              </p>
              <button
                onClick={() => {
                  setStartModalMode('connect');
                  setShowStartModal(true);
                }}
                className="px-4 py-2 text-xs font-bold rounded bg-burgundy text-ivory hover:bg-burgundy/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} className="text-copper" />
                <span>Connect First MCP Server</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Registered MCP Connections List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-burgundy uppercase">
                  <span>Registered Servers ({mcpConnections.length})</span>
                  <button
                    onClick={loadAllData}
                    className="text-[10px] text-burgundy/60 hover:text-burgundy flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {mcpConnections.map((c) => {
                    const isSelected = selectedMcpConn?.id === c.id;
                    const isConn = c.connectionStatus === 'connected';

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedMcpConn(c);
                          if (c.discoveredTools.length > 0) setSelectedMcpTool(c.discoveredTools[0]);
                          setToolResult(null);
                          setToolError(null);
                        }}
                        className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-ivory border-copper shadow-sm ring-1 ring-copper/40'
                            : 'bg-white border-copper/20 hover:border-copper/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-burgundy flex items-center gap-1.5 truncate">
                            <Radio size={12} className={isConn ? 'text-emerald-600' : 'text-slate-400'} />
                            {c.displayName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              isConn
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {c.connectionStatus}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-burgundy/60 mt-1 truncate">
                          {c.transport === 'stdio' ? `stdio: ${c.localCommand}` : c.serverUrl}
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-burgundy/70 border-t border-copper/10 pt-2">
                          <span>{c.discoveredTools.length} tools • {c.authType}</span>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleReconnectMcp(c.id)}
                              className="text-burgundy/60 hover:text-burgundy p-0.5"
                              title="Reconnect / Handshake"
                            >
                              <RefreshCw size={11} />
                            </button>
                            <button
                              onClick={() => handleDisconnectMcp(c.id)}
                              className="text-burgundy/60 hover:text-amber-700 p-0.5"
                              title="Disconnect"
                            >
                              <Radio size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteMcp(c.id)}
                              className="text-burgundy/60 hover:text-red-700 p-0.5"
                              title="Delete server"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Dynamic Tool Explorer & Invocation Panel */}
              <div className="md:col-span-2 space-y-4">
                {selectedMcpConn ? (
                  <div className="bg-ivory border border-copper/25 rounded p-5 shadow-sm space-y-4">
                    {/* Server Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-copper/15">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold font-display text-burgundy text-base">
                            {selectedMcpConn.displayName}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper/20 text-burgundy font-bold">
                            {selectedMcpConn.transport.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-burgundy/60 mt-0.5">
                          Protocol: {selectedMcpConn.protocolVersion || '2024-11-05'} • Auth: {selectedMcpConn.authType}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBenchmarkMcpId(selectedMcpConn.id);
                            setStartModalMode('generate');
                            setShowStartModal(true);
                          }}
                          className="px-3 py-1.5 bg-burgundy text-ivory text-xs font-bold rounded hover:bg-burgundy/90 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Play size={11} className="text-copper" />
                          <span>Run Benchmark on Platform</span>
                        </button>
                      </div>
                    </div>

                    {/* Discovered Tools Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-burgundy uppercase">
                          Discovered Tools ({selectedMcpConn.discoveredTools.length})
                        </span>
                        <span className="text-[10px] font-mono text-burgundy/60">
                          Click a tool to inspect schema and test execution
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {selectedMcpConn.discoveredTools.map((t) => {
                          const isSelectedTool = selectedMcpTool?.name === t.name;
                          return (
                            <div
                              key={t.name}
                              onClick={() => {
                                setSelectedMcpTool(t);
                                setToolResult(null);
                                setToolError(null);
                                setToolApprovalPrompt(false);
                                // Prepopulate sample arguments from schema
                                const sampleArgs: Record<string, any> = {};
                                const props = t.inputSchema?.properties || {};
                                for (const k of Object.keys(props)) {
                                  sampleArgs[k] = props[k].type === 'string' ? '' : props[k].type === 'number' ? 0 : {};
                                }
                                setToolArgsInput(JSON.stringify(sampleArgs, null, 2));
                              }}
                              className={`p-2.5 rounded border text-xs cursor-pointer transition-all ${
                                isSelectedTool
                                  ? 'bg-burgundy text-ivory border-burgundy'
                                  : 'bg-white border-copper/20 hover:border-copper/40 text-burgundy'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold font-mono text-[11px] truncate">{t.name}</span>
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                    isSelectedTool
                                      ? 'bg-ivory/20 text-ivory'
                                      : t.isReadOnly
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {t.category}
                                </span>
                              </div>
                              <p className={`text-[10px] line-clamp-1 mt-1 ${isSelectedTool ? 'text-ivory/80' : 'text-burgundy/60'}`}>
                                {t.description || 'No description provided'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Tool Invocation Inspector */}
                    {selectedMcpTool && (
                      <div className="border border-copper/20 bg-white rounded p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-burgundy text-xs flex items-center gap-1.5">
                              <Code size={13} className="text-copper" />
                              <span className="font-mono">{selectedMcpTool.name}</span>
                              {selectedMcpTool.requiresApproval && (
                                <span className="text-[9px] font-mono bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                                  Requires Explicit Approval
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-burgundy/70 mt-0.5">
                              {selectedMcpTool.description}
                            </p>
                          </div>
                        </div>

                        {/* Schema Inspector */}
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-burgundy/60 block mb-1">
                            Input Schema (JSON Schema):
                          </span>
                          <pre className="p-2 bg-ivory-dark/40 border border-copper/15 rounded text-[10px] font-mono text-burgundy/80 max-h-28 overflow-y-auto">
                            {JSON.stringify(selectedMcpTool.inputSchema, null, 2)}
                          </pre>
                        </div>

                        {/* JSON Arguments Editor */}
                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-burgundy/60 block mb-1">
                            Arguments (JSON payload):
                          </label>
                          <textarea
                            rows={3}
                            value={toolArgsInput}
                            onChange={(e) => setToolArgsInput(e.target.value)}
                            className="w-full p-2 text-xs font-mono border border-copper/30 rounded bg-white text-burgundy"
                          />
                        </div>

                        {/* Approval Confirmation Warning if triggered */}
                        {toolApprovalPrompt && (
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 space-y-2">
                            <div className="font-bold flex items-center gap-1.5 text-xs">
                              <AlertTriangle size={14} className="text-amber-700" />
                              <span>Confirmation Required for Mutating Tool</span>
                            </div>
                            <p className="text-[11px]">
                              Tool <strong className="font-mono">{selectedMcpTool.name}</strong> will modify external state or consume provider credits. Are you sure you want to proceed?
                            </p>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setToolApprovalPrompt(false)}
                                className="px-3 py-1 text-xs border border-copper/30 rounded hover:bg-copper/10 text-burgundy cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleInvokeTool(true)}
                                className="px-3 py-1 text-xs font-bold rounded bg-amber-700 text-white hover:bg-amber-800 transition-colors cursor-pointer"
                              >
                                Confirm & Execute
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Execution Error */}
                        {toolError && (
                          <div className="p-2.5 bg-red-50 border border-red-300 text-red-900 rounded text-[11px] font-mono flex items-center gap-1.5">
                            <AlertTriangle size={13} className="text-red-700 flex-shrink-0" />
                            <span>{toolError}</span>
                          </div>
                        )}

                        {/* Tool Execution Result */}
                        {toolResult && (
                          <div>
                            <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block mb-1">
                              Tool Execution Response:
                            </span>
                            <pre className="p-3 bg-burgundy/95 text-ivory rounded text-[10px] font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {JSON.stringify(toolResult, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleInvokeTool(false)}
                            disabled={toolExecuting}
                            className="px-4 py-1.5 bg-burgundy text-ivory rounded font-bold hover:bg-burgundy/90 transition-colors flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                          >
                            {toolExecuting ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} className="text-copper" />}
                            <span>{toolExecuting ? 'Executing...' : 'Invoke Tool Safely'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-ivory border border-copper/20 rounded p-8 text-center text-xs font-mono text-burgundy/60">
                    Select an MCP server on the left to explore its tools and schemas.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
