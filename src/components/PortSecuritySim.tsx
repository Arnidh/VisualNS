import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Monitor, 
  Smartphone, 
  Terminal, 
  Settings, 
  Link as LinkIcon, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  RefreshCw,
  Zap
} from 'lucide-react';
import { GlassCard } from './GlassCard';

type ViolationAction = 'Shutdown' | 'Restrict' | 'Protect';

interface PortConfig {
  id: number;
  enabled: boolean;
  maxMacs: number;
  violationAction: ViolationAction;
  sticky: boolean;
  learnedMacs: string[];
  status: 'Up' | 'Down' | 'ErrDisable';
  violations: number;
  connectedDeviceId: string | null;
}

interface Device {
  id: string;
  name: string;
  mac: string;
  type: 'client' | 'hacker';
  icon: React.ReactNode;
}

const DEVICES: Device[] = [
  { id: 'dev-1', name: 'Workstation-A', mac: '0011.2233.4455', type: 'client', icon: <Monitor size={24} /> },
  { id: 'dev-2', name: 'Authorized-Laptop', mac: '00BB.CCCC.DDDD', type: 'client', icon: <Smartphone size={24} /> },
  { id: 'dev-3', name: 'Rogue-Device-X', mac: 'FFFF.FFFF.FFFF', type: 'hacker', icon: <Terminal size={24} /> },
];

const INITIAL_PORTS: PortConfig[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  enabled: false,
  maxMacs: 1,
  violationAction: 'Shutdown',
  sticky: false,
  learnedMacs: [],
  status: 'Up',
  violations: 0,
  connectedDeviceId: null
}));

