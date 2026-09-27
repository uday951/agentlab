import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/home/Hero';
import { ProblemSection } from '../components/home/ProblemSection';
import { ConceptSection } from '../components/home/ConceptSection';
import { HowItWorks } from '../components/home/HowItWorks';
import { WorldBuilderDemo } from '../components/home/WorldBuilderDemo';
import { AgentConnectionDemo } from '../components/home/AgentConnectionDemo';
import { LiveSimulationScreen } from '../components/home/LiveSimulationScreen';
import { ScenarioGenerator } from '../components/home/ScenarioGenerator';
import { EvaluationDashboard } from '../components/home/EvaluationDashboard';
import { FailureExplorer } from '../components/home/FailureExplorer';
import { AgentComparison } from '../components/home/AgentComparison';
import { RAGVisualization } from '../components/home/RAGVisualization';
import { MemoryVisualization } from '../components/home/MemoryVisualization';
import { ArchitectureSection } from '../components/home/ArchitectureSection';
import { UseCases } from '../components/home/UseCases';
import { FinalCTA } from '../components/home/FinalCTA';

export default function Landing() {
  return (
    <div className="bg-ivory min-h-screen text-burgundy">
      <Navbar />
      <Hero />
      <ProblemSection />
      <ConceptSection />
      <HowItWorks />
      <WorldBuilderDemo />
      <AgentConnectionDemo />
      <LiveSimulationScreen />
      <ScenarioGenerator />
      <EvaluationDashboard />
      <FailureExplorer />
      <AgentComparison />
      <RAGVisualization />
      <MemoryVisualization />
      <ArchitectureSection />
      <UseCases />
      <FinalCTA />
      <Footer />
    </div>
  );
}
