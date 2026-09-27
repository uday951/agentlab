import { Fragment } from 'react';
import { motion } from 'framer-motion';

export const ConceptSection = () => {
  const stages = [
    { label: "ENVIRONMENT", desc: "Define rules and data" },
    { label: "AGENT", desc: "Connect your AI model" },
    { label: "TOOLS", desc: "Provide APIs and functions" },
    { label: "SCENARIOS", desc: "Generate test cases" },
    { label: "SIMULATION", desc: "Run autonomous interactions" },
    { label: "EVALUATION", desc: "Measure performance" }
  ];

  return (
    <section className="bg-ivory text-burgundy py-24 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-16">
          Build the world before you test the agent.
        </h2>
        <div className="flex flex-col md:flex-row justify-center items-center space-y-8 md:space-y-0 md:space-x-4">
          {stages.map((stage, idx) => (
            <Fragment key={idx}>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="font-mono text-sm tracking-widest uppercase text-copper mb-2">{stage.label}</div>
                <div className="w-16 h-[1px] bg-copper mb-2"></div>
                <div className="font-sans text-xs text-burgundy/70 text-center max-w-[100px]">{stage.desc}</div>
              </motion.div>
              {idx < stages.length - 1 && (
                <div className="hidden md:block text-copper">→</div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
