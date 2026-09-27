import { useState } from 'react';
import {
  AppSidebar,
  AppTopBar,
  OverviewPanel,
  EnvironmentBuilder,
  AgentBuilder,
} from '../components/app/AppComponents';
import { SimulationCenter } from '../components/app/SimulationCenter';
import { EvaluationDashboard } from '../components/home/EvaluationDashboard';

export default function AppPage() {
  const [active, setActive] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (active) {
      case 'overview':     return <OverviewPanel />;
      case 'environments': return <EnvironmentBuilder />;
      case 'agents':       return <AgentBuilder />;
      case 'simulations':  return <SimulationCenter />;
      case 'evaluations':  return <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6"><EvaluationDashboard /></div>;
      default:             return <OverviewPanel />;
    }
  };

  return (
    <div className="bg-ivory-dark min-h-screen text-burgundy overflow-x-hidden">
      <AppSidebar
        active={active}
        setActive={setActive}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <AppTopBar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content: Responsive margin-left (0 on mobile, 64 on md+) */}
      <div className="md:ml-64 pt-14 min-h-screen transition-all">
        {renderContent()}
      </div>
    </div>
  );
}
