import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Check,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  Shield,
  Wrench,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  X,
} from 'lucide-react';
import { api, type Agent, type World, type Scenario } from '../../lib/api';

interface ExperimentCreatorProps {
  onExperimentStarted: (experimentId: string) => void;
}

export const ExperimentCreator = ({ onExperimentStarted }: ExperimentCreatorProps) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [currentWorld, setCurrentWorld] = useState<World | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);
  const [experimentName, setExperimentName] = useState('');

  const [loading, setLoading] = useState(true);
  const [envStatus, setEnvStatus] = useState<
    'analyzing' | 'generating' | 'validating' | 'ready' | 'needs_configuration' | 'error'
  >('analyzing');
  const [envMeta, setEnvMeta] = useState<{
    isNew?: boolean;
    generatedBy?: string;
    detectedDomain?: string;
    detectedCapabilities?: string[];
  } | null>(null);
  const [envError, setEnvError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [launching, setLaunching] = useState(false);

  // Modals
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customRules, setCustomRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [savingCustom, setSavingCustom] = useState(false);

  // Initial load
  useEffect(() => {
    api
      .getAgents()
      .then((ags) => {
        setAgents(ags);
        if (ags.length > 0) {
          setSelectedAgentId(ags[0].id);
        }
        setExperimentName(`Evaluation Run #${Math.floor(1000 + Math.random() * 9000)}`);
      })
      .finally(() => setLoading(false));
  }, []);

  // Automatic Environment Generation when Agent changes
  const resolveEnvironmentForAgent = useCallback(
    async (agentId: string, forceRegenerate = false) => {
      const selectedAgent = agents.find((a) => a.id === agentId);
      if (!selectedAgent) return;

      if (selectedAgent.status === 'needs_configuration') {
        setEnvStatus('needs_configuration');
        return;
      }

      setEnvError(null);
      if (forceRegenerate) {
        setRegenerating(true);
        setEnvStatus('generating');
      } else {
        setEnvStatus('analyzing');
      }

      try {
        // Step 1: Progression for visual feedback if analyzing
        if (!forceRegenerate) {
          await new Promise((r) => setTimeout(r, 220));
          setEnvStatus('generating');
          await new Promise((r) => setTimeout(r, 220));
          setEnvStatus('validating');
        }

        const res = await api.autoGenerateWorld(agentId, forceRegenerate);
        setCurrentWorld(res.world);
        setScenarios(res.scenarios);
        setSelectedScenarioIds(res.scenarios.map((s) => s.id));
        setEnvMeta({
          isNew: res.isNew,
          generatedBy: res.generatedBy,
          detectedDomain: res.detectedDomain,
          detectedCapabilities: res.detectedCapabilities,
        });

        // Initialize customize modal states
        setCustomName(res.world.name);
        setCustomDesc(res.world.description);
        setCustomRules(res.world.systemRules || []);

        setEnvStatus('ready');
      } catch (err: any) {
        console.error('Environment generation error:', err);
        setEnvError(err.message || 'Failed to generate agent-aware environment');
        setEnvStatus('error');
      } finally {
        setRegenerating(false);
      }
    },
    [agents]
  );

  useEffect(() => {
    if (selectedAgentId) {
      resolveEnvironmentForAgent(selectedAgentId, false);
    }
  }, [selectedAgentId, resolveEnvironmentForAgent]);

  const handleToggleScenario = (id: string) => {
    setSelectedScenarioIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSaveCustomWorld = async () => {
    if (!currentWorld) return;
    setSavingCustom(true);
    try {
      const updated: World = {
        ...currentWorld,
        name: customName,
        description: customDesc,
        systemRules: customRules,
      };
      await api.updateWorld(currentWorld.id, updated);
      setCurrentWorld(updated);
      setShowCustomizeModal(false);
    } catch (err: any) {
      alert(`Error updating environment: ${err.message}`);
    } finally {
      setSavingCustom(false);
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId || !currentWorld || selectedScenarioIds.length === 0) {
      alert('Please ensure an environment is generated and at least one scenario is selected.');
      return;
    }

    setLaunching(true);
    try {
      const exp = await api.createExperiment({
        name: experimentName,
        agentId: selectedAgentId,
        worldId: currentWorld.id,
        scenarioIds: selectedScenarioIds,
      });

      await api.runExperiment(exp.id);
      onExperimentStarted(exp.id);
    } catch (err: any) {
      alert(`Launch error: ${err.message}`);
      setLaunching(false);
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  if (loading) {
    return <div className="p-8 text-center font-mono text-xs text-burgundy/50">Loading simulation setup...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">
          Experiment Creator
        </h1>
        <p className="font-sans text-xs sm:text-sm text-burgundy/60">
          AgentLab automatically synthesizes an agent-aware simulation environment and test matrix matching your target agent's architecture.
        </p>
      </div>

      <form onSubmit={handleLaunch} className="space-y-6">
        {/* Step 1: Agent Selection */}
        <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-sans font-bold text-sm text-burgundy">1. Target Agent Architecture</h3>
            {selectedAgent && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                Mode: {selectedAgent.connectionType} · {selectedAgent.model}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                Select AI Agent
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full border border-copper/25 p-2.5 rounded bg-ivory text-xs font-sans focus:outline-none focus:border-copper font-medium"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.connectionType} · {a.model})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                Experiment Run Name
              </label>
              <input
                type="text"
                required
                value={experimentName}
                onChange={(e) => setExperimentName(e.target.value)}
                className="w-full border border-copper/25 p-2.5 rounded bg-ivory text-xs font-sans focus:outline-none focus:border-copper font-medium"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Agent-Aware Environment Panel */}
        <div className="bg-white border border-copper/20 rounded-lg shadow-sm overflow-hidden">
          {/* Panel Header */}
          <div className="p-5 border-b border-copper/15 bg-ivory/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-copper" />
                <h3 className="font-sans font-bold text-sm text-burgundy">
                  2. Agent-Aware Environment (Synthesized World)
                </h3>
              </div>
              <p className="font-sans text-xs text-burgundy/60">
                Synthesized based on agent manifest, capabilities, and exposed tool interfaces.
              </p>
            </div>

            {/* Live Status Badge */}
            <div className="flex items-center gap-2">
              {envStatus === 'analyzing' && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  Analyzing Agent Manifest...
                </span>
              )}
              {envStatus === 'generating' && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <Sparkles size={12} className="animate-spin" />
                  Synthesizing Domain Rules & Tools...
                </span>
              )}
              {envStatus === 'validating' && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
                  <Shield size={12} />
                  Validating Guardrail Policies...
                </span>
              )}
              {envStatus === 'ready' && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Ready · {envMeta?.generatedBy === 'ai' ? 'AI Synthesized' : 'Deterministic Template'}
                </span>
              )}
              {envStatus === 'needs_configuration' && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertCircle size={13} />
                  Needs Agent Configuration
                </span>
              )}
              {envStatus === 'error' && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertCircle size={13} />
                  Generation Error
                </span>
              )}
            </div>
          </div>

          {/* Panel Body */}
          {envStatus === 'needs_configuration' ? (
            <div className="p-6 text-center space-y-2">
              <AlertCircle size={28} className="text-rose-500 mx-auto" />
              <p className="font-sans text-sm font-bold text-burgundy">Agent Setup Incomplete</p>
              <p className="font-sans text-xs text-burgundy/60 max-w-md mx-auto">
                The selected agent requires API credentials or isolated sandbox preparation before a simulation environment can be synthesized.
              </p>
            </div>
          ) : envError ? (
            <div className="p-6 text-center space-y-3">
              <AlertCircle size={28} className="text-rose-500 mx-auto" />
              <p className="font-sans text-sm font-bold text-rose-700">Environment Generation Failed</p>
              <p className="font-mono text-xs text-rose-600 max-w-md mx-auto">{envError}</p>
              <button
                type="button"
                onClick={() => resolveEnvironmentForAgent(selectedAgentId, true)}
                className="cursor-pointer font-mono text-xs bg-copper text-ivory px-4 py-2 rounded hover:bg-copper-dark"
              >
                Retry Generation
              </button>
            </div>
          ) : currentWorld ? (
            <div className="p-5 space-y-5">
              {/* Environment Title, Domain & Controls */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-display text-lg font-bold text-burgundy">{currentWorld.name}</h4>
                    <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-burgundy/10 text-burgundy font-bold">
                      Domain: {currentWorld.industry}
                    </span>
                    {currentWorld.version && (
                      <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                        v{currentWorld.version}
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-xs text-burgundy/70 max-w-2xl leading-relaxed">
                    {currentWorld.description}
                  </p>
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSpecModal(true)}
                    className="cursor-pointer flex items-center gap-1.5 font-mono text-xs border border-copper/30 px-3 py-1.5 rounded hover:bg-copper/5 text-burgundy transition-colors"
                  >
                    <Eye size={13} />
                    <span>View Spec</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomizeModal(true)}
                    className="cursor-pointer flex items-center gap-1.5 font-mono text-xs border border-copper/30 px-3 py-1.5 rounded hover:bg-copper/5 text-burgundy transition-colors"
                  >
                    <Sliders size={13} />
                    <span>Customize</span>
                  </button>
                  <button
                    type="button"
                    disabled={regenerating}
                    onClick={() => resolveEnvironmentForAgent(selectedAgentId, true)}
                    className="cursor-pointer flex items-center gap-1.5 font-mono text-xs bg-copper/10 hover:bg-copper/20 text-copper font-bold px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} />
                    <span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
                  </button>
                </div>
              </div>

              {/* Detected Capabilities Tag Chips */}
              <div>
                <span className="font-mono text-[10px] uppercase text-copper font-bold block mb-1.5">
                  Detected Agent Capabilities & Inferred Toolchain
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(currentWorld.detectedCapabilities || envMeta?.detectedCapabilities || ['Standard Operations']).map(
                    (cap, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[11px] px-2.5 py-0.5 rounded border border-copper/20 bg-ivory text-burgundy font-medium"
                      >
                        {cap}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Environment Metric Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded border border-copper/15 bg-ivory/50 flex items-center gap-2.5">
                  <div className="p-2 rounded bg-copper/10 text-copper">
                    <Wrench size={16} />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-burgundy/60 uppercase">Simulated Tools</div>
                    <div className="font-mono font-bold text-xs text-burgundy">
                      {currentWorld.simulatedTools?.length || 0} Tools Ready
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded border border-copper/15 bg-ivory/50 flex items-center gap-2.5">
                  <div className="p-2 rounded bg-copper/10 text-copper">
                    <Shield size={16} />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-burgundy/60 uppercase">Guardrail Policies</div>
                    <div className="font-mono font-bold text-xs text-burgundy">
                      {currentWorld.systemRules?.length || 0} Active Rules
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded border border-copper/15 bg-ivory/50 flex items-center gap-2.5">
                  <div className="p-2 rounded bg-copper/10 text-copper">
                    <FileText size={16} />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-burgundy/60 uppercase">Test Scenarios</div>
                    <div className="font-mono font-bold text-xs text-burgundy">
                      {scenarios.length} Matrix Cases
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded border border-copper/15 bg-ivory/50 flex items-center gap-2.5">
                  <div className="p-2 rounded bg-copper/10 text-copper">
                    <Users size={16} />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-burgundy/60 uppercase">Simulated Entities</div>
                    <div className="font-mono font-bold text-xs text-burgundy">
                      {currentWorld.customerProfiles?.length || 2} Profiles
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center font-mono text-xs text-burgundy/40">
              Select an agent to synthesize environment.
            </div>
          )}
        </div>

        {/* Step 3: Scenario Selection Checklist */}
        <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-sans font-bold text-sm text-burgundy">
                3. Test Scenarios ({selectedScenarioIds.length} of {scenarios.length} selected)
              </h3>
              <p className="font-sans text-xs text-burgundy/50 mt-0.5">
                Automatically synthesized to challenge your agent across normal, edge case, tool failure, and adversarial scenarios.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedScenarioIds(scenarios.map((s) => s.id))}
                className="text-[10px] font-mono text-copper hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-zinc-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedScenarioIds([])}
                className="text-[10px] font-mono text-zinc-500 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {scenarios.map((sc) => {
              const isChecked = selectedScenarioIds.includes(sc.id);
              return (
                <div
                  key={sc.id}
                  onClick={() => handleToggleScenario(sc.id)}
                  className={`p-3 rounded border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                    isChecked
                      ? 'border-copper bg-copper/5 text-burgundy'
                      : 'border-copper/15 bg-white text-burgundy/60 opacity-60'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center flex-shrink-0 ${
                      isChecked ? 'bg-copper border-copper text-ivory' : 'border-zinc-300'
                    }`}
                  >
                    {isChecked && <Check size={11} />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-sans font-bold text-xs">{sc.title}</span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.2 rounded uppercase ${
                          sc.category === 'tool_failure'
                            ? 'bg-rose-100 text-rose-800 font-bold'
                            : sc.category === 'adversarial'
                            ? 'bg-purple-100 text-purple-800'
                            : sc.category === 'escalation' || sc.category === 'policy_conflict'
                            ? 'bg-amber-100 text-amber-800'
                            : sc.category === 'edge_case'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {sc.category}
                      </span>
                      {sc.injectedFailures && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          Failure Injected: {sc.injectedFailures.toolName} ({sc.injectedFailures.failureType})
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-[11px] text-burgundy/65">{sc.description}</p>
                    <div className="font-mono text-[10px] text-copper/80 mt-1 italic">
                      "{sc.inputTask}"
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Launch Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={launching || selectedScenarioIds.length === 0 || envStatus !== 'ready'}
            className="cursor-pointer flex items-center gap-2 bg-copper text-ivory px-6 py-3 rounded text-sm font-mono font-bold hover:bg-copper-dark transition-all shadow-md disabled:opacity-50"
          >
            <Play size={15} />
            <span>
              {launching
                ? 'Initializing Simulation Engine...'
                : `Launch Simulation (${selectedScenarioIds.length} Scenarios)`}
            </span>
          </button>
        </div>
      </form>

      {/* View Specification Modal */}
      {showSpecModal && currentWorld && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-copper/30">
            <div className="p-4 border-b border-copper/15 flex justify-between items-center bg-ivory">
              <div>
                <h3 className="font-display font-bold text-lg text-burgundy">{currentWorld.name} Specification</h3>
                <p className="font-mono text-[11px] text-burgundy/60">
                  Domain: {currentWorld.industry} · Version {currentWorld.version || 1}
                </p>
              </div>
              <button
                onClick={() => setShowSpecModal(false)}
                className="cursor-pointer text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Rules */}
              <div>
                <h4 className="font-sans font-bold text-xs uppercase text-copper mb-2 flex items-center gap-1.5">
                  <Shield size={14} /> System Rules & Guardrails
                </h4>
                <ul className="space-y-1.5">
                  {currentWorld.systemRules.map((r, i) => (
                    <li key={i} className="font-sans text-xs text-burgundy bg-ivory/60 p-2 rounded border border-copper/10">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tools */}
              <div>
                <h4 className="font-sans font-bold text-xs uppercase text-copper mb-2 flex items-center gap-1.5">
                  <Wrench size={14} /> Available Simulated Tools
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentWorld.simulatedTools?.map((t, i) => (
                    <div key={i} className="p-2.5 rounded border border-copper/15 bg-ivory/30">
                      <div className="font-mono font-bold text-xs text-burgundy">{t.name}</div>
                      <div className="font-sans text-[11px] text-burgundy/65 mt-0.5">{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Knowledge Documents */}
              {currentWorld.knowledgeDocuments && currentWorld.knowledgeDocuments.length > 0 && (
                <div>
                  <h4 className="font-sans font-bold text-xs uppercase text-copper mb-2 flex items-center gap-1.5">
                    <FileText size={14} /> RAG Knowledge Documents
                  </h4>
                  <div className="space-y-2">
                    {currentWorld.knowledgeDocuments.map((kd, i) => (
                      <div key={i} className="p-3 rounded border border-copper/15 bg-ivory/30">
                        <div className="font-sans font-bold text-xs text-burgundy">{kd.title}</div>
                        <div className="font-mono text-[10px] text-burgundy/50 mb-1">Category: {kd.category}</div>
                        <p className="font-sans text-[11px] text-burgundy/70 line-clamp-3 whitespace-pre-line">
                          {kd.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Profiles */}
              <div>
                <h4 className="font-sans font-bold text-xs uppercase text-copper mb-2 flex items-center gap-1.5">
                  <Users size={14} /> Simulated Entities & Profiles
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentWorld.customerProfiles?.map((cp, i) => (
                    <div key={i} className="p-2.5 rounded border border-copper/15 bg-ivory/30 font-sans text-xs">
                      <span className="font-bold text-burgundy">{cp.name}</span>{' '}
                      <span className="font-mono text-[10px] text-copper">({cp.tier})</span>
                      <div className="font-mono text-[10px] text-burgundy/50">{cp.email}</div>
                      <div className="text-[11px] text-burgundy/70 mt-1 italic">Trait: {cp.behaviorTrait}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-copper/15 flex justify-end bg-ivory">
              <button
                onClick={() => setShowSpecModal(false)}
                className="cursor-pointer font-mono text-xs bg-burgundy text-ivory px-4 py-2 rounded hover:bg-burgundy/90"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customize Environment Modal */}
      {showCustomizeModal && currentWorld && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-copper/30">
            <div className="p-4 border-b border-copper/15 flex justify-between items-center bg-ivory">
              <h3 className="font-display font-bold text-lg text-burgundy">Customize Environment</h3>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="cursor-pointer text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                  Environment Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full border border-copper/25 p-2 rounded text-xs bg-ivory text-burgundy font-medium"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                  Description & Objective
                </label>
                <textarea
                  rows={3}
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  className="w-full border border-copper/25 p-2 rounded text-xs bg-ivory text-burgundy font-medium"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                  System Rules & Guardrails
                </label>
                <div className="space-y-1.5 mb-2">
                  {customRules.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 bg-ivory p-2 rounded border border-copper/15 text-xs">
                      <span className="flex-1 text-burgundy">{r}</span>
                      <button
                        type="button"
                        onClick={() => setCustomRules(customRules.filter((_, idx) => idx !== i))}
                        className="text-zinc-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add rule, e.g. Rule #06: Enforce mandatory human review..."
                    value={newRuleInput}
                    onChange={(e) => setNewRuleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRuleInput.trim()) {
                        e.preventDefault();
                        setCustomRules([...customRules, newRuleInput.trim()]);
                        setNewRuleInput('');
                      }
                    }}
                    className="flex-1 border border-copper/25 p-2 rounded text-xs bg-ivory text-burgundy"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newRuleInput.trim()) {
                        setCustomRules([...customRules, newRuleInput.trim()]);
                        setNewRuleInput('');
                      }
                    }}
                    className="cursor-pointer font-mono text-xs bg-copper text-ivory px-3 py-2 rounded hover:bg-copper-dark"
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-copper/15 flex justify-end gap-2 bg-ivory">
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="cursor-pointer font-mono text-xs border border-zinc-300 px-4 py-2 rounded hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingCustom}
                onClick={handleSaveCustomWorld}
                className="cursor-pointer font-mono text-xs bg-copper text-ivory px-4 py-2 rounded hover:bg-copper-dark disabled:opacity-50 font-bold"
              >
                {savingCustom ? 'Saving Changes...' : 'Save Environment Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
