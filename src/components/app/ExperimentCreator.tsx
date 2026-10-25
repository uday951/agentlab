import { useState, useEffect } from 'react';
import { Play, Check } from 'lucide-react';
import { api, type Agent, type World, type Scenario } from '../../lib/api';

interface ExperimentCreatorProps {
  onExperimentStarted: (experimentId: string) => void;
}

export const ExperimentCreator = ({ onExperimentStarted }: ExperimentCreatorProps) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedWorldId, setSelectedWorldId] = useState('');
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);
  const [experimentName, setExperimentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    Promise.all([api.getAgents(), api.getWorlds()])
      .then(([ags, wlds]) => {
        setAgents(ags);
        setWorlds(wlds);
        if (ags.length > 0) setSelectedAgentId(ags[0].id);
        if (wlds.length > 0) {
          setSelectedWorldId(wlds[0].id);
          loadScenarios(wlds[0].id);
        }
        setExperimentName(`Evaluation Run #${Math.floor(1000 + Math.random() * 9000)}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadScenarios = async (worldId: string) => {
    try {
      const scList = await api.getScenarios(worldId);
      setScenarios(scList);
      // Select all by default
      setSelectedScenarioIds(scList.map((s) => s.id));
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
  };

  const handleToggleScenario = (id: string) => {
    setSelectedScenarioIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId || !selectedWorldId || selectedScenarioIds.length === 0) {
      alert('Please select at least one scenario to simulate.');
      return;
    }

    setLaunching(true);
    try {
      const exp = await api.createExperiment({
        name: experimentName,
        agentId: selectedAgentId,
        worldId: selectedWorldId,
        scenarioIds: selectedScenarioIds,
      });

      await api.runExperiment(exp.id);
      onExperimentStarted(exp.id);
    } catch (err: any) {
      alert(`Launch error: ${err.message}`);
      setLaunching(false);
    }
  };

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
          Configure a controlled evaluation matrix with edge cases, tool failures, and policy guardrails.
        </p>
      </div>

      <form onSubmit={handleLaunch} className="space-y-6">
        {/* Step 1: Agent & World Selection */}
        <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
          <h3 className="font-sans font-bold text-sm text-burgundy">1. Target Architecture & Environment</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                Select AI Agent
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full border border-copper/25 p-2.5 rounded bg-ivory text-xs font-sans focus:outline-none focus:border-copper"
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
                Select Environment (World)
              </label>
              <select
                value={selectedWorldId}
                onChange={(e) => {
                  setSelectedWorldId(e.target.value);
                  loadScenarios(e.target.value);
                }}
                className="w-full border border-copper/25 p-2.5 rounded bg-ivory text-xs font-sans focus:outline-none focus:border-copper"
              >
                {worlds.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.industry})
                  </option>
                ))}
              </select>
            </div>
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
              className="w-full border border-copper/25 p-2.5 rounded bg-ivory text-xs font-sans focus:outline-none focus:border-copper"
            />
          </div>
        </div>

        {/* Step 2: Scenario Selection Checklist */}
        <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-sans font-bold text-sm text-burgundy">
                2. Test Scenarios ({selectedScenarioIds.length} of {scenarios.length} selected)
              </h3>
              <p className="font-sans text-xs text-burgundy/50 mt-0.5">
                Include tool failure injections and adversarial conditions for comprehensive scoring.
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
                            : sc.category === 'escalation'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {sc.category}
                      </span>
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
            disabled={launching || selectedScenarioIds.length === 0}
            className="cursor-pointer flex items-center gap-2 bg-copper text-ivory px-6 py-3 rounded text-sm font-mono font-bold hover:bg-copper-dark transition-all shadow-md disabled:opacity-50"
          >
            <Play size={15} />
            <span>{launching ? 'Initializing Sandbox...' : `Launch Simulation (${selectedScenarioIds.length} Scenarios)`}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
