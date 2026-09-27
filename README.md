# AgentLab — AI Agent Simulation & Testing Platform

> **"Don't deploy your agent. Test it first."**
> Create realistic environments, simulate thousands of scenarios, and discover how your AI agent behaves before it reaches the real world.

---

## 🌟 Overview

**AgentLab** is an enterprise-grade AI agent simulation and testing infrastructure platform. It enables developers and AI engineers to place autonomous agents into isolated, customizable virtual environments (e.g. e-commerce, customer support, fintech, coding sandboxes), generate thousands of normal, edge-case, and adversarial scenarios, observe agent behavior in real-time, evaluate performance across key dimensions, identify failures, and iterate before deploying into production.

---

## 🛠️ Core Simulation Workflow

```text
Create Environment (Users, Rules, APIs, Tools, Constraints)
        ↓
Connect AI Agent (Custom LLM, API, Workflow Agent)
        ↓
Generate Scenarios (Normal, Edge Cases, Adversarial, Stress)
        ↓
Run Simulation (Multi-agent execution & environment loops)
        ↓
Observe Behavior (Live telemetry, event streams, memory register)
        ↓
Evaluate Performance (Success rate, grounding, tool accuracy, policy compliance)
        ↓
Identify Failures (Root cause analysis & timeline replay)
        ↓
Improve & Retest
```

---

## 🎨 Design System & Visual Identity

The design adheres strictly to the **Luxury Technology + Research Laboratory** palette:

* **Primary — Deep Burgundy (`#5A1830`)**
* **Secondary — Warm Ivory (`#F6F0E8`)**
* **Accent — Burnished Copper (`#B66A45`)**

### Typography
* **Headings**: `Space Grotesk`
* **Body**: `DM Sans`
* **Technical / Data**: `JetBrains Mono`

---

## 🚀 Key Features

1. **Multi-Mode Hero 3D Simulation Suite**:
   * **`[ ✨ 3D Core ]`**: Three.js + Drei cinematic gyroscopic hologram with concentric rotating copper gimbals, pulsating crystalline icosahedron, orbiting satellite nodes with 3D tags, and 350+ volumetric particle nebula.
   * **`[ 🌐 Spline 3D ]`**: Real-time outsourced WebGL streaming via `@splinetool/react-spline` with in-app URL loader to connect any community 3D asset.
   * **`[ ⚡ Topology ]`**: Isometric 3D virtual sandbox matrix with synthetic customer generation and telemetry sweeps.
2. **Hero Simulation Terminal**: Interactive `[ RUN ]` state machine running 1,248 simulated scenarios with animated telemetry metrics.
3. **Problem Section**: Editorial breakdown of real-world unpredictability, scaling limits of manual prompt tests, and the cost of downstream agent failures.
4. **Core Concept & 6-Step Workflow**: Vertical interactive timeline showing Environment creation, Agent connection, Scenario generation, Simulation, Evaluation, and Iteration.
5. **Interactive "Create a World" Demo**: Plain-language environment synthesizer with animated entity statistics and node connectivity graphs.
6. **Agent Connection Sandbox**: Configurator for agent models, tools, memory, and RAG knowledge bases.
7. **Live Simulation Console**: Real-time WebSocket-style streaming event log with color-coded transaction outcomes.
8. **Scenario Generator**: Adversarial, edge-case, and stress testing generation suite with single-click scenario execution.
9. **Evaluation Dashboard**: Recharts-powered performance analytics covering Task Success (91.8%), Grounding (94.2%), Tool Accuracy (88.7%), and Policy Compliance (97.1%).
10. **Failure Explorer**: Expandable diagnostic logs (#042, #031, #018, #067) with root cause breakdowns and interactive scenario replays.
11. **Model-Agnostic Agent Comparison**: Side-by-side performance benchmarking between custom models and frontier LLMs.
12. **RAG & Memory Visualizations**: Live semantic retrieval relevance rankings and short/long-term memory state inspections.
13. **Full Application Shell (`/app`)**: Production dashboard with Sidebar navigation, Environment Builder, Agent Builder, Simulation Control Center, and Evaluation views.

---

## 💻 Tech Stack

* **Framework**: React 19 + TypeScript + Vite
* **Styling**: Tailwind CSS with custom design tokens
* **3D & Graphics**: Three.js, `@react-three/fiber`, `@react-three/drei`, `@splinetool/react-spline`
* **Animations**: Framer Motion
* **Charts**: Recharts
* **Icons**: Lucide React
* **Routing**: React Router v7

---

## ⚡ Getting Started

### Prerequisites
* Node.js (v18+)
* npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/uday951/agentlab.git

# Navigate into project directory
cd agentlab

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
# Build production bundle
npm run build

# Preview build locally
npm run preview
```

---

## 📄 License

MIT License © 2026 AgentLab
