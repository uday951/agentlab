import { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import {
  api,
  type ProviderComparisonItem,
  type BenchmarkProject,
  type BenchmarkOrigin,
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

export function ProviderComparisonView({ onNavigateToDashboard }: { onNavigateToDashboard?: () => void }) {
  const [comparisons, setComparisons] = useState<ProviderComparisonItem[]>([]);
  const [projects, setProjects] = useState<BenchmarkProject[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, compList] = await Promise.all([
        api.getBenchmarkProjects().catch(() => []),
        api.getProviderComparisons(selectedProjectIds.length > 0 ? selectedProjectIds : undefined).catch(() => []),
      ]);
      setProjects(projList);
      setComparisons(compList);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectIds]);

  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-copper/15">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-burgundy">
              AI Coding Provider Comparison
            </h1>
            <span className="text-[10px] bg-copper/20 text-copper px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
              Apples-to-Apples Matrix
            </span>
          </div>
          <p className="text-sm text-burgundy/70 mt-1">
            Standardized 5-pillar benchmark comparison across Lovable, Emergent, Bolt.new, and Replit Agent applications.
          </p>
        </div>

        {onNavigateToDashboard && (
          <button
            onClick={onNavigateToDashboard}
            className="px-3 py-2 text-xs font-semibold rounded border border-copper/30 text-burgundy hover:bg-copper/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight size={14} className="rotate-180" />
            <span>Back to Benchmark Dashboard</span>
          </button>
        )}
      </div>

      {/* Project Selection Bar */}
      <div className="bg-ivory border border-copper/20 rounded p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-burgundy uppercase">
            Filter Projects for Side-by-Side Comparison ({selectedProjectIds.length > 0 ? selectedProjectIds.length : 'All'} Selected):
          </span>
          {selectedProjectIds.length > 0 && (
            <button
              onClick={() => setSelectedProjectIds([])}
              className="text-[11px] font-mono text-copper underline cursor-pointer hover:text-burgundy"
            >
              Clear selection (show all)
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {projects.map((p) => {
            const isSelected = selectedProjectIds.includes(p.id);
            const cfg = ORIGIN_CONFIG[p.origin] || { label: p.origin, color: 'text-burgundy', bg: 'bg-ivory' };
            return (
              <button
                key={p.id}
                onClick={() => toggleProject(p.id)}
                className={`px-3 py-1.5 rounded text-xs font-sans border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-burgundy text-ivory border-burgundy font-bold shadow-sm'
                    : 'bg-white border-copper/20 text-burgundy hover:bg-copper/10'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-copper' : 'bg-copper/40'}`} />
                <span>{p.name}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-ivory border border-copper/20 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-copper/15 flex items-center justify-between bg-ivory-dark/40">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-copper" />
            <h2 className="text-sm font-bold text-burgundy font-display">
              Comparative Benchmark Results ({comparisons.length} Runs Analyzed)
            </h2>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs font-mono text-burgundy/60 hover:text-burgundy flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {comparisons.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-burgundy/60 space-y-2">
            <Layers size={32} className="text-copper/40 mx-auto" />
            <div>No benchmark execution records found for the selected projects.</div>
            <div className="text-[11px] text-burgundy/50">
              Run benchmark test suites on imported projects to populate comparative evaluation metrics.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-ivory-dark/60 text-burgundy/70 border-b border-copper/15 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Project & Origin</th>
                  <th className="py-2.5 px-3 text-center">Overall Score</th>
                  <th className="py-2.5 px-3 text-center">Build Status</th>
                  <th className="py-2.5 px-3 text-center">Functional Pass</th>
                  <th className="py-2.5 px-3 text-center">A11y Score</th>
                  <th className="py-2.5 px-3 text-center">Responsive</th>
                  <th className="py-2.5 px-3 text-center">Security</th>
                  <th className="py-2.5 px-3 text-center">Duration</th>
                  <th className="py-2.5 px-4">Top Failure Categories</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-copper/10">
                {comparisons.map((c) => {
                  const cfg = ORIGIN_CONFIG[c.origin] || { label: c.origin, color: 'text-burgundy', bg: 'bg-ivory' };
                  return (
                    <tr key={c.runId} className="hover:bg-ivory-dark/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-burgundy">{c.projectName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] font-mono text-burgundy/40">
                            {new Date(c.runDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-base font-bold font-display ${
                            c.overallScore >= 70 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {c.overallScore}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {c.buildSuccess ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle size={11} />
                            <span>Passed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <XCircle size={11} />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        <span className="font-semibold text-burgundy">{c.functionalPassRate}%</span>
                        <div className="text-[10px] text-burgundy/50">
                          {c.passedTests}/{c.totalTests} tests
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-burgundy">
                        {c.accessibilityScore}%
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-burgundy">
                        {c.responsiveScore}%
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-burgundy">
                        {c.securityScore}%
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-burgundy/60">
                        {Math.round(c.durationMs / 1000)}s
                      </td>

                      <td className="py-3 px-4">
                        {c.failureCategories && c.failureCategories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.failureCategories.map((cat, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-[9px] font-mono text-red-800"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-700 text-[10px] font-mono flex items-center gap-1">
                            <CheckCircle size={11} />
                            <span>No major failures</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Methodology & Fair Scoring Documentation */}
      <div className="bg-ivory border border-copper/20 rounded p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <FileCheck size={16} className="text-copper" />
          <h3 className="text-xs font-bold font-mono uppercase text-burgundy">
            Fair Provider Comparison & Normalized Scoring Methodology
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-burgundy/80 font-sans">
          <div className="space-y-1.5">
            <p>
              <strong>1. Standardized 5-Pillar Weighting:</strong> All applications are scored across Functional Correctness (50%), Build & Compilation (20%), WCAG 2.1 Accessibility (10%), Multi-Device Responsive Design (10%), and Static Security (10%).
            </p>
            <p>
              <strong>2. Dynamic Weight Normalization:</strong> When a particular pillar is not applicable or cannot be tested due to lack of endpoints, weights are normalized strictly across available pillars rather than awarding arbitrary default full marks.
            </p>
          </div>
          <div className="space-y-1.5">
            <p>
              <strong>3. Infrastructure vs. Application Isolation:</strong> If runner processes or network ports cannot bind, the run is explicitly flagged as an <em>Infrastructure Failure</em> and excluded from scoring penalties.
            </p>
            <p>
              <strong>4. Repeatability & Headless Browser Verification:</strong> Scenarios interact directly with real DOM elements using Playwright and record timestamped console output and screenshots for complete empirical reproducibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
