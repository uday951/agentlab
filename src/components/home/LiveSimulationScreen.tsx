import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const events = [
  { text: 'Customer #4821 initiated refund request', type: 'neutral' as const },
  { text: 'Agent retrieved Policy #24 — Standard Return', type: 'neutral' as const },
  { text: 'Refund API called — order #ORD-8847', type: 'neutral' as const },
  { text: 'Decision: Approved — confidence 94.2%', type: 'success' as const },
  { text: 'Scenario #021 completed — SUCCESS', type: 'success' as const },
  { text: 'Customer #5103 provided invalid order ID', type: 'neutral' as const },
  { text: 'Agent requested clarification from customer', type: 'neutral' as const },
  { text: 'Policy #12 flagged — escalation triggered', type: 'neutral' as const },
  { text: 'Scenario #022 completed — FAILURE', type: 'failure' as const },
  { text: 'Tool timeout — RetryHandler invoked (attempt 2/3)', type: 'neutral' as const },
  { text: 'Customer #6201 attempted policy manipulation', type: 'failure' as const },
  { text: 'Agent escalated to Tier-2 — policy constraint enforced', type: 'neutral' as const },
  { text: 'Scenario #024 completed — SUCCESS', type: 'success' as const },
];

type Event = { text: string; time: string; type: 'success' | 'failure' | 'neutral' };

const NodeViz = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 280" preserveAspectRatio="xMidYMid meet">
      {/* Connection lines */}
      <line x1="80" y1="80" x2="160" y2="140" stroke="#B66A45" strokeWidth="1" strokeDasharray="5,4" opacity="0.4">
        <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="2s" repeatCount="indefinite" />
      </line>
      <line x1="240" y1="80" x2="160" y2="140" stroke="#B66A45" strokeWidth="1" strokeDasharray="5,4" opacity="0.4">
        <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="2.4s" repeatCount="indefinite" />
      </line>
      <line x1="80" y1="200" x2="160" y2="140" stroke="#B66A45" strokeWidth="1" strokeDasharray="5,4" opacity="0.4">
        <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.8s" repeatCount="indefinite" />
      </line>
      <line x1="240" y1="200" x2="160" y2="140" stroke="#B66A45" strokeWidth="1" strokeDasharray="5,4" opacity="0.4">
        <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="2.2s" repeatCount="indefinite" />
      </line>
    </svg>

    {/* Central Agent node */}
    <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
      <div className="w-16 h-16 bg-burgundy border border-copper flex items-center justify-center font-mono text-[10px] text-ivory font-bold rotate-45 shadow-lg">
        <span className="-rotate-45">Agent</span>
      </div>
    </div>

    {/* Outer nodes */}
    <div className="absolute" style={{ top: '22%', left: '18%' }}>
      <div className="w-12 h-12 rounded-full bg-[#3A0D1C] border border-copper/50 flex items-center justify-center font-mono text-[9px] text-copper animate-pulse">
        User
      </div>
    </div>
    <div className="absolute" style={{ top: '22%', right: '18%' }}>
      <div className="w-12 h-12 bg-[#3A0D1C] border border-copper/50 flex items-center justify-center font-mono text-[9px] text-copper">
        API
      </div>
    </div>
    <div className="absolute" style={{ bottom: '22%', left: '18%' }}>
      <div className="w-12 h-12 bg-[#3A0D1C] border border-copper/50 flex items-center justify-center font-mono text-[9px] text-copper transform rotate-45">
        <span className="-rotate-45">Tool</span>
      </div>
    </div>
    <div className="absolute" style={{ bottom: '22%', right: '18%' }}>
      <div className="w-12 h-12 rounded bg-[#3A0D1C] border border-copper/50 flex items-center justify-center font-mono text-[9px] text-copper">
        Rules
      </div>
    </div>
  </div>
);

export const LiveSimulationScreen = () => {
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      const ev = events[i % events.length];
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setLiveEvents(prev => [...prev.slice(-12), { ...ev, time }]);
      i++;
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-[#3A0D1C] text-ivory py-24 px-6 font-mono text-sm">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-copper/20">
          <span className="font-bold text-copper tracking-widest text-sm">AgentLab</span>
          <span className="flex items-center gap-2 text-xs tracking-widest">
            <span className="w-2 h-2 bg-copper rounded-full animate-pulse" />
            SIMULATION LIVE
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Environment visualization */}
          <div className="w-full md:w-1/2 border border-copper/20 relative min-h-[320px]">
            <div className="absolute top-3 left-4 text-[9px] text-ivory/30 tracking-widest uppercase">Environment</div>
            <NodeViz />
          </div>

          {/* Event stream */}
          <div className="w-full md:w-1/2 border border-copper/20 p-4 h-[320px] overflow-hidden flex flex-col">
            <div className="text-[9px] text-ivory/30 tracking-widest uppercase mb-3 pb-2 border-b border-copper/10">
              Event Stream
            </div>
            <div className="flex-1 overflow-hidden flex flex-col justify-end space-y-1.5">
              <AnimatePresence>
                {liveEvents.map((ev, idx) => (
                  <motion.div
                    key={`${ev.time}-${idx}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-xs leading-relaxed ${
                      ev.type === 'success'
                        ? 'text-copper'
                        : ev.type === 'failure'
                        ? 'text-ivory/40 line-through decoration-copper/50'
                        : 'text-ivory/60'
                    }`}
                  >
                    <span className="opacity-30 mr-2 select-none">[{ev.time}]</span>
                    {ev.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-6 border border-copper/20 p-4 flex flex-wrap gap-8">
          {[
            { label: 'Scenarios Run', val: '1,248' },
            { label: 'Success Rate', val: '91.8%' },
            { label: 'Failures', val: '73' },
            { label: 'Avg Latency', val: '2.1s' },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-display text-lg font-bold text-copper">{s.val}</div>
              <div className="text-[10px] text-ivory/30 tracking-widest uppercase mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
