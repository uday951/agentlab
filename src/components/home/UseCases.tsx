export const UseCases = () => {
  const cases = [
    { cat: 'Customer Support', title: 'Support Agents', desc: 'Test against 10,000 realistic support scenarios' },
    { cat: 'Coding Agents', title: 'Dev Agents', desc: 'Run agents inside isolated repository environments' },
    { cat: 'Research Agents', title: 'Data Agents', desc: 'Evaluate retrieval accuracy and reasoning chains' },
    { cat: 'Finance Agents', title: 'Trading Agents', desc: 'Stress-test under volatile market simulations' },
    { cat: 'Enterprise Agents', title: 'Workflow Agents', desc: 'Validate complex multi-step workflows' },
    { cat: 'Multi-Agent Systems', title: 'Swarm Agents', desc: 'Test coordination and emergent behaviors' }
  ];

  return (
    <section className="bg-ivory-dark text-burgundy py-24 px-6" id="use-cases">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-4xl font-bold mb-12">Built for every kind of agent</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <div key={i} className="border border-copper/20 bg-ivory p-6 rounded hover:border-burgundy hover:scale-[1.02] transition-all cursor-pointer">
              <div className="font-mono text-xs uppercase text-copper tracking-wider mb-4">{c.cat}</div>
              <h3 className="font-display text-xl font-bold mb-2">{c.title}</h3>
              <p className="font-sans text-burgundy/70 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
