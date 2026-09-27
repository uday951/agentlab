import { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import Spline from '@splinetool/react-spline';
import { Sparkles, Layers, Globe, Settings, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════
   1. THREE.JS CINEMATIC HOLOGRAPHIC GYRO-CORE
   ═══════════════════════════════════════════════════════════════════ */

// Concentric Gimbal Rings that rotate on different axes
const GyroscopeRings = () => {
  const ring1 = useRef<THREE.Group>(null);
  const ring2 = useRef<THREE.Group>(null);
  const ring3 = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ring1.current) {
      ring1.current.rotation.x = t * 0.35;
      ring1.current.rotation.y = t * 0.2;
    }
    if (ring2.current) {
      ring2.current.rotation.y = t * -0.4;
      ring2.current.rotation.z = t * 0.3;
    }
    if (ring3.current) {
      ring3.current.rotation.z = t * 0.25;
      ring3.current.rotation.x = t * -0.3;
    }
  });

  return (
    <group>
      {/* Outer Gimbal Ring */}
      <group ref={ring1}>
        <mesh>
          <torusGeometry args={[2.5, 0.02, 16, 100]} />
          <meshStandardMaterial
            color="#B66A45"
            emissive="#B66A45"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>
      </group>

      {/* Middle Gimbal Ring */}
      <group ref={ring2}>
        <mesh>
          <torusGeometry args={[2.1, 0.025, 16, 100]} />
          <meshStandardMaterial
            color="#CC8560"
            emissive="#B66A45"
            emissiveIntensity={0.8}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>
      </group>

      {/* Inner Gimbal Ring */}
      <group ref={ring3}>
        <mesh>
          <torusGeometry args={[1.7, 0.03, 16, 100]} />
          <meshStandardMaterial
            color="#E8DFD0"
            emissive="#B66A45"
            emissiveIntensity={0.5}
            roughness={0.1}
            metalness={1.0}
          />
        </mesh>
      </group>
    </group>
  );
};

// Central Holographic Crystalline Core
const NeuralCore = () => {
  const innerMesh = useRef<THREE.Mesh>(null);
  const outerWireframe = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (innerMesh.current) {
      innerMesh.current.rotation.y = t * 0.6;
      innerMesh.current.rotation.x = t * 0.4;
      const s = 1 + Math.sin(t * 2.5) * 0.08;
      innerMesh.current.scale.setScalar(s);
    }
    if (outerWireframe.current) {
      outerWireframe.current.rotation.y = -t * 0.4;
      outerWireframe.current.rotation.z = t * 0.3;
    }
  });

  return (
    <group>
      {/* Crystalline Core */}
      <mesh ref={innerMesh}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial
          color="#B66A45"
          emissive="#5A1830"
          emissiveIntensity={1.2}
          roughness={0.15}
          metalness={0.85}
          wireframe={false}
        />
      </mesh>

      {/* Outer Geodesic Cage */}
      <mesh ref={outerWireframe}>
        <icosahedronGeometry args={[1.25, 1]} />
        <meshStandardMaterial
          color="#F6F0E8"
          emissive="#B66A45"
          emissiveIntensity={0.9}
          wireframe={true}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Core Glowing Point Light */}
      <pointLight color="#B66A45" intensity={4} distance={6} />
      <pointLight color="#F6F0E8" intensity={2} distance={4} />
    </group>
  );
};

// Orbiting Entity Satellites (Users, APIs, Tools, Rules, Events)
const SATELLITES = [
  { name: 'ENV: Users', radius: 3.2, speed: 0.6, phase: 0, color: '#B66A45' },
  { name: 'API Gateway', radius: 3.4, speed: -0.5, phase: 1.2, color: '#E8DFD0' },
  { name: 'Tool: Refund', radius: 3.0, speed: 0.8, phase: 2.5, color: '#CC8560' },
  { name: 'Policy #24', radius: 3.6, speed: -0.4, phase: 3.8, color: '#B66A45' },
  { name: 'Event Bus', radius: 3.1, speed: 0.7, phase: 5.1, color: '#E8DFD0' },
];

const OrbitingSatellites = () => {
  return (
    <group>
      {SATELLITES.map((sat, i) => (
        <SatelliteNode key={i} {...sat} />
      ))}
    </group>
  );
};

const SatelliteNode = ({
  name,
  radius,
  speed,
  phase,
  color,
}: {
  name: string;
  radius: number;
  speed: number;
  phase: number;
  color: string;
}) => {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      const angle = t * speed + phase;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(t * 1.5 + phase) * 0.4;
      group.current.position.set(x, y, z);
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>
      <Html distanceFactor={12} center position={[0, 0.22, 0]}>
        <div className="pointer-events-none select-none px-2 py-0.5 rounded bg-[#3A0D1C]/90 border border-copper/40 text-[9px] font-mono text-ivory/90 tracking-wider whitespace-nowrap shadow-xl backdrop-blur-sm">
          {name}
        </div>
      </Html>
    </group>
  );
};

