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

  const renderContent = () => {
    switch (active) {
      case 'overview':     return <OverviewPanel />;
      case 'environments': return <EnvironmentBuilder />;
      case 'agents':       return <AgentBuilder />;
      case 'simulations':  return <SimulationCenter />;
      case 'evaluations':  return <div className="p-8 pt-6"><EvaluationDashboard /></div>;
      default:             return <OverviewPanel />;
    }
  };

  return (
    <div className="bg-ivory-dark min-h-screen text-burgundy">
      <AppSidebar active={active} setActive={setActive} />
      <AppTopBar />
      {/* Offset for fixed sidebar (w-64) and top bar (h-14) */}
      <div className="ml-64 pt-14 min-h-screen">
        {renderContent()}
      </div>
    </div>
  );
}
