import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Bot,
  Globe,
  Play,
  RotateCw,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, type Experiment, type Agent, type World } from '../../lib/api';

interface OverviewProps {
  onNavigate: (tab: string, expId?: string) => void;
  onRunQuickDemo: () => void;
}

export const OverviewPanel = ({ onNavigate, onRunQuickDemo }: OverviewProps) => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [exps, ags, wlds] = await Promise.all([
        api.getExperiments(),
        api.getAgents(),
        api.getWorlds(),
      ]);
      setExperiments(exps);
      setAgents(ags);
      setWorlds(wlds);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute aggregate metrics from real runs
  const completed = experiments.filter((e) => e.status === 'completed' && e.results);
  const totalScenarios = completed.reduce((acc, e) => acc + (e.results?.totalScenarios || 0), 0);
  const passedScenarios = completed.reduce((acc, e) => acc + (e.results?.passedScenarios || 0), 0);
  const successRate = totalScenarios > 0 ? Math.round((passedScenarios / totalScenarios) * 1000) / 10 : 0;
  const totalFailures = completed.reduce((acc, e) => acc + (e.results?.failuresList?.length || 0), 0);

  // Chart data from latest completed experiment or aggregate
  const latestResults = completed[0]?.results;
  const barData = latestResults
    ? [
        { name: 'Task', val: latestResults.taskCompletionRate },
        { name: 'Outcome', val: latestResults.correctOutcomeRate },
        { name: 'Tool Acc.', val: latestResults.toolSuccessRate },
        { name: 'Policy', val: latestResults.policyComplianceRate },
      ]
    : [
        { name: 'Task', val: 0 },
        { name: 'Outcome', val: 0 },
        { name: 'Tool Acc.', val: 0 },
        { name: 'Policy', val: 0 },
      ];

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-7xl mx-auto">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">
            Simulation Overview
          </h1>
          <p className="font-sans text-xs sm:text-sm text-burgundy/60">
            Real-time telemetry and evaluation records for connected agents
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 border border-copper/30 text-copper hover:bg-copper/10 rounded transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onRunQuickDemo}
            className="cursor-pointer flex items-center gap-2 bg-copper text-ivory px-4 py-2 rounded text-xs font-mono font-bold hover:bg-copper-dark transition-all shadow-sm"
          >
            <Sparkles size={14} />
            <span>Run 1-Click College Demo</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { icon: Bot, label: 'Agents Registered', val: agents.length, sub: 'Active adapters' },
          { icon: Globe, label: 'Simulation Worlds', val: worlds.length, sub: 'Environments loaded' },
          {
            icon: CheckCircle2,
            label: 'Benchmark Accuracy',
            val: completed.length > 0 ? `${successRate}%` : 'N/A',
            sub: `${passedScenarios}/${totalScenarios} scenarios`,
          },
          {
            icon: AlertTriangle,
            label: 'Detected Failures',
            val: totalFailures,
            sub: 'Root causes analyzed',
          },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border border-copper/20 p-4 sm:p-5 rounded"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className="text-copper flex-shrink-0" />
                <span className="font-mono text-[10px] text-burgundy/50 uppercase tracking-wider truncate">
                  {item.label}
                </span>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">
                {item.val}
              </div>
              <div className="font-sans text-xs text-burgundy/40 truncate">{item.sub}</div>
            </motion.div>
          );
        })}
      </div>

      {/* AI Coding Benchmark Feature Banner */}
      <div className="bg-gradient-to-r from-burgundy via-[#4A1224] to-burgundy text-ivory rounded p-5 mb-8 border border-copper/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-copper text-burgundy font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              New: Coding Benchmark Platform
            </span>
            <span className="text-xs text-copper font-mono">“Where AI Agents Meet Reality”</span>
          </div>
          <h2 className="text-base font-bold font-display text-ivory">
            Benchmark AI-Generated Applications (Lovable, Emergent, Bolt.new, Replit Agent)
          </h2>
          <p className="text-xs text-ivory/70 max-w-2xl">
            Import generated codebases via GitHub or ZIP, automatically prepare dependencies in isolated execution sandboxes, run real 5-pillar evaluations, and compare providers side-by-side.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onNavigate('benchmarks')}
            className="px-4 py-2 rounded bg-copper text-burgundy font-mono font-bold text-xs hover:bg-copper-dark transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <span>Open Benchmarks</span>
            <ArrowRight size={13} />
          </button>
          <button
            onClick={() => onNavigate('compare')}
            className="px-3 py-2 rounded border border-copper/40 text-ivory font-mono text-xs hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span>Compare Providers</span>
          </button>
        </div>
      </div>

      {/* Chart + Recent Experiments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
        {/* Metric Bar Chart */}
        <div className="bg-white border border-copper/20 p-4 sm:p-5 rounded">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-mono text-xs text-burgundy/60 uppercase tracking-widest">
              Performance Dimensions ({completed[0]?.name || 'Baseline'})
            </h3>
            <span className="font-mono text-[10px] text-copper">
              {latestResults ? `Overall Score: ${latestResults.overallScore}/100` : 'No runs yet'}
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFD0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5A1830' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#5A1830' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#5A1830', color: '#F6F0E8', border: 'none', fontSize: 12, borderRadius: 4 }}
                  cursor={{ fill: 'rgba(182,106,69,0.08)' }}
                />
                <Bar dataKey="val" fill="#5A1830" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Experiments Activity */}
        <div className="bg-white border border-copper/20 p-4 sm:p-5 rounded flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-mono text-xs text-burgundy/60 uppercase tracking-widest">
                Recent Simulation Runs
              </h3>
              <button
                onClick={() => onNavigate('experiments')}
                className="text-xs font-mono text-copper hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {experiments.length === 0 ? (
              <div className="text-center py-10 text-burgundy/40 font-mono text-xs">
                No experiment records found in local persistence store.
                <div className="mt-3">
                  <button
                    onClick={onRunQuickDemo}
                    className="cursor-pointer text-copper underline font-bold"
                  >
                    Run 1-Click Demo to populate initial data
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {experiments.slice(0, 4).map((exp) => (
                  <div
                    key={exp.id}
                    onClick={() => onNavigate('results', exp.id)}
                    className="p-2.5 border border-copper/15 hover:border-copper/40 hover:bg-ivory/50 rounded transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="truncate mr-3">
                      <div className="font-sans font-bold text-xs text-burgundy truncate">{exp.name}</div>
                      <div className="font-mono text-[10px] text-burgundy/50 truncate">
                        {exp.agentName} · {exp.worldName}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {exp.status === 'completed' && exp.results && (
                        <div className="text-right">
                          <span className="font-display font-bold text-copper text-xs sm:text-sm">
                            {exp.results.correctOutcomeRate}%
                          </span>
                          <span className="block font-mono text-[9px] text-burgundy/40">
                            {exp.results.passedScenarios}/{exp.results.totalScenarios} pass
                          </span>
                        </div>
                      )}
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                          exp.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : exp.status === 'running'
                            ? 'bg-copper/20 text-copper animate-pulse'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('agents')}
          className="p-4 bg-ivory border border-copper/20 hover:border-copper/60 rounded cursor-pointer transition-all flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded bg-copper/15 text-copper flex items-center justify-center flex-shrink-0">
            <Bot size={20} />
          </div>
          <div>
            <h4 className="font-sans font-bold text-sm text-burgundy">Connect an Agent</h4>
            <p className="font-sans text-xs text-burgundy/60 mt-0.5">
              Configure Built-in, API, or CLI adapter with custom capabilities and tools.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('worlds')}
          className="p-4 bg-ivory border border-copper/20 hover:border-copper/60 rounded cursor-pointer transition-all flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded bg-copper/15 text-copper flex items-center justify-center flex-shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <h4 className="font-sans font-bold text-sm text-burgundy">Configure World</h4>
            <p className="font-sans text-xs text-burgundy/60 mt-0.5">
              Set up simulated tools, corporate policies, and test failure injection rules.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('experiments')}
          className="p-4 bg-ivory border border-copper/20 hover:border-copper/60 rounded cursor-pointer transition-all flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded bg-copper/15 text-copper flex items-center justify-center flex-shrink-0">
            <Play size={20} />
          </div>
          <div>
            <h4 className="font-sans font-bold text-sm text-burgundy">Create Experiment</h4>
            <p className="font-sans text-xs text-burgundy/60 mt-0.5">
              Select scenarios, configure edge cases, and launch live evaluation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
