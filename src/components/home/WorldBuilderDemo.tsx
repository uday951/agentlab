import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const statItems = [
  { label: 'Users', val: '1,000', target: 1000 },
  { label: 'Products', val: '500', target: 500 },
  { label: 'APIs', val: '6', target: 6 },
  { label: 'Policies', val: '24', target: 24 },
  { label: 'Scenarios', val: '120', target: 120 },
];

const nodes = ['Customer', 'Order', 'Refund', 'Support', 'Policy'];

export const WorldBuilderDemo = () => {
  const [state, setState] = useState<'idle' | 'generating' | 'generated'>('idle');
  const [dots, setDots] = useState('');

  const handleGenerate = () => {
    if (state !== 'idle') return;
    setState('generating');
    let count = 0;
    const dotInterval = setInterval(() => {
      setDots('.'.repeat((count % 3) + 1));
      count++;
    }, 400);
    setTimeout(() => {
      clearInterval(dotInterval);
      setState('generated');
    }, 2200);
  };

  return (
    <section className="bg-burgundy text-ivory py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="font-mono text-xs tracking-[0.2em] text-copper/80 uppercase mb-4">World Builder</p>
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Build the world before you test the agent.
        </h2>
        <p className="font-sans text-ivory/50 mb-10 max-w-xl">
          Describe your environment in plain language. AgentLab generates the complete simulation scaffold.
        </p>

        <div className="bg-[#3A0D1C] p-6 border border-copper/20">
          <div className="mb-4">
            <div className="font-mono text-[10px] text-copper/70 tracking-widest uppercase mb-2">Environment Prompt</div>
            <textarea
              className="w-full bg-transparent border border-copper/25 p-4 font-sans text-ivory/80 text-sm h-28 focus:outline-none focus:border-copper resize-none leading-relaxed"
              defaultValue="Create an e-commerce environment with customers, products, orders, refunds and support policies."
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={state !== 'idle'}
            className="cursor-pointer bg-copper text-ivory px-6 py-2.5 font-sans font-semibold text-sm hover:bg-copper-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === 'idle' && 'Generate Environment'}
            {state === 'generating' && `Generating${dots}`}
            {state === 'generated' && '✓ Environment Created'}
          </button>

          <AnimatePresence>
            {state === 'generated' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-8 border-t border-copper/20 pt-8"
              >
                {/* Stats */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-10">
                  {statItems.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="text-center"
                    >
                      <div className="font-display text-2xl font-bold text-copper mb-1">{s.val}</div>
                      <div className="font-mono text-[10px] text-ivory/40 tracking-widest uppercase">{s.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Node graph */}
                <div className="relative">
                  <div className="font-mono text-[10px] text-copper/50 tracking-widest uppercase mb-4">Environment Graph</div>
                  <div className="relative h-20 flex items-center">
                    {/* SVG connector line */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      preserveAspectRatio="none"
                      viewBox="0 0 100 100"
                    >
                      <line
                        x1="10" y1="50" x2="90" y2="50"
                        stroke="#B66A45"
                        strokeWidth="1"
                        strokeDasharray="4,3"
                        opacity="0.4"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    {/* Nodes */}
                    <div className="relative z-10 flex justify-between w-full">
                      {nodes.map((node, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className="w-14 h-14 rounded-full bg-[#3A0D1C] border border-copper/50 flex items-center justify-center font-mono text-[9px] text-copper text-center leading-tight"
                        >
                          {node}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
