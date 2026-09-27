import { useState } from 'react';
import { motion } from 'framer-motion';

interface Metric {
  label: string;
  a: string;
  b: string;
  winner: 'A' | 'B' | null;
}

const metrics: Metric[] = [
  { label: 'Task Success', a: '91.8%', b: '87.3%', winner: 'A' },
  { label: 'Tool Accuracy', a: '88.7%', b: '93.2%', winner: 'B' },
  { label: 'Policy Compliance', a: '97.1%', b: '91.4%', winner: 'A' },
  { label: 'Avg Latency', a: '2.1s', b: '1.7s', winner: 'B' },
  { label: 'Avg Cost', a: '$0.03', b: '$0.08', winner: 'A' },
  { label: 'Failure Rate', a: '8.2%', b: '12.7%', winner: 'A' },
];

export const AgentComparison = () => {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setDone(true);
    }, 1800);
  };

  return (
    <section className="bg-burgundy text-ivory py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="font-mono text-xs tracking-[0.2em] text-copper/70 uppercase mb-4">Agent Comparison</p>
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Which agent performs better?
        </h2>
        <p className="font-sans text-ivory/50 mb-12 max-w-xl">
          AgentLab is model and agent agnostic. Run the same environment against any agent or model.
        </p>

        <div className="border border-copper/20">
          {/* Header */}
          <div className="grid grid-cols-3 border-b border-copper/20">
            <div className="p-4 font-mono text-xs text-ivory/30 tracking-widest uppercase">Metric</div>
            <div className="p-4 border-l border-copper/20">
              <div className="font-mono text-xs text-copper/70 uppercase tracking-widest mb-1">Agent A</div>
              <div className="font-sans font-bold">Support-AI v2.3</div>
            </div>
            <div className="p-4 border-l border-copper/20">
              <div className="font-mono text-xs text-copper/70 uppercase tracking-widest mb-1">Agent B</div>
              <div className="font-sans font-bold">GPT-4o Agent</div>
            </div>
          </div>

          {/* Rows */}
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-3 border-b border-copper/10 last:border-b-0"
            >
              <div className="p-4 font-mono text-xs text-ivory/50 uppercase tracking-wider self-center">
                {m.label}
              </div>
              <div className={`p-4 border-l border-copper/10 ${m.winner === 'A' ? 'text-copper font-bold' : 'text-ivory/60'}`}>
                <span className="font-display text-lg">{m.a}</span>
                {m.winner === 'A' && <span className="ml-2 text-xs font-mono">↑</span>}
              </div>
              <div className={`p-4 border-l border-copper/10 ${m.winner === 'B' ? 'text-copper font-bold' : 'text-ivory/60'}`}>
                <span className="font-display text-lg">{m.b}</span>
                {m.winner === 'B' && <span className="ml-2 text-xs font-mono">↑</span>}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4 items-center">
          <button
            onClick={handleRun}
            disabled={running || done}
            className="cursor-pointer bg-ivory text-burgundy px-6 py-3 font-sans font-bold text-sm hover:bg-copper hover:text-ivory transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? '⟳ Running same environment...' : done ? '✓ Comparison complete' : 'Run Same Environment'}
          </button>
          {done && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-mono text-xs text-copper/70"
            >
              Support-AI v2.3 wins on 4 of 6 metrics
            </motion.div>
          )}
        </div>

        <p className="mt-6 font-mono text-xs text-ivory/25 tracking-wider">
          AgentLab is model and agent agnostic — connect any LLM, workflow, or custom agent.
        </p>
      </div>
    </section>
  );
};
