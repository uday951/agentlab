import { motion } from 'framer-motion';

export const RAGVisualization = () => {
  return (
    <section className="bg-ivory-dark text-burgundy py-24 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
        <div className="w-full md:w-1/2">
          <h2 className="font-display text-4xl font-bold mb-12">Intelligent Knowledge Retrieval</h2>
          <div className="space-y-4">
            {['Agent Request', 'Retriever', 'Knowledge Base', 'Relevant Context', 'Agent Decision'].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded bg-copper/20 text-copper flex items-center justify-center font-bold font-mono">{i+1}</div>
                <div className="flex-1 border border-copper/30 bg-ivory p-3 rounded text-sm font-bold font-sans uppercase tracking-wider">{step}</div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <div className="bg-ivory border border-copper/30 p-6 rounded shadow-sm">
            <h3 className="font-mono text-sm mb-6 text-copper border-b border-copper/30 pb-2">RETRIEVED DOCUMENTS</h3>
            <div className="space-y-6">
              {[
                { doc: 'Refund Policy v2.pdf', rel: 94, color: 'bg-burgundy' },
                { doc: 'Customer Agreement.pdf', rel: 88, color: 'bg-copper' },
                { doc: 'Escalation Handbook.pdf', rel: 71, color: 'bg-copper opacity-70' },
                { doc: 'Returns FAQ.pdf', rel: 63, color: 'bg-copper opacity-40' }
              ].map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm font-sans mb-1">
                    <span>{d.doc}</span>
                    <span className="font-mono">{d.rel}% relevance</span>
                  </div>
                  <div className="w-full h-1.5 bg-copper/10 rounded-full overflow-hidden">
                    <div className={`h-full ${d.color}`} style={{ width: `${d.rel}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
