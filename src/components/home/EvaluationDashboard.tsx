import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export const EvaluationDashboard = () => {
  const metrics = [
    { label: 'Task Success', value: '91.8%' },
    { label: 'Grounding', value: '94.2%' },
    { label: 'Tool Accuracy', value: '88.7%' },
    { label: 'Policy Compliance', value: '97.1%' },
    { label: 'Avg Latency', value: '2.1s' },
    { label: 'Avg Cost', value: '$0.03' },
    { label: 'Failure Rate', value: '8.2%' }
  ];

  const barData = [
    { name: 'Task', val: 91.8 },
    { name: 'Grounding', val: 94.2 },
    { name: 'Tool', val: 88.7 },
    { name: 'Policy', val: 97.1 }
  ];

  const lineData = [
    { iter: 1, perf: 60 },
    { iter: 2, perf: 75 },
    { iter: 3, perf: 82 },
    { iter: 4, perf: 88 },
    { iter: 5, perf: 92 }
  ];

  return (
    <section className="bg-ivory-dark text-burgundy py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-3xl font-bold mb-2">Agent Performance — Support-AI v2.3</h2>
        <p className="font-sans text-burgundy/70 mb-12">Simulation #1248 · ShopSphere · 1,000 scenarios</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-12">
          {metrics.map((m, i) => (
            <div key={i} className="bg-ivory p-4 rounded border-t-2 border-copper shadow-sm">
              <div className="font-display text-2xl font-bold text-burgundy mb-1">{m.value}</div>
              <div className="font-sans text-xs text-burgundy/70 uppercase tracking-wider">{m.label}</div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-64">
          <div className="bg-ivory p-4 rounded border border-copper/20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFD0" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#5A1830'}} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{fontSize: 12, fill: '#5A1830'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#5A1830', color: '#F6F0E8', border: 'none'}} />
                <Bar dataKey="val" fill="#5A1830" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-ivory p-4 rounded border border-copper/20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFD0" />
                <XAxis dataKey="iter" tick={{fontSize: 12, fill: '#5A1830'}} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{fontSize: 12, fill: '#5A1830'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#5A1830', color: '#F6F0E8', border: 'none'}} />
                <Line type="monotone" dataKey="perf" stroke="#B66A45" strokeWidth={3} dot={{r: 4, fill: '#5A1830', strokeWidth: 0}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
