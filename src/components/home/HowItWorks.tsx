import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Create Environment',
    items: ['Users & personas', 'Business rules', 'Data & databases', 'APIs & webhooks', 'Tool definitions', 'Constraints'],
  },
  {
    number: '02',
    title: 'Connect Agent',
    items: ['Custom LLM agent', 'API-based agent', 'Workflow agent', 'Coding agent'],
  },
  {
    number: '03',
    title: 'Generate Scenarios',
    items: ['Normal situations', 'Edge cases', 'Adversarial inputs', 'Unexpected events', 'Stress conditions'],
  },
  {
    number: '04',
    title: 'Run Simulation',
    items: ['Autonomous execution', 'Parallel scenarios', 'Real API mocking', 'Environment state tracking'],
  },
  {
    number: '05',
    title: 'Evaluate',
    items: ['Task success rate', 'Tool accuracy', 'Latency & cost', 'Policy compliance', 'Failure classification'],
  },
  {
    number: '06',
    title: 'Improve & Retest',
    items: ['Identify failure patterns', 'Fix agent instructions', 'Update tool logic', 'Re-run same scenarios'],
  },
];

export const HowItWorks = () => {
  return (
    <section className="bg-ivory-dark text-burgundy py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="font-mono text-xs tracking-[0.2em] text-copper uppercase mb-4">The Process</p>
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-20 leading-tight">
          How AgentLab works
        </h2>
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-copper/20" />
          <div className="space-y-16">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="relative pl-24"
              >
                {/* Timeline dot */}
                <div className="absolute left-[25px] top-1 w-7 h-7 rounded-full bg-ivory-dark border-2 border-copper flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-copper" />
                </div>

                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="flex-1">
                    <div className="font-mono text-copper font-bold text-3xl leading-none mb-3 opacity-80">
                      {step.number}
                    </div>
                    <h3 className="font-display text-2xl font-bold mb-4">{step.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      {step.items.map((item, j) => (
                        <span
                          key={j}
                          className="font-mono text-xs border border-copper/25 text-burgundy/70 px-3 py-1"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
