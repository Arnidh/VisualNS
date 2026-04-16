import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  Monitor,
  Smartphone,
  Terminal,
  Settings,
  Link as LinkIcon,
  Lock,
  RefreshCw,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react';
import { GlassCard } from './GlassCard';

type ViolationAction = 'Shutdown' | 'Restrict' | 'Protect';

interface PortConfig {
  id: number;
  /** Lab-style port label (e.g. matches managed switch slot notation) */
  labPort: string;
  enabled: boolean;
  maxMacs: number;
  violationAction: ViolationAction;
  sticky: boolean;
  /** MAC addresses the switch treats as secure on this port */
  learnedMacs: string[];
  status: 'Up' | 'Down' | 'ErrDisable';
  violations: number;
  connectedDeviceId: string | null;
  /** True when an extra MAC triggered a non-shutdown violation (traffic dropped) */
  trafficBlocked: boolean;
}

interface Device {
  id: string;
  name: string;
  mac: string;
  role: 'authorized' | 'unauthorized';
  icon: React.ReactNode;
}

const DEVICES: Device[] = [
  { id: 'dev-1', name: 'PC1', mac: '0011.2233.4455', role: 'authorized', icon: <Monitor size={24} /> },
  { id: 'dev-2', name: 'PC2', mac: '00BB.CCCC.DDDD', role: 'authorized', icon: <Smartphone size={24} /> },
  { id: 'dev-3', name: 'PC3', mac: 'FFFF.FFFF.FFFF', role: 'unauthorized', icon: <Terminal size={24} /> },
];

/** Slot index 0 = first front-panel port → lab worksheet-style `ethernet 1/1/2` (stack/module/port). */
const LAB_PORT_FOR_SLOT = (slotIndex: number) => `1/1/${slotIndex + 2}`;

const INITIAL_PORTS: PortConfig[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  labPort: LAB_PORT_FOR_SLOT(i),
  enabled: false,
  maxMacs: 2,
  violationAction: 'Shutdown',
  sticky: false,
  learnedMacs: [],
  status: 'Up',
  violations: 0,
  connectedDeviceId: null,
  trafficBlocked: false,
}));

const VIOLATION_HELP: Record<ViolationAction, string> = {
  Shutdown: 'Port enters err-disable; link drops until you reset the interface.',
  Restrict: 'Unauthorized frames are dropped; violations are counted and can be logged.',
  Protect: 'Unauthorized frames are dropped silently (no increment in some implementations—here we still count for the lab view).',
};

