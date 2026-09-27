import { useState } from 'react';
import { HeroViz3D } from './HeroViz3D';

export const Hero = () => {
  const [simState, setSimState] = useState<'idle' | 'running' | 'complete'>('idle');
  const [messages, setMessages] = useState<string[]>([]);

  const allMessages = [
    'Initializing environment...',
    'Agent connected...',
    'Generating scenarios...',
    'Agent acting...',
    'Evaluating behavior...',
    'Simulation complete.',
  ];

  const handleRun = () => {
    if (simState !== 'idle') return;
    setSimState('running');
    setMessages([]);
    let step = 0;
    const interval = setInterval(() => {
      setMessages(prev => [...prev, allMessages[step]]);
      step++;
      if (step >= allMessages.length) {
        clearInterval(interval);
        setTimeout(() => setSimState('complete'), 500);
      }
    }, 500);
  };

  const completionStats = [
    { label: 'Scenarios', val: '1,248' },
    { label: 'Task Success', val: '91.8%' },
    { label: 'Failures', val: '73' },
    { label: 'Tool Errors', val: '42' },
    { label: 'Policy Violations', val: '18' },
  ];

  return (
    <section className="min-h-screen flex flex-col md:flex-row bg-ivory text-burgundy">
      {/* Left column */}
      <div className="w-full md:w-1/2 p-8 md:p-16 lg:p-20 flex flex-col justify-center">
        <p className="font-mono text-xs tracking-[0.25em] text-copper uppercase mb-6">
          AI Agent Simulation Lab
        </p>
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-8 text-burgundy">
          Don't deploy your agent.{' '}
          <span className="text-burgundy-light">Test it first.</span>
        </h1>
        <p className="font-sans text-burgundy/60 text-lg mb-10 max-w-md leading-relaxed">
          Create realistic environments, simulate thousands of scenarios, and discover how your AI agent behaves before it reaches the real world.
        </p>
        <div className="flex flex-wrap gap-3 mb-12">
          <a
            href="/app"
            className="cursor-pointer bg-burgundy text-ivory px-7 py-3 font-sans font-semibold hover:bg-burgundy-light transition-colors text-base"
          >
            Build a Sandbox
          </a>
          <button className="cursor-pointer border border-burgundy text-burgundy px-7 py-3 font-sans font-semibold hover:bg-burgundy/5 transition-colors text-base">
            Explore Simulation
          </button>
        </div>

        {/* Simulation control terminal */}
        <div className="bg-[#3A0D1C] text-ivory p-5 font-mono text-sm border border-copper/20 max-w-md">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-copper/20">
            <span className="text-copper text-[10px] tracking-[0.2em] uppercase">Simulation</span>
            <button
              onClick={handleRun}
              disabled={simState !== 'idle'}
              className={`cursor-pointer px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${
                simState === 'idle'
                  ? 'bg-copper text-ivory hover:bg-copper-light'
                  : 'bg-copper/20 text-ivory/30 cursor-not-allowed'
              }`}
            >
              [ RUN ]
            </button>
          </div>
          <div className="min-h-[100px]">
            {simState === 'idle' && (
              <div className="text-ivory/30 text-xs">Ready. Click RUN to start simulation.</div>
            )}
            {simState === 'running' && (
              <div className="space-y-1">
                {messages.map((msg, i) => (
                  <div key={i} className="text-xs text-ivory/70 animate-fade-in">
                    <span className="text-copper mr-2">›</span>{msg}
                  </div>
                ))}
              </div>
            )}
            {simState === 'complete' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-1">
                {completionStats.map((item, i) => (
                  <div
                    key={i}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="font-display font-bold text-xl text-copper">{item.val}</div>
                    <div className="text-ivory/40 text-[10px] uppercase tracking-wider mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right column — 3D visualization */}
      <div className="w-full md:w-1/2 h-[520px] md:h-auto bg-[#3A0D1C] relative overflow-hidden">
        <HeroViz3D />
      </div>
    </section>
  );
};
