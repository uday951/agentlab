import { useState } from 'react';
import { Check } from 'lucide-react';

export const AgentConnectionDemo = () => {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setConnected(true);
    }, 500);
  };

  return (
    <section className="bg-ivory text-burgundy py-24 px-6">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-center">
        <div className="w-full md:w-1/2">
          <h2 className="font-display text-4xl font-bold mb-8">Connect Your Agent</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs mb-1">Agent Name</label>
              <input type="text" readOnly value="Support-AI" className="w-full bg-white border border-copper/30 p-2 rounded text-sm font-sans" />
            </div>
            <div>
              <label className="block font-mono text-xs mb-1">Model</label>
              <select disabled className="w-full bg-white border border-copper/30 p-2 rounded text-sm font-sans">
                <option>GPT-4o / Custom API</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs mb-1">Tools</label>
              <div className="flex flex-wrap gap-2 text-sm font-sans">
                <span className="bg-white border border-copper/30 px-2 py-1 rounded flex items-center gap-1"><Check size={14} className="text-copper"/> Orders</span>
                <span className="bg-white border border-copper/30 px-2 py-1 rounded flex items-center gap-1"><Check size={14} className="text-copper"/> Refunds</span>
                <span className="bg-white border border-copper/30 px-2 py-1 rounded flex items-center gap-1"><Check size={14} className="text-copper"/> Customer Data</span>
                <span className="bg-white border border-copper/30 px-2 py-1 rounded flex items-center gap-1"><Check size={14} className="text-copper"/> Escalation</span>
              </div>
            </div>
            <div>
              <label className="block font-mono text-xs mb-1">Memory</label>
              <div className="flex items-center gap-2">
                <div className="w-10 h-5 bg-copper rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div></div>
                <span className="text-sm font-sans">Enabled</span>
              </div>
            </div>
            <div>
              <label className="block font-mono text-xs mb-1">Knowledge</label>
              <input type="text" readOnly value="ShopSphere Policy RAG" className="w-full bg-white border border-copper/30 p-2 rounded text-sm font-sans" />
            </div>
            <button 
              onClick={handleConnect}
              disabled={connected || loading}
              className="mt-4 bg-burgundy text-ivory px-6 py-2 rounded font-sans font-medium hover:bg-opacity-90 w-full flex justify-center items-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-ivory border-t-transparent rounded-full animate-spin"></div> : connected ? <><Check size={16} className="text-copper"/> Agent Connected</> : 'Connect Agent'}
            </button>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex justify-center items-center">
          <div className={`w-32 h-32 rounded-lg border-2 flex items-center justify-center transition-all duration-1000 ${connected ? 'border-copper bg-copper/10' : 'border-copper/30 border-dashed'}`}>
            <span className="font-mono text-sm">{connected ? 'Agent Active' : 'Waiting...'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
