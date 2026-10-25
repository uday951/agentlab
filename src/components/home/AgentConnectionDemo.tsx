import { useState } from 'react';
import { Check, Bot, ArrowRight, ShieldCheck, Globe, GitBranch, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AgentConnectionDemo = () => {
  const [selectedMode, setSelectedMode] = useState<'deepseek' | 'api' | 'github' | 'builtin'>('deepseek');

  return (
    <section className="bg-ivory text-burgundy py-20 px-6 border-t border-copper/15">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-10 items-start justify-between">
          <div className="w-full md:w-1/2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-copper/10 text-copper text-[11px] font-mono font-bold uppercase tracking-wider mb-3">
              <Bot size={13} />
              <span>Multi-Architecture Adapter</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3 text-burgundy">
              Connect Any AI Agent
            </h2>
            <p className="font-sans text-xs sm:text-sm text-burgundy/70 mb-6 leading-relaxed">
              AgentLab uses a pluggable adapter architecture. Connect deterministic test agents, live DeepSeek/OpenAI LLMs, custom HTTP microservices, or GitHub repositories with entrypoint analysis.
            </p>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-2 gap-2 mb-6 font-mono text-xs">
              <button
                type="button"
                onClick={() => setSelectedMode('deepseek')}
                className={`p-3 rounded border text-left transition-all ${
                  selectedMode === 'deepseek'
                    ? 'border-copper bg-burgundy text-ivory font-bold shadow-sm'
                    : 'border-copper/25 bg-white text-burgundy hover:border-copper/50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                  <ShieldCheck size={13} className="text-copper" />
                  <span>DeepSeek Live LLM</span>
                </div>
                <p className="text-[10px] opacity-75 font-sans">Live multi-turn reasoning with tool calls</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('api')}
                className={`p-3 rounded border text-left transition-all ${
                  selectedMode === 'api'
                    ? 'border-copper bg-burgundy text-ivory font-bold shadow-sm'
                    : 'border-copper/25 bg-white text-burgundy hover:border-copper/50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                  <Globe size={13} className="text-copper" />
                  <span>HTTP REST API</span>
                </div>
                <p className="text-[10px] opacity-75 font-sans">Direct webhook with SSRF protection</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('github')}
                className={`p-3 rounded border text-left transition-all ${
                  selectedMode === 'github'
                    ? 'border-copper bg-burgundy text-ivory font-bold shadow-sm'
                    : 'border-copper/25 bg-white text-burgundy hover:border-copper/50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                  <GitBranch size={13} className="text-copper" />
                  <span>GitHub Import</span>
                </div>
                <p className="text-[10px] opacity-75 font-sans">Inspect repo & detect entrypoint</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('builtin')}
                className={`p-3 rounded border text-left transition-all ${
                  selectedMode === 'builtin'
                    ? 'border-copper bg-burgundy text-ivory font-bold shadow-sm'
                    : 'border-copper/25 bg-white text-burgundy hover:border-copper/50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                  <Terminal size={13} className="text-copper" />
                  <span>Deterministic Agent</span>
                </div>
                <p className="text-[10px] opacity-75 font-sans">Zero-cost baseline benchmark</p>
              </button>
            </div>

            <Link
              to="/app?tab=agents"
              className="inline-flex items-center justify-center gap-2 bg-burgundy text-ivory px-6 py-3 rounded font-sans font-semibold text-xs sm:text-sm hover:bg-burgundy-light transition-all shadow-md w-full sm:w-auto"
            >
              <span>Launch Agent Connection Center</span>
              <ArrowRight size={15} className="text-copper" />
            </Link>
          </div>

          {/* Interactive preview card */}
          <div className="w-full md:w-1/2 bg-white border border-copper/25 rounded-lg p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-copper/15 font-mono text-xs">
              <span className="font-bold text-burgundy">Adapter Preview: {selectedMode.toUpperCase()}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                READY TO CONNECT
              </span>
            </div>

            {selectedMode === 'deepseek' && (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-copper uppercase font-bold">Model</label>
                  <div className="bg-ivory border border-copper/20 p-2 rounded text-burgundy font-bold">
                    deepseek-chat (Turn-by-turn Function Calling)
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-copper uppercase font-bold">Active Features</label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['RAG Citations', 'Tool Call Synthesis', 'Adversarial Defense', 'Cost Telemetry'].map((feat) => (
                      <span key={feat} className="bg-copper/10 text-burgundy border border-copper/20 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                        <Check size={11} className="text-copper" /> {feat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded text-emerald-900 font-sans text-xs">
                  <strong>Integrated:</strong> Live DeepSeek Chat API key configured in server environment.
                </div>
              </div>
            )}

            {selectedMode === 'api' && (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-copper uppercase font-bold">Endpoint</label>
                  <div className="bg-ivory border border-copper/20 p-2 rounded text-burgundy">
                    https://agent.yourdomain.com/v1/chat
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-copper uppercase font-bold">Security Guardrail</label>
                  <div className="bg-zinc-50 border border-zinc-200 p-2 rounded text-zinc-700 text-[11px]">
                    SSRF Protection: Blocks 127.0.0.1, private RFC 1918 subnets, and local metadata IPs.
                  </div>
                </div>
                <div className="p-3 bg-ivory border border-copper/20 rounded font-sans text-xs text-burgundy/80">
                  Configure custom Bearer tokens, API keys, and timeouts in the Studio.
                </div>
              </div>
            )}

            {selectedMode === 'github' && (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-copper uppercase font-bold">Repository Inspection</label>
                  <div className="bg-ivory border border-copper/20 p-2 rounded text-burgundy">
                    https://github.com/org/autonomous-agent
                  </div>
                </div>
                <div className="p-3 bg-copper/5 border border-copper/20 rounded text-burgundy font-sans text-xs">
                  Automated entrypoint analysis (scans for <code>agent.py</code>, <code>index.js</code>, <code>main.ts</code>, <code>Dockerfile</code>) via GitHub API.
                </div>
              </div>
            )}

            {selectedMode === 'builtin' && (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-copper uppercase font-bold">SampleSupportAgent</label>
                  <div className="bg-ivory border border-copper/20 p-2 rounded text-burgundy">
                    Deterministic Policy Planner v1.2 (Zero external dependencies)
                  </div>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-zinc-700 font-sans text-xs">
                  Includes 10 benchmark scenarios, fault injection handling (HTTP 503 recovery), and automated compliance scoring.
                </div>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-copper/15">
              <Link
                to="/app?tab=agents"
                className="w-full flex items-center justify-center gap-2 bg-copper text-ivory py-2.5 rounded font-sans font-bold text-xs hover:bg-copper-dark transition-colors"
              >
                <span>Add / Configure Agent in Studio →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
