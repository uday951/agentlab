import { useState } from 'react';
import { HeroViz3D } from './HeroViz3D';

export const Hero = () => {
  const [simState, setSimState] = useState<'idle' | 'running' | 'complete'>('idle');
  const [messages, setMessages] = useState<string[]>([]);

  const allMessages = [
    'Initializing environment [ShopSphere]...',
    'Agent connected [SampleSupportAgent]...',
    'Generating 10 evaluation scenarios...',
    'Injecting payment gateway 503 error...',
    'Agent intercepting error & escalating...',
    'Simulation & benchmark complete.',
  ];

  const handleRun = () => {
    if (simState !== 'idle') return;
    setSimState('running');
    setMessages([]);
    let step = 0;
    const interval = setInterval(() => {
      setMessages((prev) => [...prev, allMessages[step]]);
      step++;
      if (step >= allMessages.length) {
        clearInterval(interval);
        setTimeout(() => setSimState('complete'), 400);
      }
    }, 400);
  };

  const completionStats = [
    { label: 'Scenarios Evaluated', val: '10' },
    { label: 'Task Success Rate', val: '100%' },
    { label: 'Tool Success Rate', val: '90%' },
    { label: 'Policy Adherence', val: '100%' },
    { label: 'Failures Caught', val: '1 Tool Error' },
  ];

  return (
    <section className="min-h-screen flex flex-col md:flex-row bg-ivory text-burgundy">
      {/* Left column */}
      <div className="w-full md:w-1/2 p-8 md:p-14 lg:p-18 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-copper animate-ping"></span>
          <p className="font-mono text-xs tracking-[0.25em] text-copper uppercase font-bold">
            Where AI agents meet reality.
          </p>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] mb-6 text-burgundy">
          What happens when you give an AI a world?
        </h1>

        <p className="font-sans text-burgundy/70 text-base md:text-lg mb-8 max-w-lg leading-relaxed">
          Create realistic virtual environments, simulate thousands of edge cases and tool failures, and evaluate autonomous agent performance before deploying to production.
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <a
            href="/app"
            className="cursor-pointer bg-burgundy text-ivory px-7 py-3 font-sans font-semibold hover:bg-burgundy-light transition-all text-sm rounded shadow-sm inline-flex items-center gap-2"
          >
            <span>Enter AgentLab</span>
            <span className="text-copper">→</span>
          </a>
          <a
            href="#live-simulation"
            className="cursor-pointer border border-burgundy/30 text-burgundy px-7 py-3 font-sans font-semibold hover:bg-burgundy/5 transition-colors text-sm rounded"
          >
            Explore a Simulation
          </a>
        </div>

        {/* Live Simulation Control Terminal */}
        <div className="bg-[#3A0D1C] text-ivory p-4 sm:p-5 font-mono text-sm border border-copper/30 rounded max-w-lg shadow-xl">
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-copper/20">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-copper animate-pulse" />
              <span className="text-copper text-[10px] tracking-[0.2em] uppercase font-bold">
                Simulation Engine
              </span>
            </div>
            <button
              onClick={handleRun}
              disabled={simState !== 'idle'}
              className={`cursor-pointer px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors rounded ${
                simState === 'idle'
                  ? 'bg-copper text-ivory hover:bg-copper-dark shadow-sm'
                  : 'bg-copper/20 text-ivory/30 cursor-not-allowed'
              }`}
            >
              [ RUN ]
            </button>
          </div>

          <div className="min-h-[110px]">
            {simState === 'idle' && (
              <div className="text-ivory/40 text-xs flex flex-col justify-center h-24">
                <span>Click [ RUN ] to execute a deterministic 10-scenario simulation with simulated tool failure injection.</span>
              </div>
            )}

            {simState === 'running' && (
              <div className="space-y-1.5 py-1">
                {messages.map((msg, i) => (
                  <div key={i} className="text-xs text-ivory/80 flex items-center gap-2">
                    <span className="text-copper font-bold">›</span>
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            )}

            {simState === 'complete' && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1">
                {completionStats.map((item, i) => (
                  <div key={i} className="bg-black/20 p-2 rounded border border-copper/15">
                    <div className="text-copper font-display font-bold text-sm">{item.val}</div>
                    <div className="text-ivory/50 text-[10px] tracking-wide mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right column — 3D Multi-Mode Visualization */}
      <div className="w-full md:w-1/2 h-[500px] md:h-auto bg-[#3A0D1C] relative overflow-hidden">
        <HeroViz3D />
      </div>
    </section>
  );
};
