import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Globe, Bot, List, Play, BarChart2, Database, Brain, Settings,
  Activity, AlertTriangle, CheckCircle2, Clock, Menu, X, ChevronRight,
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
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
}

export const AppSidebar = ({ active, setActive, mobileMenuOpen, setMobileMenuOpen }: SidebarProps) => (
  <>
    {/* Mobile Backdrop */}
    {mobileMenuOpen && (
      <div
        onClick={() => setMobileMenuOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
      />
    )}

    {/* Sidebar drawer */}
    <div
      className={`w-64 bg-[#3A0D1C] h-screen fixed left-0 top-0 text-ivory flex flex-col border-r border-copper/15 z-50 transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="p-5 md:p-6 border-b border-copper/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="font-display font-bold text-xl tracking-tight text-ivory hover:text-copper transition-colors"
          >
            AgentLab
          </a>
          <span className="text-[9px] bg-copper/20 text-copper px-2 py-0.5 rounded font-mono tracking-wider">
            v0.9.4
          </span>
        </div>
        {/* Close button on mobile */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden text-ivory/60 hover:text-ivory p-1"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 px-3 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActive(item.id);
                setMobileMenuOpen(false);
              }}
              className={`cursor-pointer w-full flex items-center justify-between px-3 py-2.5 text-sm font-sans rounded transition-colors ${
                isActive
                  ? 'bg-burgundy text-ivory font-medium'
                  : 'text-ivory/60 hover:text-ivory hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} className={isActive ? 'text-copper' : ''} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} className="text-copper" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-copper/15">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-copper flex items-center justify-center font-bold text-burgundy text-xs">
            JD
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-sans text-ivory truncate">Jane Donovan</div>
            <div className="text-[10px] text-ivory/40 font-mono truncate">Admin · Enterprise</div>
          </div>
        </div>
      </div>
    </div>
  </>
);

/* ─── Top Bar ─────────────────────────────────────────────────────── */
interface TopBarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
}

export const AppTopBar = ({ mobileMenuOpen, setMobileMenuOpen }: TopBarProps) => (
  <div className="fixed top-0 right-0 left-0 md:left-64 z-30 bg-ivory border-b border-copper/15 h-14 flex items-center px-4 md:px-6 justify-between transition-all">
    <div className="flex items-center gap-3">
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="cursor-pointer md:hidden p-1.5 -ml-1 text-burgundy hover:text-copper transition-colors"
        aria-label="Toggle navigation menu"
      >
        <Menu size={22} />
      </button>

      {/* Breadcrumb info */}
      <div className="font-mono text-xs text-burgundy/60 flex items-center gap-2 sm:gap-3 truncate">
        <span className="truncate">
          <span className="hidden sm:inline">Project: </span>
          <strong className="text-burgundy">E-commerce Agent</strong>
        </span>
        <span className="hidden sm:inline text-copper/40">|</span>
        <span className="hidden md:inline truncate">
          Env: <strong className="text-burgundy">ShopSphere</strong>
        </span>
        <span className="text-copper/40">|</span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-copper inline-block animate-pulse" />
          <strong className="text-copper text-[11px] sm:text-xs">Ready</strong>
        </span>
      </div>
    </div>

    <button className="cursor-pointer bg-burgundy text-ivory px-3 sm:px-4 py-1.5 text-xs font-sans font-semibold hover:bg-burgundy-light transition-colors rounded sm:rounded-none flex-shrink-0">
      Run Sim
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
  { name: 'Ground', val: 94.2 },
  { name: 'Tool', val: 88.7 },
  { name: 'Policy', val: 97.1 },
];

export const OverviewPanel = () => (
  <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-7xl mx-auto">
    <div className="mb-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">Overview</h1>
      <p className="font-sans text-xs sm:text-sm text-burgundy/50">ShopSphere Production · E-commerce Customer Agent</p>
    </div>

    {/* KPI cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
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
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-copper/20 p-4 sm:p-5"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <Icon size={14} className="text-copper flex-shrink-0" />
              <span className="font-mono text-[9px] sm:text-[10px] text-burgundy/50 uppercase tracking-wider truncate">
                {item.label}
              </span>
            </div>
            <div className="font-display text-xl sm:text-3xl font-bold text-burgundy mb-1">{item.val}</div>
            <div className="font-sans text-[11px] sm:text-xs text-burgundy/40 truncate">{item.sub}</div>
          </motion.div>
        );
      })}
    </div>

    {/* Chart + Recent simulations */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
      <div className="bg-white border border-copper/20 p-4 sm:p-5">
        <h3 className="font-mono text-xs text-burgundy/60 uppercase tracking-widest mb-4">Performance Metrics</h3>
        <div className="h-48 sm:h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFD0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5A1830' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#5A1830' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#5A1830', color: '#F6F0E8', border: 'none', fontSize: 12 }}
                cursor={{ fill: 'rgba(182,106,69,0.1)' }}
              />
              <Bar dataKey="val" fill="#5A1830" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-copper/20 p-4 sm:p-5">
        <h3 className="font-mono text-xs text-burgundy/60 uppercase tracking-widest mb-4">Recent Simulations</h3>
        <div className="space-y-3">
          {recentSims.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs sm:text-sm border-b border-copper/10 pb-2.5 last:border-0"
            >
              <div className="truncate mr-2">
                <span className="font-mono text-copper font-bold text-xs mr-2">{s.id}</span>
                <span className="font-sans text-burgundy/80 truncate">{s.agent}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <span className="font-display font-bold text-copper text-sm">{s.success}</span>
                <span className="text-[11px] text-copper/60 font-mono hidden sm:inline">{s.scenarios} sc.</span>
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
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">Environment Builder</h1>
        <p className="font-sans text-xs sm:text-sm text-burgundy/50">ShopSphere — Configure sandbox topology, data, and constraints</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Responsive Section Switcher (Scrollable on mobile) */}
        <div className="w-full md:w-48 flex-shrink-0">
          <div className="flex md:flex-col overflow-x-auto pb-2 md:pb-0 gap-1 scrollbar-none">
            {envSections.map(sec => (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                className={`cursor-pointer text-left px-3 py-2 text-xs sm:text-sm font-sans transition-colors whitespace-nowrap rounded md:rounded-none ${
                  activeSection === sec
                    ? 'bg-burgundy text-ivory font-medium'
                    : 'text-burgundy/70 hover:text-burgundy hover:bg-ivory-dark bg-white md:bg-transparent border md:border-0 border-copper/15'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 bg-white border border-copper/20 p-4 sm:p-6 min-h-[420px]">
          <h3 className="font-display text-lg sm:text-xl font-bold text-burgundy mb-5">{activeSection}</h3>

          {activeSection === 'Overview' && (
            <div className="space-y-5">
              <div>
                <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-2">Environment Name</label>
                <input
                  defaultValue="ShopSphere"
                  className="w-full border border-copper/25 p-2.5 text-sm font-sans bg-ivory focus:outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-2">Description</label>
                <textarea
                  defaultValue="Full e-commerce environment with customer support, order management, refund processing, and product catalog."
                  className="w-full border border-copper/25 p-2.5 text-sm font-sans bg-ivory h-24 resize-none focus:outline-none focus:border-copper leading-relaxed"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Synthetic Users', val: '1,000' },
                  { label: 'Mocked APIs', val: '6' },
                  { label: 'Guardrail Policies', val: '24' },
                ].map((s, i) => (
                  <div key={i} className="bg-ivory-dark p-3.5 border border-copper/15">
                    <div className="font-display text-xl sm:text-2xl font-bold text-copper">{s.val}</div>
                    <div className="font-mono text-[10px] text-burgundy/50 uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'APIs' && (
            <div className="space-y-2.5">
              {['Orders API', 'Refunds API', 'Customer API', 'Products API', 'Inventory API', 'Notifications API'].map((api, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between border border-copper/20 p-3 gap-1">
                  <div className="truncate">
                    <div className="font-sans font-semibold text-sm text-burgundy">{api}</div>
                    <div className="font-mono text-[11px] text-burgundy/50 truncate">
                      https://api.shopsphere.io/v2/{api.toLowerCase().replace(' api', '')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto mt-1 sm:mt-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-copper" />
                    <span className="font-mono text-[11px] text-copper">Mocked</span>
                  </div>
                </div>
              ))}
              <button className="cursor-pointer mt-3 border border-copper/40 text-copper px-4 py-2 text-xs font-mono hover:bg-copper hover:text-ivory transition-colors">
                + Add API Endpoint
              </button>
            </div>
          )}

          {activeSection !== 'Overview' && activeSection !== 'APIs' && (
            <div className="flex flex-col items-center justify-center h-48 text-burgundy/30 font-mono text-xs sm:text-sm text-center px-4">
              <span className="font-bold mb-1">{activeSection} Configuration Matrix</span>
              <span>Loaded from `ShopSphere.env.yaml` schema</span>
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
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">Agent Builder</h1>
        <p className="font-sans text-xs sm:text-sm text-burgundy/50">Configure Support-AI persona, permissions, and tool access</p>
      </div>

      <div className="space-y-4 sm:space-y-5 bg-white border border-copper/20 p-4 sm:p-6">
        {[
          { label: 'Agent Name', value: 'Support-AI' },
          { label: 'Role', value: 'Customer Support Representative' },
          { label: 'Model', value: 'Custom API / GPT-4o' },
        ].map((f, i) => (
          <div key={i}>
            <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-1.5">{f.label}</label>
            <input
              defaultValue={f.value}
              className="w-full border border-copper/25 p-2.5 text-sm font-sans bg-ivory/50 focus:outline-none focus:border-copper"
            />
          </div>
        ))}

        <div>
          <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-1.5">System Instructions</label>
          <textarea
            defaultValue="You are Support-AI, a customer support agent for ShopSphere. You help customers with orders, refunds, and product inquiries. Always follow Policy #24 for refund decisions. Escalate disputes to Tier-2 when unsure."
            className="w-full border border-copper/25 p-2.5 text-sm font-sans bg-ivory/50 h-28 resize-none focus:outline-none focus:border-copper leading-relaxed"
          />
        </div>

        <div>
          <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-2">Connected Tools</label>
          <div className="flex flex-wrap gap-2">
            {['Orders API', 'Refunds API', 'Customer Data', 'Escalation', 'Product Search'].map((tool, i) => (
              <span
                key={i}
                className="border border-copper/40 text-burgundy bg-ivory-dark/40 px-2.5 py-1 text-xs font-mono flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-copper" />
                {tool}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 pt-2">
          <div>
            <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-1.5">Memory</label>
            <div className="flex items-center gap-2">
              <div className="w-9 h-5 bg-copper rounded-full relative">
                <div className="w-3.5 h-3.5 bg-white rounded-full absolute right-0.5 top-0.5" />
              </div>
              <span className="text-xs sm:text-sm font-sans text-burgundy font-medium">Enabled (Active)</span>
            </div>
          </div>
          <div>
            <label className="block font-mono text-xs text-copper uppercase tracking-wider mb-1.5">Knowledge Vector Base</label>
            <span className="font-sans text-xs sm:text-sm text-burgundy border border-copper/25 px-2.5 py-1 inline-block bg-ivory">
              ShopSphere Policy RAG
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-copper/15">
          <button
            onClick={handleDeploy}
            disabled={deploying || deployed}
            className="cursor-pointer bg-burgundy text-ivory px-6 sm:px-8 py-2.5 sm:py-3 font-sans font-bold text-xs sm:text-sm hover:bg-burgundy-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {deploying ? '⟳ Deploying to Sandbox...' : deployed ? '✓ Deployed to Sandbox' : 'Deploy to Sandbox'}
          </button>
        </div>
      </div>
    </div>
  );
};