export const PortSecuritySim: React.FC = () => {
  const [ports, setPorts] = useState<PortConfig[]>(INITIAL_PORTS);
  const [selectedPortId, setSelectedPortId] = useState<number | null>(1);
  const [logs, setLogs] = useState<{ id: number; time: string; msg: string; type: 'info' | 'warn' | 'error' }[]>([]);
  const [termsOpen, setTermsOpen] = useState(false);

  const lastLogRef = useRef<{ msg: string; at: number } | null>(null);
  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    const now = Date.now();
    if (lastLogRef.current && lastLogRef.current.msg === msg && now - lastLogRef.current.at < 120) {
      return;
    }
    lastLogRef.current = { msg, at: now };
    setLogs((prev) =>
      [
        {
          id: now + Math.random(),
          time: new Date().toLocaleTimeString(),
          msg,
          type,
        },
        ...prev,
      ].slice(0, 50)
    );
  }, []);

  const selectedPort = ports.find((p) => p.id === selectedPortId);

  const togglePortSecurity = (portId: number) => {
    setPorts((prev) =>
      prev.map((p) => {
        if (p.id === portId) {
          const newState = !p.enabled;
          addLog(`interface ethernet ${p.labPort}: port security ${newState ? 'enabled' : 'disabled'}`);
          return { ...p, enabled: newState };
        }
        return p;
      })
    );
  };

  const updatePortConfig = (portId: number, updates: Partial<PortConfig>) => {
    setPorts((prev) => prev.map((p) => (p.id === portId ? { ...p, ...updates } : p)));
  };

  const handleConnect = (portId: number, deviceId: string | null) => {
    setPorts((prev) => {
      const portIdx = prev.findIndex((p) => p.id === portId);
      if (portIdx < 0) return prev;
      const port: PortConfig = { ...prev[portIdx] };

      /**
       * While port security is ON, learned secure MACs stay in the table when you unplug or swap cables
       * (until Reset / Clear sticky), so you can reach "maximum" and trigger a violation like the bench lab.
       * When security is OFF, we do not maintain a secure list.
       */
      const detachLearnedMacOnDisconnect = (mac: string) => {
        if (!port.enabled) {
          port.learnedMacs = port.learnedMacs.filter((m) => m !== mac);
        }
      };

      if (deviceId === null) {
        const old = port.connectedDeviceId ? DEVICES.find((d) => d.id === port.connectedDeviceId) : undefined;
        if (old) detachLearnedMacOnDisconnect(old.mac);
        port.connectedDeviceId = null;
        port.trafficBlocked = false;
        addLog(`interface ethernet ${port.labPort}: link down (device disconnected).`);
        const next = [...prev];
        next[portIdx] = port;
        return next;
      }

      const device = DEVICES.find((d) => d.id === deviceId);
      if (!device) return prev;

      if (port.status === 'ErrDisable') {
        addLog(`interface ethernet ${port.labPort}: cannot bring up host — port is err-disabled. Use reset.`, 'error');
        return prev;
      }

      if (port.connectedDeviceId && port.connectedDeviceId !== deviceId) {
        const previous = DEVICES.find((d) => d.id === port.connectedDeviceId);
        if (previous && !port.enabled) {
          port.learnedMacs = port.learnedMacs.filter((m) => m !== previous.mac);
        }
      }

      port.connectedDeviceId = deviceId;
      port.trafficBlocked = false;

      if (!port.enabled) {
        addLog(`interface ethernet ${port.labPort}: link up — port security is off; MAC ${device.mac} observed.`);
        const next = [...prev];
        next[portIdx] = port;
        return next;
      }

      const mac = device.mac;
      const alreadySecure = port.learnedMacs.includes(mac);

      if (alreadySecure) {
        addLog(`interface ethernet ${port.labPort}: secure MAC ${mac} (${device.name}) — traffic permitted.`);
        const next = [...prev];
        next[portIdx] = port;
        return next;
      }

      if (port.learnedMacs.length < port.maxMacs) {
        port.learnedMacs = [...port.learnedMacs, mac];
        const mode = port.sticky ? 'sticky secure' : 'dynamic secure';
        addLog(
          `interface ethernet ${port.labPort}: learned ${mode} address ${mac} (${device.name}); within maximum ${port.maxMacs}.`
        );
        const next = [...prev];
        next[portIdx] = port;
        return next;
      }

      port.violations += 1;
      port.trafficBlocked = true;
      addLog(
        `interface ethernet ${port.labPort}: SECURITY VIOLATION — MAC ${mac} (${device.name}) exceeds maximum ${port.maxMacs}.`,
        'error'
      );

      if (port.violationAction === 'Shutdown') {
        port.status = 'ErrDisable';
        addLog(`interface ethernet ${port.labPort}: violation action shutdown — interface placed in err-disable.`, 'error');
      } else if (port.violationAction === 'Restrict') {
        addLog(`interface ethernet ${port.labPort}: violation restrict — frames dropped; violation counter incremented.`, 'warn');
      } else {
        addLog(`interface ethernet ${port.labPort}: violation protect — unauthorized frames dropped (silent drop).`, 'info');
      }

      const next = [...prev];
      next[portIdx] = port;
      return next;
    });
  };

  const resetPort = (portId: number) => {
    setPorts((prev) =>
      prev.map((p) =>
        p.id === portId
          ? {
              ...p,
              status: 'Up',
              violations: 0,
              connectedDeviceId: null,
              learnedMacs: [],
              trafficBlocked: false,
            }
          : p
      )
    );
    const p = ports.find((x) => x.id === portId);
    addLog(`interface ethernet ${p?.labPort ?? '?'}: cleared — err-disable cleared, secure MAC list cleared, link ready.`);
  };

  const clearSticky = (portId: number) => {
    setPorts((prev) => prev.map((p) => (p.id === portId ? { ...p, learnedMacs: [] } : p)));
    const p = ports.find((x) => x.id === portId);
    addLog(`interface ethernet ${p?.labPort ?? '?'}: sticky secure addresses cleared from configuration.`);
  };

  const verifyTable = useMemo(() => {
    if (!selectedPort) return '';
    const current = selectedPort.connectedDeviceId
      ? DEVICES.find((d) => d.id === selectedPort.connectedDeviceId)?.mac ?? '—'
      : '—';
    return `Port        Max MAC   Current MAC        Violations  State\n${selectedPort.labPort.padEnd(12)}${String(selectedPort.maxMacs).padEnd(10)}${current.padEnd(19)}${String(selectedPort.violations).padEnd(12)}${selectedPort.status}`;
  }, [selectedPort]);

  return (
    <div className="flex flex-col gap-8 h-full">
      <section className="rounded-2xl border border-emerald-500/25 bg-emerald-950/15 px-5 py-4">
        <h3 className="text-sm font-bold text-emerald-300 mb-3">How to run this lab in the app</h3>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-400 leading-relaxed">
          <li>
            <span className="text-slate-300">Pick a port</span> on the switch (e.g. Gi0/1). The panel shows{' '}
            <span className="font-mono text-slate-300">ethernet 1/1/2</span>-style mapping for your worksheet.
          </li>
          <li>
            <span className="text-slate-300">Turn on port security</span>, set <span className="text-slate-300">maximum MAC addresses</span> (try{' '}
            <span className="font-mono">2</span> to match two PCs), and pick a <span className="text-slate-300">violation action</span> (shutdown / restrict / protect).
          </li>
          <li>
            <span className="text-slate-300">Connect hosts in order:</span> plug <span className="font-mono text-slate-300">PC1</span>, unplug, then <span className="font-mono text-slate-300">PC2</span>, etc. With port security on,{' '}
            <strong className="text-slate-300">learned MACs stay in the table</strong> when you disconnect (like sticky learning for this lab), until you Reset. So with maximum{' '}
            <span className="font-mono">2</span>, after PC1 and PC2 have been learned you should see <strong className="text-slate-300">2 learned</strong>; plugging <span className="font-mono">PC3</span> should raise a{' '}
            <strong className="text-slate-300">violation</strong>, not a third “learned” line.
          </li>
          <li>
            <span className="text-slate-300">What “success” looks like:</span> secure MAC count ≤ maximum, violations stay <span className="font-mono">0</span>, traffic allowed (green /
            normal state). The log lines describe each step in plain language.
          </li>
          <li>
            <span className="text-slate-300">Trigger a violation:</span> with maximum already reached, connect <span className="font-mono text-slate-300">PC3</span> (extra MAC). You should see a
            security event; <strong className="text-slate-300">shutdown</strong> forces err-disable, <strong className="text-slate-300">restrict/protect</strong> drop traffic but may leave the link up in the UI.
          </li>
          <li>
            <span className="text-slate-300">Reset</span> clears err-disable and the secure list so you can rerun. Inputs are which PC you click; there is no password — MACs are printed on each PC card.
          </li>
        </ol>
      </section>

      <aside className="rounded-2xl border border-slate-800/80 bg-slate-950/50 px-5 py-4 text-sm text-slate-400 leading-relaxed">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Lab 11 · Port security on an access port</p>
            <p>
              Restrict Layer-2 access by limiting how many MAC addresses may be learned on one port, and choose what happens when a new host breaks that rule.
              Map <span className="text-slate-300">Gi0/n</span> in the UI to your worksheet as <span className="text-slate-300">ethernet 1/1/(n+1)</span> — e.g. Gi0/1 corresponds to{' '}
              <span className="font-mono text-slate-300">ethernet 1/1/2</span> in the lab write-up.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTermsOpen((o) => !o)}
            className="shrink-0 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <BookOpen size={14} />
            {termsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Key terms
          </button>
        </div>
        <AnimatePresence>
          {termsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-3 border-t border-slate-800/80 pt-4">
                <div>
                  <dt className="font-medium text-slate-300">Secure MAC</dt>
                  <dd className="text-slate-500">A MAC the switch is allowed to forward on this port.</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-300">Violation</dt>
                  <dd className="text-slate-500">A frame from a MAC that cannot be learned because the secure list is full.</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-300">Sticky MAC</dt>
                  <dd className="text-slate-500">Dynamically learned addresses saved to config so they survive reloads (simplified here).</dd>
                </div>
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <GlassCard className="relative overflow-hidden bg-slate-950/40 border-slate-800">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white flex items-center gap-3">
                    <Zap className="text-blue-400" />
                    Managed L2 switch (access layer)
                  </h3>
                  <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] font-bold mt-1">
                    Port security · MAC learning limit · violation policy
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Forwarding plane</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl relative">
                <div className="grid grid-cols-4 gap-8">
                  {ports.map((port) => {
                    const device = DEVICES.find((d) => d.id === port.connectedDeviceId);
                    const isSelected = selectedPortId === port.id;
                    const isErr = port.status === 'ErrDisable';
                    const blocked = port.trafficBlocked && !isErr;

                    return (
                      <div key={port.id} className="flex flex-col items-center gap-2">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedPortId(port.id)}
                          aria-label={`Port Gi0/${port.id}, lab ethernet ${port.labPort}`}
                          className={`w-16 h-16 rounded-xl border-4 transition-all relative flex items-center justify-center
                              ${isSelected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'border-slate-800'}
                              ${
                                isErr
                                  ? 'bg-red-900/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                                  : blocked
                                    ? 'bg-amber-900/25 border-amber-500/70'
                                    : port.connectedDeviceId
                                      ? 'bg-emerald-900/20 border-emerald-500/50'
                                      : 'bg-slate-950'
                              }`}
                        >
                          <div
                            className={`absolute top-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full
                              ${isErr ? 'bg-red-500' : blocked ? 'bg-amber-400' : port.connectedDeviceId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-800'}`}
                          />

                          {device ? (
                            <div className={isErr ? 'text-red-400' : blocked ? 'text-amber-300' : 'text-emerald-400'}>{device.icon}</div>
                          ) : (
                            <LinkIcon className="text-slate-800" size={20} />
                          )}

                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-900 px-2 rounded-full border border-slate-800 text-[8px] font-bold text-slate-500 whitespace-nowrap">
                            Gi0/{port.id}
                          </span>
                        </motion.button>
                        <span className="text-[9px] font-mono text-slate-600">{port.labPort}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute top-4 left-4 p-2 bg-slate-800/50 rounded-lg text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                  Chassis: lab bench
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 !bg-slate-900/40">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              End devices (single cable to selected port)
            </h4>
            <p className="text-[11px] text-slate-500 mb-6 max-w-2xl">
              Select a port on the switch, then click a PC to attach it. Only one device per port at a time — mirroring “move the cable” on the bench. PC1 and PC2 act as the authorized hosts in the lab; PC3 is the extra host used to trigger a violation once the secure list is full.
            </p>
            <div className="flex flex-wrap gap-4">
              {DEVICES.map((device) => {
                const isConnected = ports.some((p) => p.connectedDeviceId === device.id);
                return (
                  <motion.div
                    key={device.id}
                    whileHover={{ scale: 1.02 }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer group flex-1 min-w-[140px]
                        ${
                          isConnected
                            ? 'bg-slate-900 border-slate-800 opacity-40 grayscale'
                            : device.role === 'unauthorized'
                              ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                              : 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10'
                        }`}
                    onClick={() => {
                      if (!selectedPortId) return;
                      if (isConnected) {
                        const p = ports.find((x) => x.connectedDeviceId === device.id);
                        if (p) handleConnect(p.id, null);
                      } else {
                        handleConnect(selectedPortId, device.id);
                      }
                    }}
                  >
                    <div
                      className={`p-4 rounded-xl shadow-lg transition-transform group-hover:-translate-y-0.5
                         ${
                           device.role === 'unauthorized'
                             ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                             : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                         }`}
                    >
                      {device.icon}
                    </div>
                    <span className={`text-[10px] font-black uppercase text-center ${isConnected ? 'text-slate-600' : 'text-slate-300'}`}>
                      {device.name}
                    </span>
                    <span className="text-[8px] font-mono text-slate-500 group-hover:text-slate-400 transition-colors">MAC {device.mac}</span>
                  </motion.div>
                );
              })}
            </div>
            {!selectedPortId && (
              <p className="mt-4 text-[11px] text-amber-500/90">Select a switch port first to connect a workstation.</p>
            )}
          </GlassCard>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          <GlassCard className="flex flex-col flex-1 h-full min-h-[400px]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h4 className="text-white font-black flex items-center gap-2">
                <Settings size={18} className="text-blue-400" />
                Interface configuration
              </h4>
            </div>

            <div className="flex-1 p-6 relative">
              <AnimatePresence mode="wait">
                {selectedPort ? (
                  <motion.div
                    key={selectedPort.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Selected interface</span>
                        <h2 className="text-2xl font-black text-white">Gi0/{selectedPort.id}</h2>
                        <p className="text-[11px] text-slate-500 mt-1 font-mono">Lab notation: ethernet {selectedPort.labPort}</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shrink-0
                           ${selectedPort.status === 'Up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                      >
                        {selectedPort.status === 'ErrDisable' ? 'Err-disable' : selectedPort.status}
                      </div>
                    </div>

                    {selectedPort.trafficBlocked && selectedPort.status === 'Up' && (
                      <p className="text-[11px] text-amber-400/95 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                        Traffic blocked: a frame arrived from a MAC that could not be learned. The host may still be physically connected; the switch is not forwarding those frames.
                      </p>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-3">
                            <Lock className={`${selectedPort.enabled ? 'text-blue-400' : 'text-slate-600'}`} size={20} />
                            <span className="text-sm font-bold text-slate-300">Port security</span>
                          </div>
                          <span className="text-[10px] text-slate-500 pl-8">Maps to CLI: port security enable (conceptual)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePortSecurity(selectedPort.id)}
                          className={`w-12 h-6 rounded-full relative transition-colors ${selectedPort.enabled ? 'bg-blue-600' : 'bg-slate-800'}`}
                          aria-pressed={selectedPort.enabled}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${selectedPort.enabled ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      <div
                        className={`flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl transition-opacity ${
                          !selectedPort.enabled && 'opacity-50 pointer-events-none'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-3">
                            <RefreshCw className={`${selectedPort.sticky ? 'text-purple-400' : 'text-slate-600'}`} size={20} />
                            <span className="text-sm font-bold text-slate-300">Sticky MAC</span>
                          </div>
                          <span className="text-[10px] text-slate-500 pl-8">Learn and save secure addresses to running config (simplified)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updatePortConfig(selectedPort.id, { sticky: !selectedPort.sticky })}
                          className={`w-12 h-6 rounded-full relative transition-colors ${selectedPort.sticky ? 'bg-purple-600' : 'bg-slate-800'}`}
                          aria-pressed={selectedPort.sticky}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${selectedPort.sticky ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    <div className={`space-y-4 ${!selectedPort.enabled && 'opacity-50 pointer-events-none'}`}>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                          <span>Maximum MAC addresses</span>
                          <span className="text-blue-400">{selectedPort.maxMacs}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={selectedPort.maxMacs}
                          onChange={(e) => updatePortConfig(selectedPort.id, { maxMacs: parseInt(e.target.value, 10) })}
                          className="w-full accent-blue-500"
                        />
                        <p className="text-[10px] text-slate-500">Try 2 for the lab procedure, then connect a third host to observe a violation.</p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-500">Violation action</span>
                        <div className="grid grid-cols-1 gap-2">
                          {(['Shutdown', 'Restrict', 'Protect'] as ViolationAction[]).map((action) => (
                            <div key={action} className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => updatePortConfig(selectedPort.id, { violationAction: action })}
                                className={`py-2 px-3 rounded-lg text-left text-[11px] font-bold border transition-all
                                      ${
                                        selectedPort.violationAction === action
                                          ? 'bg-blue-600 border-blue-400 text-white'
                                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                                      }`}
                              >
                                {action}
                              </button>
                              <span className="text-[10px] text-slate-500 pl-1">{VIOLATION_HELP[action]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        <ClipboardList size={14} />
                        Verification (conceptual CLI)
                      </div>
                      <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">{`switch# show port security\n${verifyTable}`}</pre>
                      <p className="text-[10px] text-slate-600 mt-2">Values reflect this simulator; vendor output layout may differ.</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Observation row (selected port)</p>
                      <div className="overflow-x-auto rounded-lg border border-slate-800">
                        <table className="w-full text-left text-[11px] text-slate-400">
                          <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Port</th>
                              <th className="px-3 py-2">Max MAC</th>
                              <th className="px-3 py-2">Learned</th>
                              <th className="px-3 py-2">Violations</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t border-slate-800">
                              <td className="px-3 py-2 font-mono text-slate-300">{selectedPort.labPort}</td>
                              <td className="px-3 py-2">{selectedPort.maxMacs}</td>
                              <td className="px-3 py-2">{selectedPort.learnedMacs.length}</td>
                              <td className="px-3 py-2">{selectedPort.violations}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex gap-2">
                      <button
                        type="button"
                        onClick={() => resetPort(selectedPort.id)}
                        className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        Reset interface
                      </button>
                      <button
                        type="button"
                        onClick={() => clearSticky(selectedPort.id)}
                        disabled={!selectedPort.sticky}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Clear sticky
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-10">
                    <Shield className="text-slate-800 mb-4" size={64} />
                    <h4 className="text-slate-300 font-bold mb-2 uppercase text-xs tracking-widest">No port selected</h4>
                    <p className="text-slate-600 text-xs leading-relaxed">Choose a port on the front panel to edit security options and read verification output.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </GlassCard>

          <div className="h-64 bg-slate-950 border border-slate-800 rounded-3xl p-6 relative flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert size={14} className="text-slate-500" />
                Event log
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 custom-scrollbar">
              {logs.length === 0 && <div className="text-slate-800 italic">No events yet — enable port security and connect hosts.</div>}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-slate-700 shrink-0">[{log.time}]</span>
                  <span
                    className={`${
                      log.type === 'error' ? 'text-red-400 font-bold' : log.type === 'warn' ? 'text-amber-400' : 'text-blue-400/90'
                    }`}
                  >
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
};
