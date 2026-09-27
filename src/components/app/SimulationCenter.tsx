import { LiveSimulationScreen } from '../home/LiveSimulationScreen';

export const SimulationCenter = () => {
  return (
    <div>
      <div className="p-8 pb-0">
        <h1 className="font-display text-3xl font-bold text-burgundy mb-8">Simulation Center</h1>
      </div>
      <LiveSimulationScreen />
    </div>
  );
};
