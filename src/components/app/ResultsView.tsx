import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCw,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, type Experiment } from '../../lib/api';

interface ResultsViewProps {
  experimentId?: string;
  onRunAgain: (expId: string) => void;
}

export const ResultsView = ({ experimentId, onRunAgain }: ResultsViewProps) => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string>(experimentId || '');
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getExperiments().then((exps) => {
      setExperiments(exps);
      const targetId = experimentId || (exps.length > 0 ? exps[0].id : '');
      setSelectedExpId(targetId);
      if (targetId) {
        loadExperiment(targetId);
      } else {
        setLoading(false);
      }
    });
  }, [experimentId]);

  const loadExperiment = async (id: string) => {
    setLoading(true);
    try {
      const exp = await api.getExperiment(id);
      setExperiment(exp);
      if (exp.runs.length > 0) {
        setExpandedRunId(exp.runs[0].id);
      }
    } catch (err) {
      console.error('Failed to load experiment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExp = (id: string) => {
    setSelectedExpId(id);
    loadExperiment(id);
  };

  if (loading) {
    return <div className="p-8 text-center font-mono text-xs text-burgundy/50">Loading evaluation report...</div>;
  }

  if (!experiment || !experiment.results) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto my-12 bg-white border border-copper/20 rounded-lg shadow-sm">
        <AlertTriangle size={32} className="mx-auto text-copper mb-2" />
        <h2 className="font-display text-xl font-bold text-burgundy mb-1">No Evaluation Results</h2>
        <p className="font-sans text-xs text-burgundy/60 mb-4">
          Select or run a simulation to inspect deterministic benchmark metrics and failure explanations.
        </p>
      </div>
    );
  }

  const res = experiment.results;

  // Bar chart data
  const chartData = [
    { name: 'Task', val: res.taskCompletionRate },
    { name: 'Outcome', val: res.correctOutcomeRate },
    { name: 'Tool Acc.', val: res.toolSuccessRate },
    { name: 'Policy', val: res.policyComplianceRate },
  ];

  // Filtered runs
  const filteredRuns = (experiment.runs || []).filter((run) => {
    if (filter === 'passed' && run.status !== 'passed') return false;
    if (filter === 'failed' && run.status === 'passed') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        run.scenarioTitle.toLowerCase().includes(q) ||
        run.agentOutput.decision.toLowerCase().includes(q) ||
        run.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-7xl mx-auto space-y-8">
      {/* Top Controls & Experiment Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy">
              Evaluation & Failure Report
            </h1>
          </div>
          <p className="font-sans text-xs text-burgundy/60">
            Deterministic evaluation against configured policies, tools, and ground-truth expectations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Select Experiment Dropdown */}
          <select
            value={selectedExpId}
            onChange={(e) => handleSelectExp(e.target.value)}
            className="border border-copper/30 bg-white text-xs font-mono p-2 rounded focus:outline-none focus:border-copper"
          >
            {experiments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.status})
              </option>
            ))}
          </select>

          {/* Export CSV */}
          <a
            href={api.getExportUrl(experiment.id, 'csv')}
            download
            className="flex items-center gap-1.5 border border-copper/30 text-copper hover:bg-copper hover:text-ivory px-3 py-2 text-xs font-mono rounded transition-colors"
          >
            <Download size={13} />
            <span>CSV</span>
          </a>

          {/* Export JSON */}
          <a
            href={api.getExportUrl(experiment.id, 'json')}
            download
            className="flex items-center gap-1.5 border border-copper/30 text-copper hover:bg-copper hover:text-ivory px-3 py-2 text-xs font-mono rounded transition-colors"
          >
            <Download size={13} />
            <span>JSON</span>
          </a>

          {/* Run Again Button */}
          <button
            onClick={() => onRunAgain(experiment.id)}
            className="cursor-pointer flex items-center gap-1.5 bg-burgundy text-ivory px-3.5 py-2 text-xs font-sans font-bold hover:bg-burgundy-light rounded transition-colors"
          >
            <RotateCw size={13} />
            <span>Run Again</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Overall Score', val: `${res.overallScore}/100`, sub: 'Benchmark' },
          { label: 'Task Success', val: `${res.correctOutcomeRate}%`, sub: `${res.passedScenarios}/${res.totalScenarios} Passed` },
          { label: 'Tool Success', val: `${res.toolSuccessRate}%`, sub: `${res.toolFailureCount} Injected Error` },
          { label: 'Policy Adherence', val: `${res.policyComplianceRate}%`, sub: 'Guarded' },
          { label: 'Avg Turn Duration', val: `${res.averageDurationMs}ms`, sub: 'Deterministic' },
          { label: 'Estimated Cost', val: '$0.00', sub: 'Sample Agent' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-copper/20 p-4 rounded shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-copper font-bold mb-1">
              {item.label}
            </div>
            <div className="font-display text-xl sm:text-2xl font-bold text-burgundy">{item.val}</div>
            <div className="font-sans text-[10px] text-zinc-500 mt-0.5">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + Failure Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric Chart */}
        <div className="bg-white border border-copper/20 p-5 rounded shadow-sm lg:col-span-1">
          <h3 className="font-mono text-xs text-burgundy/60 uppercase tracking-widest mb-4">
            Dimension Breakdown
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFD0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5A1830' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#5A1830' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#5A1830', color: '#F6F0E8', border: 'none', fontSize: 12, borderRadius: 4 }}
                  cursor={{ fill: 'rgba(182,106,69,0.08)' }}
                />
                <Bar dataKey="val" fill="#B8734F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Failure & Anomaly Breakdown */}
        <div className="bg-white border border-copper/20 p-5 rounded shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-xs text-burgundy/60 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-copper" />
                <span>Diagnostic Failure Analysis ({res.failuresList.length} anomalies)</span>
              </h3>
            </div>

            {res.failuresList.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded text-xs text-emerald-900 font-sans space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>100% Benchmark Compliance</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  All 10 test scenarios resolved according to ground-truth expectations. Injected tool failure in Scenario #05 was successfully intercepted and escalated to Tier-2 operations.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {res.failuresList.map((fail, idx) => (
                  <div key={idx} className="p-3 bg-rose-50/60 border border-rose-200 rounded text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-rose-950">
                      <span>{fail.scenarioTitle}</span>
                      <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-rose-200 text-rose-900 uppercase">
                        {fail.failureCategory}
                      </span>
                    </div>
                    <div className="text-[11px] text-rose-800">
                      <strong>Observed:</strong> {fail.explanation}
                    </div>
                    <div className="text-[11px] text-copper font-mono">
                      ↳ Remediation: {fail.suggestedRemediation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scenario-by-Scenario Result Inspector */}
      <div className="bg-white border border-copper/20 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-copper/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-ivory/30">
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-bold text-sm text-burgundy">Scenario Runs & Traces</h3>
            <span className="text-xs font-mono text-zinc-500">
              ({filteredRuns.length} of {experiment.runs?.length || 0})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <div className="flex bg-ivory border border-copper/20 rounded p-0.5 text-[11px] font-mono">
              {(['all', 'passed', 'failed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded capitalize transition-all cursor-pointer ${
                    filter === f ? 'bg-copper text-ivory font-bold' : 'text-burgundy/60 hover:text-burgundy'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search runs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1 border border-copper/20 rounded text-xs font-sans bg-white focus:outline-none focus:border-copper w-36 sm:w-48"
              />
              <Search size={12} className="absolute left-2.5 top-2 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Table of Runs */}
        <div className="divide-y divide-copper/10">
          {filteredRuns.map((run) => {
            const isExpanded = expandedRunId === run.id;
            return (
              <div key={run.id} className="transition-colors">
                <div
                  onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                  className="p-3.5 hover:bg-ivory/40 cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 truncate">
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-copper flex-shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-zinc-400 flex-shrink-0" />
                    )}
                    <span className="font-mono text-copper font-bold text-[11px]">{run.scenarioId}</span>
                    <span className="font-sans font-bold text-burgundy truncate">{run.scenarioTitle}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 uppercase hidden sm:inline">
                      {run.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-mono text-[11px] text-zinc-500 hidden md:inline">
                      Decision: <strong className="text-burgundy">{run.agentOutput.decision}</strong>
                    </span>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        run.status === 'passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-ivory/60 border-t border-copper/10 space-y-3 font-sans text-xs">
                    <div className="bg-white p-3 rounded border border-copper/15">
                      <div className="font-mono text-[10px] text-copper uppercase font-bold mb-1">
                        Agent Final Communication
                      </div>
                      <p className="text-burgundy leading-relaxed">{run.agentOutput.message}</p>
                      <div className="text-[11px] font-mono text-zinc-500 mt-2">
                        Rationale: {run.agentOutput.rationale}
                      </div>
                    </div>

                    {/* Step Execution Trace */}
                    <div>
                      <div className="font-mono text-[10px] text-copper uppercase font-bold mb-1.5">
                        Execution Event Log ({run.executionTrace?.length || 0} steps)
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {(run.executionTrace || []).map((step, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-2 bg-white rounded border border-copper/15 font-mono text-[11px] flex items-start gap-2"
                          >
                            <span className="text-copper/60 text-[10px]">#{step.step}</span>
                            <span className="px-1.5 py-0.2 bg-zinc-100 text-zinc-700 rounded text-[9px] uppercase font-bold">
                              {step.actionType}
                            </span>
                            <div className="flex-1 truncate">
                              <span className="text-burgundy truncate">{step.inputSummary}</span>
                              <span className="text-zinc-500 ml-2">↳ {step.outputSummary}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
