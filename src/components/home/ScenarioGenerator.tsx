import { useState } from 'react';

export const ScenarioGenerator = () => {
  const [running, setRunning] = useState(false);
  
  const scenarios = [
    { id: '#021', text: 'Customer requests refund outside policy window.', diff: 'Medium' },
    { id: '#022', text: 'Refund API returns 504 timeout.', diff: 'Edge Case' },
    { id: '#023', text: 'Customer provides mismatched order ID and email.', diff: 'Adversarial' },
    { id: '#024', text: 'Customer attempts social engineering to bypass policy.', diff: 'Adversarial' },
    { id: '#025', text: 'Duplicate refund request for same order.', diff: 'Medium' },
    { id: '#026', text: 'Agent encounters rate-limited API during peak hour.', diff: 'Stress Test' }
  ];

  return (
    <section className="bg-ivory text-burgundy py-24 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12">
        <div className="w-full md:w-1/3 space-y-6">
          <h2 className="font-display text-3xl font-bold">Scenario Generator</h2>
          <div>
            <label className="block font-mono text-xs mb-1">Environment</label>
            <select className="w-full bg-white border border-copper/30 p-2 rounded text-sm font-sans"><option>ShopSphere</option></select>
          </div>
          <div>
            <label className="block font-mono text-xs mb-1">Difficulty</label>
            <div className="flex border border-copper/30 rounded overflow-hidden">
              <button className="flex-1 bg-white hover:bg-copper/10 py-1 text-sm">Easy</button>
              <button className="flex-1 bg-copper text-ivory py-1 text-sm">Medium</button>
              <button className="flex-1 bg-white hover:bg-copper/10 py-1 text-sm">Hard</button>
              <button className="flex-1 bg-white hover:bg-copper/10 py-1 text-sm border-l border-copper/30">Adv.</button>
            </div>
          </div>
          <div>
            <label className="block font-mono text-xs mb-1">Count</label>
            <input type="number" defaultValue={100} className="w-full bg-white border border-copper/30 p-2 rounded text-sm font-sans" />
          </div>
          <button 
            onClick={() => setRunning(true)}
            className="w-full bg-burgundy text-ivory py-2 rounded hover:bg-opacity-90"
          >
            Generate Scenarios
          </button>
        </div>
        <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {running && scenarios.map((s, i) => (
            <div key={i} className="border border-copper/30 p-4 rounded bg-white shadow-sm flex flex-col justify-between animate-fade-in" style={{ animationDelay: `${i*100}ms` }}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-copper font-bold">{s.id}</span>
                  <span className="text-xs px-2 py-1 bg-ivory-dark rounded text-burgundy/70">{s.diff}</span>
                </div>
                <p className="font-sans text-sm mb-4">{s.text}</p>
              </div>
              <button className="text-xs font-medium border border-copper text-copper py-1 rounded hover:bg-copper hover:text-ivory transition-colors">
                Run Scenario
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
