import { useState, useEffect } from 'react';
import { ShieldCheck, Server, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api, type SystemHealth } from '../../lib/api';

export const SettingsView = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  const isDbConnected = health?.database?.connected;

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">
          System & Architecture Settings
        </h1>
        <p className="font-sans text-xs sm:text-sm text-burgundy/60">
          Runtime environment telemetry, database persistence status, and security configurations.
        </p>
      </div>

      {/* Backend & Database Telemetry */}
      <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
        <h3 className="font-sans font-bold text-sm text-burgundy flex items-center gap-2">
          <Server size={15} className="text-copper" />
          <span>Active Backend Telemetry</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 bg-ivory rounded border border-copper/15">
            <div className="text-[10px] text-zinc-500 uppercase">Service Status</div>
            <div className="font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>{health?.status ? `v${health.version}` : 'Checking...'}</span>
            </div>
          </div>

          <div className="p-3 bg-ivory rounded border border-copper/15">
            <div className="text-[10px] text-zinc-500 uppercase">MongoDB Database</div>
            <div
              className={`font-bold mt-1 flex items-center gap-1.5 ${
                isDbConnected ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isDbConnected ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              ></span>
              <span>{isDbConnected ? 'Connected (Mongoose)' : 'Offline / Unconfigured'}</span>
            </div>
          </div>

          <div className="p-3 bg-ivory rounded border border-copper/15">
            <div className="text-[10px] text-zinc-500 uppercase">Uptime</div>
            <div className="font-bold text-burgundy mt-1">
              {health?.uptimeSeconds !== undefined ? `${health.uptimeSeconds}s` : 'Active'}
            </div>
          </div>
        </div>

        {/* Database Status Callout */}
        <div
          className={`p-3.5 rounded text-xs font-sans leading-relaxed border ${
            isDbConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2 font-bold mb-1">
            {isDbConnected ? (
              <CheckCircle2 size={15} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={15} className="text-amber-600" />
            )}
            <span>Database Architecture Policy: Real MongoDB Operations</span>
          </div>
          <p>
            {isDbConnected
              ? 'All agents, worlds, knowledge documents, scenarios, execution events, and evaluation metrics are actively persisted to MongoDB using Mongoose models and indexed collections.'
              : `MongoDB is currently unreachable (${health?.database?.error || 'MONGODB_URI is not set in environment'}). Mock database fallback has been strictly disabled per production guidelines. Configure MONGODB_URI in .env to persist simulations.`}
          </p>
        </div>
      </div>

      {/* Runner Infrastructure Telemetry */}
      <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
        <h3 className="font-sans font-bold text-sm text-burgundy flex items-center gap-2">
          <Database size={15} className="text-copper" />
          <span>Execution Runners & External Integrations</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
          <div className="p-3 bg-ivory/60 border border-copper/15 rounded space-y-1">
            <div className="font-bold text-burgundy flex items-center justify-between">
              <span>Isolated Docker Worker</span>
              <span
                className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                  health?.infrastructure.isolatedRunnerConfigured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {health?.infrastructure.isolatedRunnerConfigured ? 'Connected' : 'Not Configured'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-600">
              Required for executing arbitrary imported GitHub/ZIP repositories safely in Docker containers. (<code>AGENT_RUNNER_URL</code>)
            </p>
          </div>

          <div className="p-3 bg-ivory/60 border border-copper/15 rounded space-y-1">
            <div className="font-bold text-burgundy flex items-center justify-between">
              <span>Local CLI Execution Gate</span>
              <span
                className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                  health?.infrastructure.cliRunnerEnabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {health?.infrastructure.cliRunnerEnabled ? 'Enabled' : 'Disabled (Default)'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-600">
              Restricts local command subprocesses to whitelisted binaries (node, python, deno, bun, bash). (<code>ENABLE_CLI_RUNNER=true</code>)
            </p>
          </div>
        </div>
      </div>

      {/* Security & Safety Guardrails */}
      <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
        <h3 className="font-sans font-bold text-sm text-burgundy flex items-center gap-2">
          <ShieldCheck size={15} className="text-copper" />
          <span>Security & Execution Guardrails</span>
        </h3>

        <div className="space-y-2.5 text-xs font-sans">
          {[
            {
              title: 'SSRF Network Boundary Enforcement',
              desc: 'Blocks outgoing API agent requests targeting localhost (127.0.0.1, ::1), cloud metadata endpoints (169.254.169.254), and private RFC 1918 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).',
              status: 'Enforced',
            },
            {
              title: 'Sandboxed In-Memory Tool Registry',
              desc: 'All simulated tools (refund processing, order checks, identity verification) operate strictly on simulated data structures. No real financial or external customer actions are ever executed.',
              status: 'Enforced',
            },
            {
              title: 'No In-Process Arbitrary Code Execution',
              desc: 'Untrusted user-supplied code or imported repositories are never executed inside the Express server process. They require an explicit isolated runner or Docker container service.',
              status: 'Enforced',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 bg-ivory/40 border border-copper/15 rounded flex items-center justify-between"
            >
              <div className="mr-3">
                <div className="font-bold text-burgundy">{item.title}</div>
                <div className="text-[11px] text-burgundy/60 mt-0.5">{item.desc}</div>
              </div>
              <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase flex-shrink-0">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
