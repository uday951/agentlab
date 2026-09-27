import { motion } from 'framer-motion';

export const ProblemSection = () => {
  const cards = [
    { title: "Real world is unpredictable", desc: "Agents encounter situations developers didn't anticipate." },
    { title: "Manual testing doesn't scale", desc: "A few prompts cannot represent thousands of real-world interactions." },
    { title: "Failure is expensive", desc: "A small agent mistake can cause large downstream consequences." }
  ];

  return (
    <section className="bg-burgundy text-ivory py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-16 text-center max-w-3xl mx-auto">
          AI agents are powerful. But how do you know they are ready?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="border-t border-copper pt-6 bg-transparent"
            >
              <h3 className="font-display text-xl font-bold mb-4">{card.title}</h3>
              <p className="font-sans text-ivory/80">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