export const PortSecuritySim: React.FC = () => {
  const [ports, setPorts] = useState<PortConfig[]>(INITIAL_PORTS);
  const [selectedPortId, setSelectedPortId] = useState<number | null>(null);
  const [logs, setLogs] = useState<{ id: number, time: string, msg: string, type: 'info' | 'warn' | 'error' }[]>([]);

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    setLogs(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      msg,
      type
    }, ...prev].slice(0, 50));
  }, []);

  const selectedPort = ports.find(p => p.id === selectedPortId);

  const togglePortSecurity = (portId: number) => {
    setPorts(prev => prev.map(p => {
      if (p.id === portId) {
        const newState = !p.enabled;
        addLog(`Port Gi0/${portId}: Security ${newState ? 'Enabled' : 'Disabled'}`);
        return { ...p, enabled: newState };
      }
      return p;
    }));
  };

  const updatePortConfig = (portId: number, updates: Partial<PortConfig>) => {
    setPorts(prev => prev.map(p => p.id === portId ? { ...p, ...updates } : p));
  };

  const handleConnect = (portId: number, deviceId: string | null) => {
    setPorts(prev => {
      const newPorts = [...prev];
      const portIdx = newPorts.findIndex(p => p.id === portId);
      const port = { ...newPorts[portIdx] };
      const device = DEVICES.find(d => d.id === deviceId);

      // If already shut down, don't allow connections unless reset
      if (port.status === 'ErrDisable' && deviceId) {
        addLog(`Port Gi0/${portId}: Link rejected. Interface is in Err-Disable state.`, 'error');
        return prev;
      }

      port.connectedDeviceId = deviceId;

      if (deviceId && device && port.enabled) {
        const isLearned = port.learnedMacs.includes(device.mac);
        
        if (!isLearned && port.learnedMacs.length >= port.maxMacs) {
          // VIOLATION!
          addLog(`Port Gi0/${portId}: SECURITY VIOLATION! Unauthorized MAC ${device.mac} detected.`, 'error');
          port.violations += 1;

          if (port.violationAction === 'Shutdown') {
            port.status = 'ErrDisable';
            addLog(`Port Gi0/${portId}: Interface transitioned to Administrative Down (Err-Disable).`, 'error');
          } else if (port.violationAction === 'Restrict') {
            addLog(`Port Gi0/${portId}: Traffic dropped. SNMP trap sent. Violation counter incremented.`, 'warn');
          } else if (port.violationAction === 'Protect') {
            // Silently drop - no specific log besides the violation one above in high-fidelity sims usually, but let's be descriptive
            addLog(`Port Gi0/${portId}: Traffic dropped silently.`, 'info');
          }
        } else if (!isLearned) {
           // Learn it if space available
           if (port.sticky) {
              port.learnedMacs = [...port.learnedMacs, device.mac];
              addLog(`Port Gi0/${portId}: Learned Sticky MAC ${device.mac}. Saved to config.`);
           } else {
              // In non-sticky mode, typically it's dynamic
              addLog(`Port Gi0/${portId}: Authorized MAC ${device.mac} connected.`);
           }
        } else {
           addLog(`Port Gi0/${portId}: Secure MAC ${device.mac} connected.`);
        }
      } else if (deviceId && device && !port.enabled) {
        addLog(`Port Gi0/${portId}: Link Up. MAC ${device.mac} detected (Security Disabled).`);
      } else if (!deviceId) {
        addLog(`Port Gi0/${portId}: Link Down.`);
      }

      newPorts[portIdx] = port;
      return newPorts;
    });
  };

  const resetPort = (portId: number) => {
    setPorts(prev => prev.map(p => p.id === portId ? { ...p, status: 'Up', violations: 0, connectedDeviceId: null } : p));
    addLog(`Port Gi0/${portId}: Interface reset manually. Status: UP.`);
  };

  const clearSticky = (portId: number) => {
    setPorts(prev => prev.map(p => p.id === portId ? { ...p, learnedMacs: [] } : p));
    addLog(`Port Gi0/${portId}: Sticky MAC table cleared.`);
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Left: THE SWITCH UI */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <GlassCard className="relative overflow-hidden bg-slate-950/40 border-slate-800">
             <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
             
             <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                      <Zap className="text-blue-400" />
                      VisualSwitch 24-Port (Core-Edge)
                    </h3>
                    <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.3em] font-bold mt-1">
                      GigabitLayer-2 Security Fabric
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Active</span>
                    </div>
                  </div>
                </div>

                {/* THE PORTS GRID */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl relative">
                  <div className="grid grid-cols-4 gap-8">
                    {ports.map(port => {
                      const device = DEVICES.find(d => d.id === port.connectedDeviceId);
                      const isSelected = selectedPortId === port.id;
                      const isViolation = port.status === 'ErrDisable';

                      return (
                        <div key={port.id} className="flex flex-col items-center gap-4">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedPortId(port.id)}
                            className={`w-16 h-16 rounded-xl border-4 transition-all relative flex items-center justify-center
                              ${isSelected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'border-slate-800'}
                              ${isViolation ? 'bg-red-900/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 
                                port.connectedDeviceId ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-950'}`}
                          >
                            <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full
                              ${isViolation ? 'bg-red-500' : port.connectedDeviceId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-800'}`} />
                            
                            {device ? (
                              <div className={port.status === 'ErrDisable' ? 'text-red-400' : 'text-emerald-400'}>
                                {device.icon}
                              </div>
                            ) : (
                              <LinkIcon className="text-slate-800" size={20} />
                            )}

                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-900 px-2 rounded-full border border-slate-800 text-[8px] font-bold text-slate-500">
                               Gi0/{port.id}
                            </span>
                          </motion.button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Visual Chassis Decorations */}
                  <div className="absolute top-4 left-4 p-2 bg-slate-800/50 rounded-lg text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                    Chassis ID: VS-2026-X8
                  </div>
                </div>
             </div>
          </GlassCard>

          {/* Device Tray */}
          <GlassCard className="p-6 !bg-slate-900/40">
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
               Connectable Devices <span className="text-slate-700 text-[8px]">(Drag to Port simulation)</span>
             </h4>
             <div className="flex gap-4">
                {DEVICES.map(device => {
                  const isConnected = ports.some(p => p.connectedDeviceId === device.id);
                  return (
                    <motion.div
                      key={device.id}
                      whileHover={{ scale: 1.05 }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer group flex-1
                        ${isConnected ? 'bg-slate-900 border-slate-800 opacity-30 grayscale' : 
                          device.type === 'hacker' ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10' : 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10'}`}
                      onClick={() => {
                        if (selectedPortId && !isConnected) {
                          handleConnect(selectedPortId, device.id);
                        } else if (isConnected) {
                           // Find the port it's on and disconnect
                           const p = ports.find(p => p.connectedDeviceId === device.id);
                           if (p) handleConnect(p.id, null);
                        }
                      }}
                    >
                       <div className={`p-4 rounded-xl shadow-lg transition-transform group-hover:-translate-y-1
                         ${device.type === 'hacker' ? 'bg-red-500/20 border border-red-500/30 text-red-400' : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'}`}>
                          {device.icon}
                       </div>
                       <span className={`text-[10px] font-black uppercase text-center ${isConnected ? 'text-slate-600' : 'text-slate-300'}`}>
                          {device.name}
                       </span>
                       <span className="text-[8px] font-mono text-slate-500 group-hover:text-slate-400 transition-colors">
                          MAC: {device.mac}
                       </span>
                    </motion.div>
                  );
                })}
             </div>
          </GlassCard>
        </div>

        {/* Right: CONFIG & LOGS */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          {/* Port Settings */}
          <GlassCard className="flex flex-col flex-1 h-full min-h-[400px]">
             <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h4 className="text-white font-black flex items-center gap-2">
                  <Settings size={18} className="text-blue-400" />
                  Interface Configuration
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
                      {/* Port Header Info */}
                      <div className="flex justify-between items-start">
                         <div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Selected Port</span>
                            <h2 className="text-3xl font-black text-white">Gi0/{selectedPort.id}</h2>
                         </div>
                         <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest
                           ${selectedPort.status === 'Up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {selectedPort.status}
                         </div>
                      </div>

                      {/* Toggles */}
                      <div className="space-y-3">
                         <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">
                            <div className="flex items-center gap-3">
                               <Lock className={`${selectedPort.enabled ? 'text-blue-400' : 'text-slate-600'}`} size={20} />
                               <span className="text-sm font-bold text-slate-300">Port Security</span>
                            </div>
                            <button 
                              onClick={() => togglePortSecurity(selectedPort.id)}
                              className={`w-12 h-6 rounded-full relative transition-colors ${selectedPort.enabled ? 'bg-blue-600' : 'bg-slate-800'}`}
                            >
                               <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${selectedPort.enabled ? 'right-1' : 'left-1'}`} />
                            </button>
                         </div>

                         <div className={`flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl transition-opacity ${!selectedPort.enabled && 'opacity-50 pointer-events-none'}`}>
                            <div className="flex items-center gap-3">
                               <RefreshCw className={`${selectedPort.sticky ? 'text-purple-400' : 'text-slate-600'}`} size={20} />
                               <span className="text-sm font-bold text-slate-300">Sticky MAC</span>
                            </div>
                            <button 
                              onClick={() => updatePortConfig(selectedPort.id, { sticky: !selectedPort.sticky })}
                              className={`w-12 h-6 rounded-full relative transition-colors ${selectedPort.sticky ? 'bg-purple-600' : 'bg-slate-800'}`}
                            >
                               <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${selectedPort.sticky ? 'right-1' : 'left-1'}`} />
                            </button>
                         </div>
                      </div>

                      <div className={`space-y-4 ${!selectedPort.enabled && 'opacity-50 pointer-events-none'}`}>
                          {/* Range Input for Max MACs */}
                          <div className="space-y-2">
                             <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                                <span>Max MAC Addresses</span>
                                <span className="text-blue-400">{selectedPort.maxMacs}</span>
                             </div>
                             <input 
                               type="range" min="1" max="5" 
                               value={selectedPort.maxMacs}
                               onChange={(e) => updatePortConfig(selectedPort.id, { maxMacs: parseInt(e.target.value) })}
                               className="w-full accent-blue-500"
                             />
                          </div>

                          {/* Mode Select */}
                          <div className="space-y-2">
                             <span className="text-[10px] font-black uppercase text-slate-500">Violation Action</span>
                             <div className="grid grid-cols-3 gap-2">
                                {(['Shutdown', 'Restrict', 'Protect'] as ViolationAction[]).map(action => (
                                  <button
                                    key={action}
                                    onClick={() => updatePortConfig(selectedPort.id, { violationAction: action })}
                                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter border transition-all
                                      ${selectedPort.violationAction === action ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                  >
                                    {action}
                                  </button>
                                ))}
                             </div>
                          </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800 flex gap-2">
                         <button 
                           onClick={() => resetPort(selectedPort.id)}
                           className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                         >
                           Reset Interface
                         </button>
                         <button 
                           onClick={() => clearSticky(selectedPort.id)}
                           className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                         >
                           Clear Sticky
                         </button>
                      </div>

                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-10">
                       <Shield className="text-slate-800 mb-4" size={64} />
                       <h4 className="text-slate-300 font-bold mb-2 uppercase text-xs tracking-widest">No Port Selected</h4>
                       <p className="text-slate-600 text-xs leading-relaxed">
                          Click any physical port on the switch chassis to inspect its active running-config and security state.
                       </p>
                    </div>
                  )}
                </AnimatePresence>
             </div>
          </GlassCard>

          {/* Security Log Console */}
          <div className="h-64 bg-slate-950 border border-slate-800 rounded-3xl p-6 relative flex flex-col">
             <div className="flex justify-between items-center mb-4">
               <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                 <ShieldAlert size={14} className="text-slate-500" />
                 Global Security Log (SNMP-v3)
               </h4>
             </div>
             <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 custom-scrollbar">
                {logs.length === 0 && <div className="text-slate-800 italic">Listening for system messages...</div>}
                {logs.map(log => (
                  <div key={log.id} className="flex gap-3 animate-in slide-in-from-left duration-300">
                    <span className="text-slate-700 shrink-0">[{log.time}]</span>
                    <span className={`
                      ${log.type === 'error' ? 'text-red-400 font-bold' : 
                        log.type === 'warn' ? 'text-amber-400' : 'text-blue-400 opacity-80'}
                    `}>
                      %SEC-6-PORT_SECURITY: {log.msg}
                    </span>
                  </div>
                ))}
             </div>
             
             {/* Console Glow */}
             <div className="absolute inset-0 bg-blue-500/5 pointer-events-none rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
};
