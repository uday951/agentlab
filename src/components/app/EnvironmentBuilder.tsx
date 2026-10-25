import { useState, useEffect } from 'react';
import { Wrench, FileText, Users, ShieldAlert, Check, Save } from 'lucide-react';
import { api, type World } from '../../lib/api';

const SECTIONS = [
  { id: 'rules', label: 'System Rules', icon: ShieldAlert },
  { id: 'tools', label: 'Simulated Tools', icon: Wrench },
  { id: 'knowledge', label: 'Policies & Knowledge', icon: FileText },
  { id: 'customers', label: 'Customer Personas', icon: Users },
];

export const EnvironmentBuilder = () => {
  const [world, setWorld] = useState<World | null>(null);
  const [activeSection, setActiveSection] = useState('rules');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.getWorlds().then((worlds) => {
      if (worlds.length > 0) setWorld(worlds[0]);
    });
  }, []);

  const handleSave = async () => {
    if (!world) return;
    setSaving(true);
    try {
      await api.updateWorld(world.id, world);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      alert('Failed to save world configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!world) {
    return (
      <div className="p-8 text-center font-mono text-xs text-burgundy/50">
        Loading world environment...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy">
              {world.name}
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper/20 text-copper font-bold uppercase">
              {world.industry}
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-burgundy/60 max-w-2xl">
            {world.description}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer flex items-center gap-2 bg-burgundy text-ivory px-4 py-2 text-xs font-sans font-bold hover:bg-burgundy-light rounded transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          {savedSuccess ? <Check size={14} className="text-emerald-400" /> : <Save size={14} />}
          <span>{saving ? 'Saving...' : savedSuccess ? 'Configuration Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-copper/20 gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-copper text-copper font-bold bg-copper/5'
                  : 'border-transparent text-burgundy/60 hover:text-burgundy'
              }`}
            >
              <Icon size={14} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm">
        {/* System Rules */}
        {activeSection === 'rules' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-sans font-bold text-sm text-burgundy">Active Environment Rules</h3>
              <span className="font-mono text-[10px] text-zinc-500">
                Enforced on agent tool interactions
              </span>
            </div>

            <div className="space-y-2">
              {world.systemRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-ivory/60 border border-copper/15 rounded text-xs font-sans"
                >
                  <span className="font-mono text-copper font-bold text-xs mt-0.5">
                    0{idx + 1}.
                  </span>
                  <span className="text-burgundy/80 leading-relaxed">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulated Tools */}
        {activeSection === 'tools' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-sans font-bold text-sm text-burgundy">
                Simulated Operational Tools ({world.simulatedTools.length})
              </h3>
              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Sandboxed Mock Execution
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {world.simulatedTools.map((tool, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-copper/20 rounded bg-ivory/30 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-xs text-copper">{tool.name}()</span>
                      <span className="text-[10px] font-mono bg-copper/15 text-copper px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                    <p className="font-sans text-xs text-burgundy/70 mb-3">
                      {tool.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-copper/10 text-[10px] font-mono text-burgundy/50">
                    Parameters: {Object.keys(tool.parameters?.properties || {}).join(', ') || 'none'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge & Policies */}
        {activeSection === 'knowledge' && (
          <div className="space-y-4">
            <h3 className="font-sans font-bold text-sm text-burgundy mb-2">
              Corporate Knowledge Documents (RAG Ingestion)
            </h3>

            <div className="space-y-3">
              {world.knowledgeDocuments.map((doc) => (
                <div key={doc.id} className="p-4 border border-copper/20 rounded bg-ivory/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-sans font-bold text-xs text-burgundy">{doc.title}</span>
                    <span className="font-mono text-[10px] text-copper px-2 py-0.5 bg-copper/15 rounded">
                      {doc.category}
                    </span>
                  </div>
                  <pre className="font-mono text-[11px] text-burgundy/70 whitespace-pre-wrap bg-white/80 p-3 rounded border border-copper/10 leading-relaxed max-h-36 overflow-y-auto">
                    {doc.content}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Personas */}
        {activeSection === 'customers' && (
          <div className="space-y-4">
            <h3 className="font-sans font-bold text-sm text-burgundy mb-2">
              Synthetic Customer Personas ({world.customerProfiles.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {world.customerProfiles.map((cust) => (
                <div key={cust.id} className="p-3.5 border border-copper/20 rounded bg-ivory/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-sans font-bold text-xs text-burgundy">{cust.name}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${
                        cust.tier === 'vip'
                          ? 'bg-amber-100 text-amber-800 font-bold'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {cust.tier}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-burgundy/50 truncate mb-2">
                    {cust.email}
                  </div>
                  <div className="text-[11px] font-sans text-burgundy/70 bg-white p-2 rounded border border-copper/10">
                    Trait: {cust.behaviorTrait}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
