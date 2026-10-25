import { useState, useEffect } from 'react';
import { ShieldCheck, Server } from 'lucide-react';
import { api } from '../../lib/api';

export const SettingsView = () => {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">
          System & Evaluation Settings
        </h1>
        <p className="font-sans text-xs sm:text-sm text-burgundy/60">
          Runtime environment telemetry, database persistence modes, and security configurations.
        </p>
      </div>

      {/* Backend & Storage Telemetry */}
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
              <span>{health?.status ? 'Online & Healthy' : 'Checking...'}</span>
            </div>
          </div>

          <div className="p-3 bg-ivory rounded border border-copper/15">
            <div className="text-[10px] text-zinc-500 uppercase">Persistence Mode</div>
            <div className="font-bold text-burgundy mt-1">
              {health?.storageMode === 'mongodb' ? 'MongoDB Database' : 'Local JSON File Store'}
            </div>
          </div>

          <div className="p-3 bg-ivory rounded border border-copper/15">
            <div className="text-[10px] text-zinc-500 uppercase">Uptime</div>
            <div className="font-bold text-burgundy mt-1">
              {health?.uptimeSeconds !== undefined ? `${health.uptimeSeconds}s` : 'Active'}
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded text-xs font-sans text-zinc-700 leading-relaxed">
          <strong>Database Persistence Note:</strong> AgentLab is designed with dual-mode storage. If MongoDB is not configured locally, AgentLab automatically persists all agent, world, and experiment records to local files in <code className="bg-zinc-200 px-1 py-0.5 rounded text-[11px]">server/data/</code>, guaranteeing 100% demo availability.
        </div>
      </div>

      {/* Security & Safety Posture */}
      <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
        <h3 className="font-sans font-bold text-sm text-burgundy flex items-center gap-2">
          <ShieldCheck size={15} className="text-copper" />
          <span>Security & Execution Guardrails</span>
        </h3>

        <div className="space-y-2.5 text-xs font-sans">
          {[
            {
              title: 'SSRF Network Protection',
              desc: 'Restricts outgoing API agent requests from reaching localhost, private subnet ranges, or cloud instance metadata (169.254.169.254).',
              status: 'Enforced',
            },
            {
              title: 'Sandboxed Tool Execution',
              desc: 'All simulated tools (refunds, customer accounts, orders) execute in memory against virtual mock records. No real financial or external actions are performed.',
              status: 'Enforced',
            },
            {
              title: 'Isolated CLI Runner Sandbox',
              desc: 'Command-line agent executions are restricted in review sandbox mode unless explicitly authorized via server environment variables.',
              status: 'Enforced',
            },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-ivory/40 border border-copper/15 rounded flex items-center justify-between">
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
