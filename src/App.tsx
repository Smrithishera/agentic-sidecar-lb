/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  ShieldAlert, 
  Cpu, 
  Database, 
  Zap, 
  ArrowRight, 
  BarChart3, 
  Terminal,
  Server,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Simulation Logic (Mirroring Python sidecar) ---

type Intent = 'Critical_Write' | 'Batch_Processing' | 'Routine_Read';

interface RequestLog {
  id: string;
  timestamp: number;
  body: string;
  intent: Intent;
  priority: number;
  action: 'SRV_1' | 'SRV_2' | 'THROTTLE';
  latency: number;
  reward: number;
}

const INTENTS: Intent[] = ['Critical_Write', 'Batch_Processing', 'Routine_Read'];

export default function App() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [cpu, setCpu] = useState(0.45);
  const [memory, setMemory] = useState(0.32);
  const [budget, setBudget] = useState(82000);
  const [spent, setSpent] = useState(12450);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'roadmap' | 'logs' | 'benchmark' | 'reports'>('dashboard');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [telemetrySource, setTelemetrySource] = useState<'simulation' | 'gcp'>('simulation');
  const [scenario, setScenario] = useState<'normal' | 'ddos' | 'flash_sale' | 'batch_spike' | 'chaos_gan'>('normal');
  const [chaosTimer, setChaosTimer] = useState<number | null>(null);
  const [reports, setReports] = useState<any[]>([]);

  // Comparison Data
  const [benchmarkData, setBenchmarkData] = useState<{
    standard: number[];
    quantized: number[];
    labels: string[];
  }>({
    standard: [],
    quantized: [],
    labels: []
  });

  // Fetch telemetry from backend
  useEffect(() => {
    if (!isCloudMode) return;

    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/telemetry');
        const data = await res.json();
        if (data.source) {
          setCpu(data.cpu);
          setMemory(data.memory);
          setTelemetrySource(data.source);
        }
      } catch (err) {
        console.error("Failed to fetch cloud telemetry", err);
      }
    };

    const interval = setInterval(fetchTelemetry, 5000);
    fetchTelemetry();
    return () => clearInterval(interval);
  }, [isCloudMode]);

  // Simulate background traffic
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      simulateRequest();
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, cpu, memory, scenario]);

  // Fetch reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/reports');
        const data = await res.json();
        setReports(data);
      } catch (err) {
        console.error("Failed to fetch reports", err);
      }
    };
    const interval = setInterval(fetchReports, 10000);
    fetchReports();
    return () => clearInterval(interval);
  }, []);

  // Chaos Timer Logic
  useEffect(() => {
    if (chaosTimer === null || chaosTimer <= 0) return;
    const interval = setInterval(() => {
      setChaosTimer(prev => (prev && prev > 0) ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [chaosTimer]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const startChaosTest = () => {
    setChaosTimer(3 * 3600); // Initial 3 hours visual, but logic will keep it running
    runScenario('chaos_gan');
  };

  const logIncident = async (description: string, priority: 'low' | 'high' = 'low') => {
    try {
      await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, priority, cpu, memory })
      });
    } catch (err) {
      console.error("Failed to log incident", err);
    }
  };

  const runScenario = (type: typeof scenario) => {
    setScenario(type);
    setIsSimulating(true);
    
    if (type === 'ddos') {
      setCpu(0.95);
      setMemory(0.85);
    } else if (type === 'flash_sale') {
      setCpu(0.7);
      setMemory(0.5);
    } else if (type === 'batch_spike') {
      setCpu(0.4);
      setMemory(0.9);
    } else if (type === 'chaos_gan') {
      // GAN generates unpredictable spikes
      setCpu(0.5 + Math.random() * 0.5);
      setMemory(0.5 + Math.random() * 0.5);
    } else {
      setCpu(0.45);
      setMemory(0.32);
    }
  };

  const simulateRequest = (manualBody?: string) => {
    // Adjust behavior based on scenario
    const body = manualBody || (
      scenario === 'ddos' ? "GET /api/v1/attack_payload" :
      scenario === 'flash_sale' ? "POST /api/v1/transaction { 'item': 'limited_edition' }" :
      scenario === 'batch_spike' ? "POST /api/v1/batch_process { 'records': 10000 }" :
      scenario === 'chaos_gan' ? `POST /api/v1/chaos { "entropy": ${Math.random().toFixed(4)} }` :
      `POST /api/v1/data { "id": ${Math.floor(Math.random() * 1000)} }`
    );
    
    // 1. NLP Intent Analysis (Simulated)
    let intent: Intent = 'Routine_Read';
    if (body.toLowerCase().includes('critical') || body.toLowerCase().includes('transaction')) {
      intent = 'Critical_Write';
    } else if (body.toLowerCase().includes('batch') || body.length > 100) {
      intent = 'Batch_Processing';
    } else {
      intent = INTENTS[Math.floor(Math.random() * 3)];
    }

    const priority = intent === 'Critical_Write' ? 1.0 : (intent === 'Batch_Processing' ? 0.6 : 0.2);

    // 2. RL Action Selection (Simulated)
    let action: 'SRV_1' | 'SRV_2' | 'THROTTLE';
    const load = (cpu + memory) / 2;
    if (load > 0.8) {
      action = priority < 0.7 ? 'THROTTLE' : (Math.random() > 0.5 ? 'SRV_1' : 'SRV_2');
    } else {
      action = Math.random() > 0.5 ? 'SRV_1' : 'SRV_2';
    }

    // 3. Latency Comparison Logic
    const standardInference = 25 + Math.random() * 15; // 25-40ms
    const quantizedInference = 1.2 + Math.random() * 0.8; // 1.2-2.0ms
    
    const networkLatency = action === 'THROTTLE' ? 2 : (10 + load * 50);
    const totalLatency = quantizedInference + networkLatency;
    
    const reward = (priority * 10) - (totalLatency / 10) - (action === 'THROTTLE' ? 5 : 0);
    const cost = action === 'THROTTLE' ? 0 : 50;

    const newLog: RequestLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      body,
      intent,
      priority,
      action,
      latency: totalLatency,
      reward
    };

    setLogs(prev => [newLog, ...prev].slice(0, 50));
    setSpent(prev => prev + cost);
    
    // Update Benchmark Data
    setBenchmarkData(prev => {
      const newLabels = [...prev.labels, new Date().toLocaleTimeString([], { second: '2-digit' })].slice(-15);
      const newStandard = [...prev.standard, standardInference].slice(-15);
      const newQuantized = [...prev.quantized, quantizedInference].slice(-15);
      return { labels: newLabels, standard: newStandard, quantized: newQuantized };
    });

    // Drift system state
    if (scenario === 'normal') {
      setCpu(prev => Math.min(1, Math.max(0.1, prev + (action === 'THROTTLE' ? -0.05 : 0.01))));
      setMemory(prev => Math.min(1, Math.max(0.1, prev + (action === 'THROTTLE' ? -0.02 : 0.005))));
    }

    // Incident detection
    if (scenario === 'chaos_gan' && load > 0.9 && action !== 'THROTTLE') {
      logIncident("Critical load detected during Chaos GAN test. RL Agent failed to throttle in time.", "high");
    } else if (load > 0.85) {
      logIncident("High load detected.", "low");
    }
  };

  const chartData = useMemo(() => {
    return logs.slice(0, 20).reverse().map(log => ({
      time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      latency: log.latency,
      reward: log.reward,
      priority: log.priority * 100
    }));
  }, [logs]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-300 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight">Agentic Load Balancer</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Sidecar MARL Architecture v1.0.4</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                activeTab === 'dashboard' ? "bg-blue-600 text-white shadow-lg" : "hover:bg-white/5 text-slate-400"
              )}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                activeTab === 'logs' ? "bg-blue-600 text-white shadow-lg" : "hover:bg-white/5 text-slate-400"
              )}
            >
              Live Logs
            </button>
            <button 
              onClick={() => setActiveTab('benchmark')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                activeTab === 'benchmark' ? "bg-blue-600 text-white shadow-lg" : "hover:bg-white/5 text-slate-400"
              )}
            >
              Benchmark
            </button>
            <button 
              onClick={() => setActiveTab('roadmap')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                activeTab === 'roadmap' ? "bg-blue-600 text-white shadow-lg" : "hover:bg-white/5 text-slate-400"
              )}
            >
              VANI Roadmap
            </button>
            <button 
              onClick={() => setActiveTab('reports')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                activeTab === 'reports' ? "bg-blue-600 text-white shadow-lg" : "hover:bg-white/5 text-slate-400"
              )}
            >
              Post-Mortems
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCloudMode(!isCloudMode)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                isCloudMode 
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                  : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
              )}
            >
              <Database className="w-3 h-3" />
              {isCloudMode ? "CLOUD: LIVE" : "CLOUD: OFF"}
            </button>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-green-500 uppercase">System Healthy</span>
            </div>
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                isSimulating 
                  ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20" 
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20"
              )}
            >
              {isSimulating ? "Stop Simulation" : "Start Simulation"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Stats Row */}
            <div className="col-span-12 grid grid-cols-4 gap-6">
              <StatCard 
                title="CPU Load" 
                value={`${(cpu * 100).toFixed(1)}%`} 
                icon={<Cpu className="w-4 h-4" />} 
                trend={cpu > 0.7 ? "high" : "normal"}
                progress={cpu}
              />
              <StatCard 
                title="Memory Usage" 
                value={`${(memory * 100).toFixed(1)}%`} 
                icon={<Database className="w-4 h-4" />} 
                trend={memory > 0.7 ? "high" : "normal"}
                progress={memory}
              />
              <StatCard 
                title="Avg Latency" 
                value={`${(logs.reduce((acc, l) => acc + l.latency, 0) / (logs.length || 1)).toFixed(1)}ms`} 
                icon={<Clock className="w-4 h-4" />} 
                trend="stable"
              />
              <StatCard 
                title="Budget Remaining" 
                value={`$${(budget - spent).toLocaleString()}`} 
                icon={<ShieldAlert className="w-4 h-4" />} 
                trend={spent > budget * 0.8 ? "critical" : "safe"}
                progress={(budget - spent) / budget}
              />
            </div>

            {/* Main Chart */}
            <div className="col-span-8 bg-black/40 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-bold text-white">Agentic Performance Matrix</h3>
                  <p className="text-xs text-slate-500">Real-time reward vs latency correlation</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Latency</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Reward</span>
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReward" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '10px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="latency" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={2} />
                    <Area type="monotone" dataKey="reward" stroke="#a855f7" fillOpacity={1} fill="url(#colorReward)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Decision Panel */}
            <div className="col-span-4 space-y-6">
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-500" />
                  Scenario Simulation
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => runScenario('normal')}
                    className={cn(
                      "py-2 px-3 rounded-lg text-[10px] font-bold transition-all border",
                      scenario === 'normal' ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                    )}
                  >
                    Normal Traffic
                  </button>
                  <button 
                    onClick={() => runScenario('ddos')}
                    className={cn(
                      "py-2 px-3 rounded-lg text-[10px] font-bold transition-all border",
                      scenario === 'ddos' ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                    )}
                  >
                    DDoS Attack
                  </button>
                  <button 
                    onClick={() => runScenario('flash_sale')}
                    className={cn(
                      "py-2 px-3 rounded-lg text-[10px] font-bold transition-all border",
                      scenario === 'flash_sale' ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                    )}
                  >
                    Flash Sale
                  </button>
                  <button 
                    onClick={() => runScenario('batch_spike')}
                    className={cn(
                      "py-2 px-3 rounded-lg text-[10px] font-bold transition-all border",
                      scenario === 'batch_spike' ? "bg-purple-500/20 border-purple-500/40 text-purple-400" : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                    )}
                  >
                    Batch Job Spike
                  </button>
                  <button 
                    onClick={startChaosTest}
                    className={cn(
                      "py-2 px-3 rounded-lg text-[10px] font-bold transition-all border col-span-2",
                      scenario === 'chaos_gan' ? "bg-red-600/20 border-red-600/40 text-red-500" : "bg-red-600/5 border-red-600/10 text-red-900 hover:bg-red-600/10"
                    )}
                  >
                    {scenario === 'chaos_gan' ? `Chaos GAN Active: ${formatTime(chaosTimer || 0)}` : "Start 3h Chaos GAN Test"}
                  </button>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-500" />
                  Manual Request Injector
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => simulateRequest("POST /api/v1/transaction { 'critical': true }")}
                    className="w-full py-2 px-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 hover:bg-blue-500/20 transition-all flex items-center justify-between group"
                  >
                    <span>Critical Write Intent</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => simulateRequest("POST /api/v1/batch { 'size': 5000 }")}
                    className="w-full py-2 px-4 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-400 hover:bg-purple-500/20 transition-all flex items-center justify-between group"
                  >
                    <span>Batch Processing Intent</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => simulateRequest("GET /api/v1/status")}
                    className="w-full py-2 px-4 bg-slate-500/10 border border-slate-500/20 rounded-lg text-xs text-slate-400 hover:bg-slate-500/20 transition-all flex items-center justify-between group"
                  >
                    <span>Routine Read Intent</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <ShieldAlert className="w-12 h-12 text-blue-500/20" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Anomaly Prevention</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  MARL agent is currently monitoring for $82k billing anomalies. 
                  <span className="text-blue-400 font-bold ml-1">Auto-throttle enabled.</span>
                </p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-blue-400 bg-blue-400/10 w-fit px-2 py-1 rounded">
                  <Activity className="w-3 h-3" />
                  AGENT ACTIVE
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="col-span-12 bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Real-time Decision Stream</h3>
                <div className="text-[10px] text-slate-500 font-mono">INT4 QUANTIZED INFERENCE ACTIVE</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-white/5">
                      <th className="px-6 py-3 font-medium">Timestamp</th>
                      <th className="px-6 py-3 font-medium">Intent</th>
                      <th className="px-6 py-3 font-medium">Priority</th>
                      <th className="px-6 py-3 font-medium">Action</th>
                      <th className="px-6 py-3 font-medium">Latency</th>
                      <th className="px-6 py-3 font-medium">Reward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence initial={false}>
                      {logs.slice(0, 8).map((log) => (
                        <motion.tr 
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              log.intent === 'Critical_Write' ? "bg-red-500/10 text-red-500" :
                              log.intent === 'Batch_Processing' ? "bg-purple-500/10 text-purple-500" :
                              "bg-blue-500/10 text-blue-500"
                            )}>
                              {log.intent.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${log.priority * 100}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-400">{log.priority.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {log.action === 'THROTTLE' ? (
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                              ) : (
                                <Server className="w-3 h-3 text-green-500" />
                              )}
                              <span className={cn(
                                "font-mono",
                                log.action === 'THROTTLE' ? "text-amber-500" : "text-green-500"
                              )}>
                                {log.action}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-400">{log.latency.toFixed(1)}ms</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "font-mono",
                              log.reward > 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {log.reward > 0 ? '+' : ''}{log.reward.toFixed(2)}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'benchmark' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 bg-black/40 border border-white/5 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Inference Latency Benchmark</h2>
                  <p className="text-slate-500">Comparing Standard FP32 vs. Our INT4 Quantized Model</p>
                </div>
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Standard Avg</p>
                    <p className="text-2xl font-bold text-red-400">~32.4ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Our Model Avg</p>
                    <p className="text-2xl font-bold text-green-400">~1.6ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Efficiency Gain</p>
                    <p className="text-2xl font-bold text-blue-400">20.2x</p>
                  </div>
                </div>
              </div>

              <div className="h-[400px] w-full mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={benchmarkData.labels.map((l, i) => ({
                    time: l,
                    standard: benchmarkData.standard[i],
                    quantized: benchmarkData.quantized[i]
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="time" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '10px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="standard" stroke="#ef4444" strokeWidth={2} dot={false} name="Standard Model (FP32)" />
                    <Line type="monotone" dataKey="quantized" stroke="#22c55e" strokeWidth={2} dot={false} name="Our Model (INT4)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-8 border-t border-white/5 pt-8">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    Standard Model Risks
                  </h4>
                  <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                    <li>High inference jitter (25-50ms)</li>
                    <li>Significant overhead on request cycle</li>
                    <li>Higher memory footprint (FP32 weights)</li>
                    <li>Increased CO2/Energy consumption per request</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" />
                    Our Optimized Model
                  </h4>
                  <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                    <li>Deterministic sub-2ms latency</li>
                    <li>WASM/SIMD optimized kernels</li>
                    <li>4x smaller model size (INT4)</li>
                    <li>Zero impact on user experience</li>
                  </ul>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-blue-400 mb-2">Principal Engineer's Note</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    "By moving to INT4 quantization, we've effectively removed the AI as a bottleneck. 
                    The agent now makes routing decisions faster than the network can transmit a single packet."
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Post-Mortem Reports</h2>
                <p className="text-slate-500">Automated incident analysis from Chaos GAN testing</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
                  <p className="text-[10px] text-red-500 uppercase font-mono">Critical Reports</p>
                  <p className="text-xl font-bold text-white">{reports.filter(r => r.priority === 'HIGH').length}</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl">
                  <p className="text-[10px] text-blue-500 uppercase font-mono">Daily Summaries</p>
                  <p className="text-xl font-bold text-white">{reports.filter(r => r.priority === 'LOW').length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {reports.map((report) => (
                <motion.div 
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-6 rounded-2xl border transition-all",
                    report.priority === 'HIGH' ? "bg-red-500/5 border-red-500/20" : "bg-black/40 border-white/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        report.priority === 'HIGH' ? "bg-red-500 animate-pulse" : "bg-blue-500"
                      )} />
                      <span className="text-xs font-mono text-slate-500">{report.id}</span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                        report.priority === 'HIGH' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {report.type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600">{new Date(report.timestamp).toLocaleString()}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{report.summary}</h3>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                      <p className="text-[10px] text-blue-400 uppercase font-mono mb-1">User Impact</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{report.impact}</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                      <p className="text-[10px] text-red-400 uppercase font-mono mb-1">Root Cause</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{report.rootCause}</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                      <p className="text-[10px] text-amber-400 uppercase font-mono mb-1">Trigger</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{report.trigger}</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                      <p className="text-[10px] text-green-400 uppercase font-mono mb-1">Resolution</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{report.resolution}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                      <p className="text-[10px] text-purple-400 uppercase font-mono mb-1">Lessons Learned</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{report.lessonsLearned}</p>
                    </div>
                    {report.actionItems && report.actionItems.length > 0 && (
                      <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10">
                        <p className="text-[10px] text-blue-400 uppercase font-mono mb-2">Action Items</p>
                        <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                          {Array.isArray(report.actionItems) ? report.actionItems.map((item: string, idx: number) => (
                            <li key={idx}>{item}</li>
                          )) : <li>{report.actionItems}</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {reports.length === 0 && (
                <div className="text-center py-20 bg-black/20 rounded-3xl border border-dashed border-white/5">
                  <AlertTriangle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500">No reports generated yet. Chaos GAN is currently observing...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-black/60 border border-white/5 rounded-2xl p-6 font-mono text-xs h-[600px] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-500" />
                <span className="text-white font-bold">Sidecar Agent Process Logs</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-500">PID: 4829</span>
                <span className="text-slate-500">UPTIME: 14:22:01</span>
              </div>
            </div>
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={log.id} className="flex gap-4 py-0.5 hover:bg-white/5 px-2 rounded">
                  <span className="text-slate-600">[{new Date(log.timestamp).toISOString()}]</span>
                  <span className="text-blue-500">[AGENT]</span>
                  <span className="text-slate-300">
                    Request {log.id} analyzed. Intent: <span className="text-purple-400">{log.intent}</span>. 
                    RL Action: <span className="text-green-400">{log.action}</span>. 
                    Reward: <span className={log.reward > 0 ? "text-green-400" : "text-red-400"}>{log.reward.toFixed(3)}</span>
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-slate-600 italic">Waiting for incoming requests...</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'roadmap' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-white mb-2">VANI Deployment Roadmap</h2>
              <p className="text-slate-500">10-day strategic rollout for Agentic Load Balancing</p>
            </div>
            
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-px bg-white/5" />
              <div className="space-y-12">
                <RoadmapItem 
                  day="01-02" 
                  phase="Verification" 
                  title="Baseline Benchmarking"
                  description="Validate INT4 quantization on target hardware. Ensure DistilBERT inference latency is consistently <1.8ms."
                  status="completed"
                />
                <RoadmapItem 
                  day="03-05" 
                  phase="Alpha Testing" 
                  title="Shadow Mode & Reward Tuning"
                  description="Deploy as sidecar in observation mode. Collect telemetry to train RL model. Calibrate reward weights for $82k anomaly threshold."
                  status="in-progress"
                />
                <RoadmapItem 
                  day="06-08" 
                  phase="Network Integration" 
                  title="gRPC/Envoy Integration"
                  description="Connect Sidecar to Envoy via ext_proc. Implement hard-coded fallback to Round Robin for safety."
                  status="pending"
                />
                <RoadmapItem 
                  day="09-10" 
                  phase="Incremental Rollout" 
                  title="Canary & Full Production"
                  description="Enable active routing for 1% of traffic. Scale to 100% across cluster with continuous learning loop."
                  status="pending"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, trend, progress }: { title: string, value: string, icon: React.ReactNode, trend: 'high' | 'normal' | 'safe' | 'critical' | 'stable', progress?: number }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-white/5 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
          {icon}
        </div>
        <span className={cn(
          "text-[10px] font-mono px-2 py-0.5 rounded uppercase",
          trend === 'high' || trend === 'critical' ? "bg-red-500/10 text-red-500" :
          trend === 'safe' || trend === 'stable' ? "bg-green-500/10 text-green-500" :
          "bg-blue-500/10 text-blue-500"
        )}>
          {trend}
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-slate-500 font-medium">{title}</p>
        <p className="text-xl font-bold text-white tracking-tight">{value}</p>
      </div>
      {progress !== undefined && (
        <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            className={cn(
              "h-full transition-all duration-500",
              progress > 0.8 ? "bg-red-500" : "bg-blue-500"
            )}
          />
        </div>
      )}
    </div>
  );
}

function RoadmapItem({ day, phase, title, description, status }: { day: string, phase: string, title: string, description: string, status: 'completed' | 'in-progress' | 'pending' }) {
  return (
    <div className="relative pl-20 group">
      <div className={cn(
        "absolute left-[30px] top-0 w-4 h-4 rounded-full border-2 z-10 transition-all",
        status === 'completed' ? "bg-green-500 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" :
        status === 'in-progress' ? "bg-blue-600 border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] animate-pulse" :
        "bg-[#0a0a0c] border-white/10"
      )}>
        {status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white absolute inset-0 m-auto" />}
      </div>
      
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Day {day}</span>
          <span className={cn(
            "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
            status === 'completed' ? "bg-green-500/10 text-green-500" :
            status === 'in-progress' ? "bg-blue-500/10 text-blue-500" :
            "bg-white/5 text-slate-500"
          )}>
            {phase}
          </span>
        </div>
        <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">{description}</p>
      </div>
    </div>
  );
}