// 3D Particle Constellation
const ParticleNebula = () => {
  const points = useRef<THREE.Points>(null);
  const count = 350;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 2.2 + Math.random() * 2.8;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#F6F0E8"
        size={0.035}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
};

// Scene Wrapper with Camera & Lighting
const HologramScene = () => {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 8, 5]} intensity={2.5} color="#F6F0E8" />
      <directionalLight position={[-6, -4, -5]} intensity={1.2} color="#B66A45" />

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
        <GyroscopeRings />
        <NeuralCore />
        <OrbitingSatellites />
        <ParticleNebula />
      </Float>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.8}
        maxPolarAngle={Math.PI / 1.7}
        minPolarAngle={Math.PI / 2.6}
      />
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   2. ISOMETRIC VIRTUAL TOPOLOGY SANDBOX
   ═══════════════════════════════════════════════════════════════════ */
const IsometricSandbox = () => {
  const [activeStep, setActiveStep] = useState(2);

  const topologyNodes = [
    { title: 'User Ingestion', desc: '1,000 synthetic shoppers', status: 'ACTIVE' },
    { title: 'ShopSphere API', desc: 'Latency: 14ms · Mocked', status: 'HEALTHY' },
    { title: 'Support-AI Core', desc: 'Deliberating: CoT_v4', status: 'PROCESSING' },
    { title: 'Policy Engine', desc: 'Policy #24 Enforced', status: 'GUARDED' },
    { title: 'Telemetry Bus', desc: 'Zero leakages detected', status: 'STREAMING' },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-between p-6 bg-gradient-to-b from-[#3A0D1C] via-[#2A0814] to-[#1C050D] text-ivory select-none font-mono">
      {/* Top telemetry bar */}
      <div className="flex justify-between items-center border-b border-copper/30 pb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-copper animate-ping" />
          <span className="text-copper font-bold tracking-widest">ISOMETRIC SIMULATION MATRIX</span>
        </div>
        <div className="text-[10px] text-ivory/50">TICK: 240Hz · VIRTUALIZED VM</div>
      </div>

      {/* Isometric Canvas Visualizer */}
      <div className="relative my-auto flex items-center justify-center py-6">
        <div className="w-72 h-72 border border-copper/30 rounded-2xl rotate-45 transform skew-y-12 bg-burgundy/40 backdrop-blur-md relative overflow-hidden shadow-2xl flex items-center justify-center">
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#B66A45_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

          {/* Central Pulsing Agent Marker */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-copper/20 border-2 border-copper flex items-center justify-center animate-pulse shadow-[0_0_25px_rgba(182,106,69,0.8)]">
              <span className="text-xs font-bold text-ivory -rotate-45">AI</span>
            </div>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-copper to-transparent mt-3" />
          </div>

          {/* Simulated radar sweep */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-copper/10 to-transparent animate-spin [animation-duration:6s]" />
        </div>

        {/* Floating Node Badges */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-xs">
          <div className="flex justify-between">
            <span className="bg-[#3A0D1C] border border-copper/40 px-2 py-1 rounded text-[10px] text-copper">
              ENT_01: Synthetic Customers [1,000]
            </span>
            <span className="bg-[#3A0D1C] border border-copper/40 px-2 py-1 rounded text-[10px] text-copper">
              GATEWAY: REST v2.4 (Mocked)
            </span>
          </div>
          <div className="flex justify-between mt-auto">
            <span className="bg-[#3A0D1C] border border-copper/40 px-2 py-1 rounded text-[10px] text-ivory/80">
              SAFETY: Policy Guardrails [24]
            </span>
            <span className="bg-[#3A0D1C] border border-copper/40 px-2 py-1 rounded text-[10px] text-copper font-bold">
              CONTAINER: ISOLATED
            </span>
          </div>
        </div>
      </div>

      {/* Step Inspector */}
      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-copper/20 text-[10px]">
        {topologyNodes.map((node, i) => (
          <div
            key={i}
            onClick={() => setActiveStep(i)}
            className={`cursor-pointer p-2 rounded transition-all border ${
              activeStep === i
                ? 'border-copper bg-copper/20 text-ivory'
                : 'border-copper/10 bg-black/20 text-ivory/50 hover:border-copper/30'
            }`}
          >
            <div className="font-bold truncate">{node.title}</div>
            <div className="text-[8px] text-copper/80 truncate mt-0.5">{node.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   3. OUTSOURCED SPLINE 3D INTEGRATION
   ═══════════════════════════════════════════════════════════════════ */
const SplineIntegrationView = ({
  splineUrl,
  onResetUrl,
}: {
  splineUrl: string;
  onResetUrl: (url: string) => void;
}) => {
  const [customInput, setCustomInput] = useState(splineUrl);
  const [showConfig, setShowConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#3A0D1C]">
      {/* Spline Canvas */}
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center h-full text-copper font-mono text-xs gap-3">
            <RefreshCw className="animate-spin" size={20} />
            <span>Streaming 3D Neural Scene from Spline Cloud...</span>
          </div>
        }
      >
        <Spline
          scene={splineUrl}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full"
        />
      </Suspense>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#3A0D1C]/90 text-copper font-mono text-xs gap-3 z-10">
          <RefreshCw className="animate-spin text-copper" size={24} />
          <span className="tracking-widest uppercase">Connecting Spline 3D Cloud Engine...</span>
          <span className="text-[10px] text-ivory/40">High-fidelity WebGL Asset Stream</span>
        </div>
      )}

      {/* Spline Config Drawer button */}
      <div className="absolute bottom-4 left-4 z-20">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#3A0D1C]/90 border border-copper/40 text-[10px] font-mono text-copper hover:bg-copper hover:text-ivory transition-all shadow-lg backdrop-blur-md"
        >
          <Settings size={12} />
          <span>Switch Spline 3D Asset</span>
        </button>
      </div>

      {/* Config Modal */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-14 left-4 right-4 z-30 p-4 bg-[#2A0814] border border-copper/50 rounded-xl shadow-2xl font-mono text-xs text-ivory"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-copper uppercase tracking-wider">
                External Spline 3D Scene URL
              </span>
              <button
                onClick={() => setShowConfig(false)}
                className="text-ivory/50 hover:text-ivory text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-[10px] text-ivory/60 mb-3">
              Export any 3D asset from Spline (or use public community URLs like robotic cores, neural spheres, AI chips).
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="https://prod.spline.design/.../scene.splinecode"
                className="flex-1 bg-black/40 border border-copper/30 px-3 py-2 rounded text-xs text-ivory focus:outline-none focus:border-copper"
              />
              <button
                onClick={() => {
                  onResetUrl(customInput);
                  setShowConfig(false);
                  setIsLoading(true);
                }}
                className="cursor-pointer bg-copper text-ivory px-4 py-2 rounded font-bold hover:bg-copper-light transition-colors text-xs"
              >
                Load
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN HERO VIZ 3D WITH TABBED VIEW SWITCHER
   ═══════════════════════════════════════════════════════════════════ */
export const HeroViz3D = () => {
  // Modes: 'hologram' | 'spline' | 'isometric'
  const [mode, setMode] = useState<'hologram' | 'spline' | 'isometric'>('hologram');
  const [splineUrl, setSplineUrl] = useState(
    'https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode'
  );

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#3A0D1C] select-none flex flex-col">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-copper animate-pulse" />
          <span className="font-mono text-[10px] tracking-widest text-copper uppercase font-bold">
            {mode === 'hologram' && '3D Holographic Core'}
            {mode === 'spline' && 'Spline 3D Outsource'}
            {mode === 'isometric' && 'Virtual Sandbox Topology'}
          </span>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center bg-[#240610]/80 p-1 rounded-lg border border-copper/30 backdrop-blur-md shadow-lg">
          <button
            onClick={() => setMode('hologram')}
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
              mode === 'hologram'
                ? 'bg-copper text-ivory font-bold shadow-sm'
                : 'text-ivory/60 hover:text-ivory hover:bg-white/5'
            }`}
          >
            <Sparkles size={11} />
            <span>3D Core</span>
          </button>

          <button
            onClick={() => setMode('spline')}
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
              mode === 'spline'
                ? 'bg-copper text-ivory font-bold shadow-sm'
                : 'text-ivory/60 hover:text-ivory hover:bg-white/5'
            }`}
          >
            <Globe size={11} />
            <span>Spline 3D</span>
          </button>

          <button
            onClick={() => setMode('isometric')}
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
              mode === 'isometric'
                ? 'bg-copper text-ivory font-bold shadow-sm'
                : 'text-ivory/60 hover:text-ivory hover:bg-white/5'
            }`}
          >
            <Layers size={11} />
            <span>Topology</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 w-full h-full relative">
        {mode === 'hologram' && (
          <div className="w-full h-full">
            <Canvas
              camera={{ position: [0, 0, 7.2], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              style={{ background: 'transparent' }}
            >
              <HologramScene />
            </Canvas>
          </div>
        )}

        {mode === 'spline' && (
          <SplineIntegrationView
            splineUrl={splineUrl}
            onResetUrl={(url) => setSplineUrl(url)}
          />
        )}

        {mode === 'isometric' && <IsometricSandbox />}
      </div>

      {/* Bottom Technical Corner Decals */}
      <div className="absolute bottom-4 right-4 pointer-events-none flex items-center gap-3 font-mono text-[9px] text-ivory/30 tracking-widest">
        <span>INTERACTIVE SIMULATION VIEWPORT</span>
        <span className="w-1.5 h-1.5 rounded-full bg-copper/60" />
        <span>2027 SPEC</span>
      </div>

      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-copper/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-copper/30 pointer-events-none" />
    </div>
  );
};
