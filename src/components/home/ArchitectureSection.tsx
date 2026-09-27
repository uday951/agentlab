import { Fragment } from 'react';
import { motion } from 'framer-motion';

export const ArchitectureSection = () => {
  const blocks = [
    { label: '[AGENT]', desc: 'Language model + Tools' },
    { label: '[ENVIRONMENT ENGINE]', desc: 'State management + APIs' },
    { label: '[SIMULATION ENGINE]', desc: 'Event loop + Scenarios' },
    { label: '[EVALUATION ENGINE]', desc: 'Metrics + Rules validation' },
    { label: '[RESULTS + INSIGHTS]', desc: 'Dashboard + Failure logs' }
  ];

  return (
    <section className="bg-[#3A0D1C] text-ivory py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-4xl font-bold mb-16">How AgentLab is built</h2>
        <div className="flex flex-col items-center space-y-4">
          {blocks.map((b, i) => (
            <Fragment key={i}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="w-full md:w-2/3 border border-copper/30 p-4 rounded bg-copper/5 backdrop-blur flex flex-col items-center justify-center relative overflow-hidden group hover:border-copper transition-colors"
              >
                <div className="font-mono text-lg font-bold text-copper mb-1">{b.label}</div>
                <div className="font-sans text-sm text-ivory/70">{b.desc}</div>
              </motion.div>
              {i < blocks.length - 1 && (
                <div className="h-8 w-px bg-copper/30 relative">
                  <div className="absolute top-0 left-[-2px] w-[5px] h-[5px] bg-copper rounded-full animate-[ping_1.5s_infinite]"></div>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
