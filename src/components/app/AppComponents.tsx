import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Globe, Bot, List, Play, BarChart2, Database, Brain, Settings,
  Activity, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/* ─── Sidebar ────────────────────────────────────────────────────── */
const navItems = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'environments', icon: Globe, label: 'Environments' },
  { id: 'agents', icon: Bot, label: 'Agents' },
  { id: 'scenarios', icon: List, label: 'Scenarios' },
  { id: 'simulations', icon: Play, label: 'Simulations' },
  { id: 'evaluations', icon: BarChart2, label: 'Evaluations' },
  { id: 'knowledge', icon: Database, label: 'Knowledge' },
  { id: 'memory', icon: Brain, label: 'Memory' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  active: string;
  setActive: (v: string) => void;
}

export const AppSidebar = ({ active, setActive }: SidebarProps) => (
  <div className="w-64 bg-[#3A0D1C] h-screen fixed left-0 top-0 text-ivory flex flex-col border-r border-copper/15 z-50">
    <div className="p-6 border-b border-copper/15">
      <a href="/" className="font-display font-bold text-xl tracking-tight text-ivory hover:text-copper transition-colors">
        AgentLab
      </a>
      <div className="inline-block ml-2 text-[9px] bg-copper/20 text-copper px-2 py-0.5 rounded font-mono tracking-wider">
        v0.9.4
      </div>
    </div>

    <nav className="flex-1 py-4 space-y-0.5 px-3 overflow-y-auto">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 text-sm font-sans transition-colors ${
              isActive
                ? 'bg-burgundy text-ivory'
                : 'text-ivory/50 hover:text-ivory hover:bg-white/5'
            }`}
          >
            <Icon size={16} className={isActive ? 'text-copper' : ''} />
            {item.label}
          </button>
        );
      })}
    </nav>

    <div className="p-4 border-t border-copper/15">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-copper flex items-center justify-center font-bold text-burgundy text-xs">
          JD
        </div>
        <div>
          <div className="text-xs font-sans text-ivory">Jane Donovan</div>
          <div className="text-[10px] text-ivory/30 font-mono">Admin</div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Top Bar ─────────────────────────────────────────────────────── */
export const AppTopBar = () => (
  <div className="ml-64 fixed top-0 right-0 left-0 z-40 bg-ivory border-b border-copper/15 h-14 flex items-center px-6 justify-between">
    <div className="font-mono text-xs text-burgundy/50 flex items-center gap-4">
      <span>Project: <strong className="text-burgundy">E-commerce Agent</strong></span>
      <span className="text-copper/40">|</span>
      <span>Environment: <strong className="text-burgundy">ShopSphere</strong></span>
      <span className="text-copper/40">|</span>
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-copper inline-block animate-pulse" />
        <strong className="text-copper">Ready</strong>
      </span>
    </div>
    <button className="cursor-pointer bg-burgundy text-ivory px-4 py-1.5 text-xs font-sans font-semibold hover:bg-burgundy-light transition-colors">
      Run Simulation
    </button>
  </div>
);

/* ─── Overview Panel ──────────────────────────────────────────────── */
const recentSims = [
  { id: '#1248', env: 'ShopSphere', agent: 'Support-AI v2.3', scenarios: 1000, success: '91.8%', status: 'Complete' },
  { id: '#1247', env: 'ShopSphere', agent: 'GPT-4o Agent', scenarios: 1000, success: '87.3%', status: 'Complete' },
  { id: '#1231', env: 'ShopSphere', agent: 'Support-AI v2.2', scenarios: 500, success: '84.1%', status: 'Complete' },
  { id: '#1198', env: 'ShopSphere', agent: 'Support-AI v2.1', scenarios: 200, success: '79.6%', status: 'Complete' },
];

const barData = [
  { name: 'Task', val: 91.8 },
  { name: 'Grounding', val: 94.2 },
  { name: 'Tool', val: 88.7 },
  { name: 'Policy', val: 97.1 },
];

export const OverviewPanel = () => (
  <div className="p-8 pt-6 pb-20">
    <h1 className="font-display text-2xl font-bold text-burgundy mb-1">Overview</h1>
    <p className="font-sans text-sm text-burgundy/50 mb-8">ShopSphere — E-commerce Agent</p>

    {/* KPI cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      {[
        { icon: Activity, label: 'Simulations', val: '1,248', sub: 'Total run' },
        { icon: CheckCircle2, label: 'Task Success', val: '91.8%', sub: 'Last simulation' },
        { icon: AlertTriangle, label: 'Failures', val: '73', sub: 'In #1248' },
        { icon: Clock, label: 'Avg Latency', val: '2.1s', sub: 'Per scenario' },
      ].map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white border border-copper/20 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon size={14} className="text-copper" />
              <span className="font-mono text-[10px] text-burgundy/40 uppercase tracking-wider">{item.label}</span>
            </div>
            <div className="font-display text-3xl font-bold text-burgundy mb-1">{item.val}</div>
            <div className="font-sans text-xs text-burgundy/40">{item.sub}</div>
          </motion.div>
        );
      })}
    </div>

    {/* Chart + Recent simulations */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
      <div className="bg-white border border-copper/20 p-5">
        <h3 className="font-mono text-xs text-burgundy/50 uppercase tracking-widest mb-4">Performance Metrics</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFD0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5A1830' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#5A1830' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#5A1830', color: '#F6F0E8', border: 'none', fontSize: 12 }}
                cursor={{ fill: 'rgba(182,106,69,0.1)' }}
              />
              <Bar dataKey="val" fill="#5A1830" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-copper/20 p-5">
        <h3 className="font-mono text-xs text-burgundy/50 uppercase tracking-widest mb-4">Recent Simulations</h3>
        <div className="space-y-3">
          {recentSims.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-copper/10 pb-2 last:border-0">
              <div>
                <span className="font-mono text-copper text-xs mr-2">{s.id}</span>
                <span className="font-sans text-burgundy/70">{s.agent}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-copper">{s.success}</span>
                <span className="text-xs text-copper/60 font-mono">{s.scenarios} sc.</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ─── Environment Builder ─────────────────────────────────────────── */
const envSections = ['Overview', 'Users', 'Rules', 'Data', 'APIs', 'Tools', 'Knowledge', 'Events'];

export const EnvironmentBuilder = () => {
  const [activeSection, setActiveSection] = useState('Overview');

  return (
    <div className="p-8 pt-6 pb-20">
      <h1 className="font-display text-2xl font-bold text-burgundy mb-1">Environment Builder</h1>
      <p className="font-sans text-sm text-burgundy/50 mb-8">ShopSphere — Configure your simulation environment</p>

      <div className="flex gap-8">
        {/* Section sidebar */}
        <div className="w-48 flex-shrink-0">
          <div className="space-y-0.5">
            {envSections.map(sec => (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                className={`cursor-pointer w-full text-left px-3 py-2 text-sm font-sans transition-colors ${
                  activeSection === sec
                    ? 'bg-burgundy text-ivory'
                    : 'text-burgundy/60 hover:text-burgundy hover:bg-ivory-dark'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 bg-white border border-copper/20 p-6 min-h-[500px]">
          <h3 className="font-display text-xl font-bold text-burgundy mb-6">{activeSection}</h3>

          {activeSection === 'Overview' && (
            <div className="space-y-6">
              <div>
                <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-2">Environment Name</label>
                <input defaultValue="ShopSphere" className="w-full border border-copper/25 p-3 text-sm font-sans bg-ivory focus:outline-none focus:border-copper" />
              </div>
              <div>
                <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-2">Description</label>
                <textarea defaultValue="Full e-commerce environment with customer support, order management, refund processing, and product catalog." className="w-full border border-copper/25 p-3 text-sm font-sans bg-ivory h-24 resize-none focus:outline-none focus:border-copper" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Users', val: '1,000' },
                  { label: 'APIs', val: '6' },
                  { label: 'Policies', val: '24' },
                ].map((s, i) => (
                  <div key={i} className="bg-ivory-dark p-4 border border-copper/10">
                    <div className="font-display text-2xl font-bold text-copper">{s.val}</div>
                    <div className="font-mono text-xs text-burgundy/50 uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'APIs' && (
            <div className="space-y-3">
              {['Orders API', 'Refunds API', 'Customer API', 'Products API', 'Inventory API', 'Notifications API'].map((api, i) => (
                <div key={i} className="flex items-center justify-between border border-copper/20 p-3">
                  <div>
                    <div className="font-sans font-semibold text-sm">{api}</div>
                    <div className="font-mono text-xs text-burgundy/40">https://api.shopsphere.io/v2/{api.toLowerCase().replace(' api', '')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-copper" />
                    <span className="font-mono text-xs text-copper">Mocked</span>
                  </div>
                </div>
              ))}
              <button className="cursor-pointer mt-2 border border-copper/30 text-copper px-4 py-2 text-sm font-mono hover:bg-copper hover:text-ivory transition-colors">
                + Add API
              </button>
            </div>
          )}

          {activeSection !== 'Overview' && activeSection !== 'APIs' && (
            <div className="flex items-center justify-center h-64 text-burgundy/25 font-mono text-sm">
              {activeSection} configuration
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Agent Builder ───────────────────────────────────────────────── */
export const AgentBuilder = () => {
  const [deployed, setDeployed] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = () => {
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      setDeployed(true);
    }, 1500);
  };

  return (
    <div className="p-8 pt-6 pb-20">
      <h1 className="font-display text-2xl font-bold text-burgundy mb-1">Agent Builder</h1>
      <p className="font-sans text-sm text-burgundy/50 mb-8">Configure Support-AI for ShopSphere</p>

      <div className="max-w-2xl space-y-5">
        {[
          { label: 'Agent Name', value: 'Support-AI', type: 'input' },
          { label: 'Role', value: 'Customer Support Representative', type: 'input' },
          { label: 'Model', value: 'Custom API / GPT-4o', type: 'select' },
        ].map((f, i) => (
          <div key={i}>
            <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-2">{f.label}</label>
            <input defaultValue={f.value} className="w-full border border-copper/25 p-3 text-sm font-sans bg-white focus:outline-none focus:border-copper" />
          </div>
        ))}

        <div>
          <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-2">System Instructions</label>
          <textarea defaultValue="You are Support-AI, a customer support agent for ShopSphere. You help customers with orders, refunds, and product inquiries. Always follow Policy #24 for refund decisions. Escalate disputes to Tier-2 when unsure." className="w-full border border-copper/25 p-3 text-sm font-sans bg-white h-32 resize-none focus:outline-none focus:border-copper leading-relaxed" />
        </div>

        <div>
          <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-3">Tools</label>
          <div className="flex flex-wrap gap-2">
            {['Orders API', 'Refunds API', 'Customer Data', 'Escalation', 'Product Search'].map((tool, i) => (
              <span key={i} className="border border-copper/40 text-burgundy px-3 py-1.5 text-xs font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-copper" />{tool}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-2">Memory</label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-5 bg-copper rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
              </div>
              <span className="text-sm font-sans text-burgundy">Enabled</span>
            </div>
          </div>
          <div>
            <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-2">Knowledge</label>
            <span className="font-sans text-sm text-burgundy border border-copper/25 px-3 py-1.5">ShopSphere Policy RAG</span>
          </div>
        </div>

        <button
          onClick={handleDeploy}
          disabled={deploying || deployed}
          className="cursor-pointer bg-burgundy text-ivory px-8 py-3 font-sans font-bold text-sm hover:bg-burgundy-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {deploying ? '⟳ Deploying to Sandbox...' : deployed ? '✓ Deployed to Sandbox' : 'Deploy to Sandbox'}
        </button>
      </div>
    </div>
  );
};
