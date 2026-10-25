import {
  LayoutDashboard,
  Globe,
  Bot,
  List,
  Play,
  BarChart2,
  Database,
  Settings,
  Cpu,
  X,
  ChevronRight,
} from 'lucide-react';

export const navItems = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'agents', icon: Bot, label: 'Agents' },
  { id: 'worlds', icon: Globe, label: 'Worlds' },
  { id: 'experiments', icon: List, label: 'Experiments' },
  { id: 'simulations', icon: Play, label: 'Live Simulations' },
  { id: 'results', icon: BarChart2, label: 'Results & Reports' },
  { id: 'knowledge', icon: Database, label: 'Knowledge (RAG)' },
  { id: 'infrastructure', icon: Cpu, label: 'Infrastructure Setup' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  active: string;
  setActive: (v: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  isSimulating?: boolean;
}

export const AppSidebar = ({
  active,
  setActive,
  mobileMenuOpen,
  setMobileMenuOpen,
  isSimulating,
}: SidebarProps) => (
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
            v1.0.0
          </span>
        </div>
        {/* Close button on mobile */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden text-ivory/60 hover:text-ivory p-1 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const isSimItem = item.id === 'simulations' && isSimulating;

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
              <div className="flex items-center gap-1.5">
                {isSimItem && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-copper opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-copper"></span>
                  </span>
                )}
                {isActive && <ChevronRight size={14} className="text-copper" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* User profile section */}
      <div className="p-4 border-t border-copper/15">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-copper flex items-center justify-center font-bold text-burgundy text-xs">
            AL
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-sans text-ivory truncate">College Review Workspace</div>
            <div className="text-[10px] text-ivory/40 font-mono truncate">Evaluation Admin</div>
          </div>
        </div>
      </div>
    </div>
  </>
);
