import { useState, useEffect, useRef } from 'react';
import {
  Square,
  Activity,
  ArrowRight,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { Experiment, ExecutionEvent } from '../../lib/api';

interface SimulationCenterProps {
  experimentId?: string;
  onViewResults: (expId: string) => void;
  onRunQuickDemo: () => void;
}

export const SimulationCenter = ({
  experimentId,
  onViewResults,
  onRunQuickDemo,
}: SimulationCenterProps) => {
  const [activeExp, setActiveExp] = useState<Experiment | null>(null);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(1);
  const [totalScenarios, setTotalScenarios] = useState(10);
  const [isLive, setIsLive] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const eventListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!experimentId) {
      // Find latest running or completed experiment
      api.getExperiments().then((exps) => {
        if (exps.length > 0) {
          const target = exps.find((e) => e.status === 'running') || exps[0];
          setActiveExp(target);
          setEvents(target.events || []);
          setTotalScenarios(target.scenarioCount || 10);
          if (target.status === 'running') {
            startSSE(target.id);
          }
        }
      });
      return;
    }

    api.getExperiment(experimentId).then((exp) => {
      setActiveExp(exp);
      setEvents(exp.events || []);
      setTotalScenarios(exp.scenarioCount || 10);
      if (exp.status === 'running' || exp.status === 'pending') {
        startSSE(exp.id);
      }
    });
  }, [experimentId]);

  const startSSE = (expId: string) => {
    setIsLive(true);
    const es = api.createEventStream(expId, (message) => {
      if (message.type === 'event') {
        setEvents((prev) => [...prev, message.data]);
        scrollToBottom();
      } else if (message.type === 'scenario_started') {
        setCurrentScenarioIndex(message.data.index);
        setTotalScenarios(message.data.total);
      } else if (message.type === 'experiment_completed') {
        setIsLive(false);
        api.getExperiment(expId).then(setActiveExp);
      }
    });

    return () => {
      es.close();
      setIsLive(false);
    };
  };

  const scrollToBottom = () => {
    if (eventListRef.current) {
      eventListRef.current.scrollTop = eventListRef.current.scrollHeight;
    }
  };

  const handleCancel = async () => {
    if (!activeExp) return;
    setCancelling(true);
    await api.cancelExperiment(activeExp.id);
    setCancelling(false);
    setIsLive(false);
  };

  if (!activeExp) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto my-12 bg-white border border-copper/20 rounded-lg shadow-sm">
        <Activity size={32} className="mx-auto text-copper mb-3 animate-pulse" />
        <h2 className="font-display text-xl font-bold text-burgundy mb-1">
          No Active Simulation Selected
        </h2>
        <p className="font-sans text-xs text-burgundy/60 mb-5">
          Launch an experiment or trigger the 1-Click College Review Demo to watch live event streaming and agent tool telemetry.
        </p>
        <button
          onClick={onRunQuickDemo}
          className="cursor-pointer bg-copper text-ivory px-5 py-2.5 rounded font-mono text-xs font-bold hover:bg-copper-dark transition-all inline-flex items-center gap-2"
        >
          <Sparkles size={14} />
          <span>Launch 1-Click College Demo</span>
        </button>
      </div>
    );
  }

  const latestEvent = events[events.length - 1];

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-7xl mx-auto">
      {/* Top Telemetry Header */}
      <div className="bg-[#3A0D1C] text-ivory p-4 sm:p-5 rounded-lg border border-copper/30 shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs text-copper font-bold uppercase tracking-wider">
                {activeExp.name}
              </span>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase ${
                  isLive
                    ? 'bg-copper text-ivory font-bold animate-pulse'
                    : activeExp.status === 'completed'
                    ? 'bg-emerald-600/30 text-emerald-300'
                    : 'bg-zinc-700 text-zinc-300'
                }`}
              >
                {isLive ? 'LIVE STREAMING (SSE)' : activeExp.status.toUpperCase()}
              </span>
            </div>
            <div className="font-mono text-xs text-ivory/60">
              Agent: <strong className="text-ivory">{activeExp.agentName}</strong> · World:{' '}
              <strong className="text-ivory">{activeExp.worldName}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLive ? (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="cursor-pointer flex items-center gap-1.5 bg-rose-900/80 hover:bg-rose-800 text-ivory px-3 py-1.5 rounded text-xs font-mono transition-colors"
              >
                <Square size={12} />
                <span>{cancelling ? 'Halting...' : 'Abort Run'}</span>
              </button>
            ) : (
              <button
                onClick={() => onViewResults(activeExp.id)}
                className="cursor-pointer flex items-center gap-1.5 bg-copper text-ivory px-4 py-2 rounded text-xs font-mono font-bold hover:bg-copper-dark transition-all"
              >
                <span>View Full Results</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-4 border-t border-copper/20">
          <div className="flex justify-between items-center text-[10px] font-mono text-ivory/60 mb-1.5">
            <span>
              SCENARIO {currentScenarioIndex} OF {totalScenarios}
            </span>
            <span>{activeExp.progress || Math.round((currentScenarioIndex / totalScenarios) * 100)}% COMPLETE</span>
          </div>
          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-copper h-full transition-all duration-300"
              style={{
                width: `${activeExp.progress || Math.round((currentScenarioIndex / totalScenarios) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Simulation View Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Event Stream Terminal */}
        <div className="lg:col-span-2 bg-white border border-copper/20 rounded-lg shadow-sm flex flex-col h-[560px]">
          <div className="p-3.5 border-b border-copper/15 flex items-center justify-between bg-ivory/40">
            <div className="flex items-center gap-2">
              <Terminal size={15} className="text-copper" />
              <span className="font-mono text-xs text-burgundy font-bold uppercase tracking-wider">
                Execution Trace & Event Timeline
              </span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">
              {events.length} events emitted
            </span>
          </div>

          <div
            ref={eventListRef}
            className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs bg-[#240610] text-ivory/90 scrollbar-thin"
          >
            {events.length === 0 ? (
              <div className="text-center py-20 text-ivory/40 text-xs">
                Awaiting telemetry events from backend runner...
              </div>
            ) : (
              events.map((evt, idx) => (
                <div
                  key={evt.id || idx}
                  className="p-3 rounded bg-[#3A0D1C]/80 border border-copper/20 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-copper/60">#{evt.step}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded uppercase font-bold text-[9px] ${
                          evt.actionType === 'failure_injected'
                            ? 'bg-rose-900 text-rose-200'
                            : evt.actionType === 'tool_call'
                            ? 'bg-copper/30 text-copper'
                            : evt.actionType === 'policy_check'
                            ? 'bg-amber-900/60 text-amber-200'
                            : evt.actionType === 'agent_decision'
                            ? 'bg-emerald-900/60 text-emerald-200'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {evt.actionType}
                      </span>
                    </div>
                    <span className="text-ivory/40">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-ivory font-medium mt-1">{evt.inputSummary}</div>
                  <div
                    className={`text-[11px] ${
                      evt.status === 'error'
                        ? 'text-rose-300 font-bold'
                        : evt.status === 'warning'
                        ? 'text-amber-300'
                        : 'text-ivory/70'
                    }`}
                  >
                    ↳ {evt.outputSummary}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Live Inspector & Environment State */}
        <div className="space-y-4">
          {/* Active Deliberation Status */}
          <div className="bg-white border border-copper/20 p-4 rounded-lg shadow-sm">
            <h4 className="font-mono text-[10px] text-copper uppercase font-bold tracking-wider mb-2">
              Agent State Telemetry
            </h4>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLive ? 'bg-copper animate-ping' : 'bg-emerald-600'
                }`}
              />
              <span className="font-sans font-bold text-sm text-burgundy">
                {isLive ? 'Deliberating Decision Matrix' : 'Scenario Completed'}
              </span>
            </div>

            {latestEvent && (
              <div className="bg-ivory/60 p-3 rounded text-[11px] font-mono border border-copper/15 space-y-1">
                <div className="text-burgundy/60 text-[10px] uppercase">Last Action</div>
                <div className="text-burgundy font-bold truncate">{latestEvent.actionType}</div>
                <div className="text-burgundy/70 line-clamp-2">{latestEvent.outputSummary}</div>
              </div>
            )}
          </div>

          {/* Quick Scenario Results Summary */}
          <div className="bg-white border border-copper/20 p-4 rounded-lg shadow-sm">
            <h4 className="font-mono text-[10px] text-copper uppercase font-bold tracking-wider mb-2">
              Completed Scenarios ({activeExp.runs?.length || 0})
            </h4>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(activeExp.runs || []).map((run) => (
                <div
                  key={run.id}
                  className="p-2 border border-copper/15 rounded text-[11px] font-sans flex items-center justify-between"
                >
                  <div className="truncate mr-2">
                    <div className="font-bold text-burgundy truncate">{run.scenarioTitle}</div>
                    <div className="font-mono text-[9px] text-burgundy/50">{run.agentOutput.decision}</div>
                  </div>
                  <span
                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      run.status === 'passed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
