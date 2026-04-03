import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Cpu, Zap, X, ArrowRight, Repeat, Send, Box, Play } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';

const INITIAL_NODES = {
  A: { id: 'A', x: 150, y: 350, name: 'Router A', ipv6: 'fe80::1a' },
  B: { id: 'B', x: 450, y: 200, name: 'Router B', ipv6: 'fe80::2b' },
  C: { id: 'C', x: 750, y: 350, name: 'Router C', ipv6: 'fe80::3c' },
  D: { id: 'D', x: 450, y: 500, name: 'Router D', ipv6: 'fe80::4d' }
} as Record<string, { id: string, x: number, y: number, name: string, ipv6: string }>;

const INITIAL_LINKS = [
  { id: 'A-B', source: 'A', target: 'B' },
  { id: 'B-C', source: 'B', target: 'C' },
  { id: 'C-D', source: 'C', target: 'D' },
  { id: 'D-A', source: 'D', target: 'A' },
  { id: 'B-D', source: 'B', target: 'D' },
];

const CONTROLLER = { x: 450, y: 40 };

export const RoutingModule: React.FC = () => {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [links, setLinks] = useState(INITIAL_LINKS);
  
  const [isSdnMode, setIsSdnMode] = useState(false);
  const [brokenLinks, setBrokenLinks] = useState<Set<string>>(new Set());
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  
  const [animatingPackets, setAnimatingPackets] = useState<any[]>([]);
  const [routingUpdates, setRoutingUpdates] = useState<any[]>([]);
  
  const [modalNode, setModalNode] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string>("Ready. Select a Source and Destination to transmit data.");

  const getShortestPath = (start: string, end: string) => {
    const queue = [[start]];
    const visited = new Set([start]);
    while (queue.length > 0) {
      const path = queue.shift()!;
      const node = path[path.length - 1];
      if (node === end) return path;

      for (const link of links) {
        if (brokenLinks.has(link.id)) continue;
        const neighbor = link.source === node ? link.target : (link.target === node ? link.source : null);
        if (neighbor && !visited.has(neighbor) && nodes[neighbor]) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return null;
  };

  const getTableData = (nodeId: string) => {
    const table: any[] = [];
    Object.keys(nodes).forEach(dest => {
      if (dest !== nodeId) {
        const path = getShortestPath(nodeId, dest);
        if (path && path.length > 1) {
            table.push({ dest, nextHop: path[1], cost: path.length - 1 });
        } else {
            table.push({ dest, nextHop: 'Unreachable', cost: '∞' });
        }
      }
    });
    return table;
  };

  const triggerUpdates = () => {
    if (isSdnMode) return;
    const updates: any[] = [];
    const timestamp = Date.now();
    links.forEach(link => {
      if (!brokenLinks.has(link.id) && nodes[link.source] && nodes[link.target]) {
        updates.push({ id: `upd-${link.id}-1-${timestamp}`, from: link.source, to: link.target });
        updates.push({ id: `upd-${link.id}-2-${timestamp}`, from: link.target, to: link.source });
      }
    });
    setRoutingUpdates(updates);
    setTimeout(() => setRoutingUpdates([]), 2000);
  };

  useEffect(() => {
    triggerUpdates();
  }, [brokenLinks, isSdnMode, links, nodes]);

  const toggleLink = (id: string) => {
    const newBroken = new Set(brokenLinks);
    if (newBroken.has(id)) newBroken.delete(id);
    else newBroken.add(id);
    setBrokenLinks(newBroken);
  };

  const addRouter = () => {
    const id = String.fromCharCode(65 + Object.keys(nodes).length);
    const x = Math.random() * 600 + 100;
    const y = Math.random() * 400 + 100;
    const newNode = { id, x, y, name: `Router ${id}`, ipv6: `fe80::${id.toLowerCase()}${id.toLowerCase()}` };
    
    // Connect to at least one random existing node
    const keys = Object.keys(nodes);
    let targetId = null;
    if(keys.length > 0) {
      targetId = keys[Math.floor(Math.random() * keys.length)];
    }
    
    setNodes(prev => ({ ...prev, [id]: newNode }));
    if(targetId) {
      setLinks(prev => [...prev, { id: `${id}-${targetId}`, source: id, target: targetId }]);
    }
  };

  const removeNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedSrc === nodeId) setSelectedSrc(null);
    if (selectedDest === nodeId) setSelectedDest(null);

    setLinks(prev => prev.filter(l => l.source !== nodeId && l.target !== nodeId));
    setNodes(prev => {
      const copy = { ...prev };
      delete copy[nodeId];
      return copy;
    });
  };

  const handleSend = async () => {
    if (!selectedSrc || !selectedDest || selectedSrc === selectedDest) return;
    const path = getShortestPath(selectedSrc, selectedDest);
    
    if (!path) {
        setInfoMessage("Transmission Failed: No path available due to broken links or missing routers.");
        return;
    }

    if (isSdnMode) {
        // Phase 1: Packet-In
        setInfoMessage("SDN Control Plane: Packet-In event. The ingress switch doesn't know this destination yet. It queries the centralized SDN Controller.");
        const pktInId = `pkt-${Date.now()}-in`;
        setAnimatingPackets(prev => [...prev, { id: pktInId, type: 'control', fromCoord: nodes[selectedSrc], toCoord: CONTROLLER, label: 'Packet-In' }]);
        await new Promise(r => setTimeout(r, 2000));
        setAnimatingPackets(prev => prev.filter(p => p.id !== pktInId));

        // Phase 2: Flow-Mod
        setInfoMessage("SDN Control Plane: Flow-Mod sent. The controller calculates the shortest path globally and programs the forwarding rules into the switches.");
        const fmods = path.map((node, i) => ({
            id: `fmod-${Date.now()}-${i}`, type: 'control', fromCoord: CONTROLLER, toCoord: nodes[node], label: 'Flow-Mod'
        }));
        setAnimatingPackets(prev => [...prev, ...fmods]);
        await new Promise(r => setTimeout(r, 2000));
        setAnimatingPackets(prev => prev.filter(p => !fmods.includes(p)));
    } else {
        setInfoMessage("Traditional Routing Step: Distance vectors establish tables. Nodes only know their immediate next hop, not the full path.");
        await new Promise(r => setTimeout(r, 1000));
    }

    // Phase 3: Data transmission
    setInfoMessage("Data Plane: Payload forwarding. The switches/routers inspect the packet's destination IPv6 and pass it hop-by-hop down the calculated path.");
    for (let i = 0; i < path.length - 1; i++) {
        const hopId = `data-${Date.now()}-${i}`;
        setAnimatingPackets(prev => [...prev, { id: hopId, type: 'data', fromCoord: nodes[path[i]], toCoord: nodes[path[i+1]], label: 'Data (IPv6)' }]);
        await new Promise(r => setTimeout(r, 1000));
        setAnimatingPackets(prev => prev.filter(p => p.id !== hopId));
    }
    
    setInfoMessage("Transmission Complete! The data successfully reached the destination.");
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-float relative w-full">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">Routing & SDN</h1>
          <p className="text-slate-400">Visualize Forwarding vs. Routing and Control Plane logic.</p>
        </div>
        <div className="flex gap-4 items-center">
            <span className="text-sm font-mono font-bold text-slate-500 uppercase">Mode:</span>
            <button 
                onClick={() => { setIsSdnMode(false); setBrokenLinks(new Set([])); }}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${!isSdnMode ? 'bg-blue-500 text-white shadow-[0_0_15px_#3b82f688]' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
            >
                Traditional
            </button>
            <button 
                onClick={() => { setIsSdnMode(true); setBrokenLinks(new Set([])); }}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${isSdnMode ? 'bg-amber-500 text-white shadow-[0_0_15px_#f59e0b88]' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
            >
                SDN Mode
            </button>
        </div>
      </header>

      <div className="flex gap-6 relative flex-1">
        {/* Graph Canvas */}
        <div className="flex-1 rounded-xl bg-obsidian border border-slate-700/50 relative overflow-hidden backdrop-blur-sm">
            
            {/* SDN Controller Node */}
            <AnimatePresence>
                {isSdnMode && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
                        className="absolute flex flex-col items-center"
                        style={{ left: CONTROLLER.x - 40, top: CONTROLLER.y - 30 }}
                    >
                        <div className="w-20 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)] border border-amber-300">
                            <Cpu size={32} className="text-white" />
                        </div>
                        <div className="mt-2 text-xs font-bold text-amber-400 tracking-widest uppercase">SDN Controller</div>
                    </motion.div>
                )}
            </AnimatePresence>

            <svg className="w-full h-full absolute inset-0 pointer-events-none z-0">
               {/* SDN Southbound API Lines */}
               <AnimatePresence>
                   {isSdnMode && Object.values(nodes).map(node => (
                       <motion.line 
                          key={`sdn-${node.id}`}
                          initial={{ pathLength: 0, opacity: 0 }} 
                          animate={{ pathLength: 1, opacity: 0.4 }} 
                          exit={{ opacity: 0 }}
                          x1={CONTROLLER.x} y1={CONTROLLER.y} x2={node.x} y2={node.y}
                          stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,5"
                       />
                   ))}
               </AnimatePresence>

               {/* Traditional Links */}
               {links.map(link => {
                   const source = nodes[link.source];
                   const target = nodes[link.target];
                   if(!source || !target) return null;
                   const isBroken = brokenLinks.has(link.id);
                   return (
                       <g key={link.id} className="pointer-events-auto cursor-pointer" onClick={() => toggleLink(link.id)}>
                           <line 
                              x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                              stroke={isBroken ? '#ef4444' : '#334155'} strokeWidth={isBroken ? 2 : 4} strokeDasharray={isBroken ? '5,5' : '0'}
                              className="transition-all duration-300"
                           />
                           {!isBroken && (
                               <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="transparent" strokeWidth="20" />
                           )}
                           {isBroken && (
                               <g style={{ transform: `translate(${(source.x + target.x) / 2}px, ${(source.y + target.y) / 2}px)`}}>
                                   <circle r="12" fill="#ef4444" />
                                   <line x1="-5" y1="-5" x2="5" y2="5" stroke="white" strokeWidth="2" />
                                   <line x1="-5" y1="5" x2="5" y2="-5" stroke="white" strokeWidth="2" />
                               </g>
                           )}
                       </g>
                   );
               })}
               
               {/* Routing Update Animating Packets (Traditional Mode) */}
               {routingUpdates.map(upd => {
                   const start = nodes[upd.from];
                   const end = nodes[upd.to];
                   if(!start || !end) return null;
                   return (
                       <motion.circle 
                          key={upd.id} r="4" fill="#f59e0b" filter="drop-shadow(0 0 5px #f59e0b)"
                          initial={{ cx: start.x, cy: start.y, opacity: 1 }}
                          animate={{ cx: end.x, cy: end.y, opacity: 0 }}
                          transition={{ duration: 1.5, ease: "linear" }}
                       />
                   );
               })}
            </svg>

            {/* Custom Interactive Packets Layer */}
            {animatingPackets.map(pkt => (
                <motion.div
                    key={pkt.id}
                    initial={{ left: pkt.fromCoord.x, top: pkt.fromCoord.y, scale: 0.5, opacity: 0 }}
                    animate={{ left: pkt.toCoord.x, top: pkt.toCoord.y, scale: 1, opacity: 1 }}
                    transition={{ duration: 1, ease: 'easeInOut' }}
                    className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center z-20 shadow-[0_0_20px_rgba(255,255,255,0.5)] ${pkt.type === 'control' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}
                >
                    <Send size={14} />
                    <span className={`absolute -top-6 whitespace-nowrap text-[10px] font-bold px-1 rounded ${pkt.type === 'control' ? 'text-amber-300 bg-amber-900/50' : 'text-blue-300 bg-blue-900/50'}`}>{pkt.label}</span>
                </motion.div>
            ))}

            {/* Nodes */}
            {Object.values(nodes).map(node => {
                const isSrc = selectedSrc === node.id;
                const isDest = selectedDest === node.id;
                const isSwitch = isSdnMode;
                return (
                    <div 
                        key={node.id}
                        className={`absolute w-16 h-16 -ml-8 -mt-8 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer transition-all z-10 ${
                            isSrc ? 'border-emerald-400 bg-emerald-900/40 shadow-[0_0_30px_#34d39966]' :
                            isDest ? 'border-purple-400 bg-purple-900/40 shadow-[0_0_30px_#c084fc66]' :
                            isSwitch ? 'border-slate-500 bg-slate-800' : 'border-blue-500 bg-blue-900/40'
                        }`}
                        style={{ left: node.x, top: node.y }}
                        onClick={() => {
                            if (!selectedSrc) setSelectedSrc(node.id);
                            else if (selectedSrc === node.id) setSelectedSrc(null);
                            else if (!selectedDest) setSelectedDest(node.id);
                            else if (selectedDest === node.id) setSelectedDest(null);
                            else { setSelectedSrc(node.id); setSelectedDest(null); }
                        }}
                        onDoubleClick={() => setModalNode(node.id)}
                        title="Double Click to inspect"
                    >
                        {/* Remove router button */}
                        <button 
                             onClick={(e) => removeNode(node.id, e)} 
                             className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 hover:opacity-100 hover:scale-110 transition-all z-20 group-hover:opacity-100"
                        >
                            <X size={12}/>
                        </button>

                        {isSwitch ? <Box className="text-slate-300" size={24} /> : <Network className={isSrc ? "text-emerald-400" : isDest ? "text-purple-400" : "text-blue-400"} size={28} />}
                        
                        <div className="absolute top-[110%] w-max text-center">
                            <div className="font-bold text-sm text-slate-200">{node.name} {isSwitch && '(Switch)'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{node.ipv6}</div>
                        </div>

                        {/* Hover Overlay Table */}
                        <div className="absolute top-[-10px] left-20 w-44 opacity-0 hover:opacity-100 transition-opacity bg-slate-900/90 border border-slate-700 p-2 rounded-lg pointer-events-none z-50 backdrop-blur-md">
                            <div className="text-[10px] font-bold text-blue-400 mb-1 border-b border-slate-700 pb-1">{isSdnMode ? 'Flow Table' : 'Forwarding Table'}</div>
                            {getTableData(node.id).map(r => (
                                <div key={r.dest} className="flex justify-between text-[10px] font-mono text-slate-300 mb-1">
                                    <span>Dest: {r.dest}</span>
                                    {isSdnMode ? (
                                        <span className="text-emerald-400">fwd({r.nextHop})</span>
                                    ) : (
                                        <span className="text-slate-400">Hop: {r.nextHop} (Cost: {r.cost})</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Instruction overlay corner */}
            <div className="absolute bottom-4 left-4 p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl backdrop-blur-md text-xs text-slate-300 max-w-xs leading-relaxed">
                <div className="text-blue-400 font-bold text-sm mb-2 flex items-center gap-2"><Zap size={14}/> Interactions</div>
                <ul className="space-y-1 list-disc pl-4 text-slate-400">
                    <li><b>Click links</b> to simulate failures (lightning bolt). Watch {isSdnMode ? 'the controller repopulate' : 'routing tables recalculate'}.</li>
                    <li><b>Double-click routers</b> to peek inside the switching fabric.</li>
                    <li><b>Select Source & Target</b> on the panel to animate data.</li>
                </ul>
            </div>
        </div>

        {/* Right Sidebar Control Panel */}
        <GlassCard className="w-80 flex flex-col p-6 h-full border-blue-500/20 shadow-[-10px_0_30px_rgba(59,130,246,0.05)] relative overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">Transmission Controller</h3>
            
            <div className="mb-6 space-y-4">
                <div>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Source Node</label>
                    <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-emerald-400 font-bold flex justify-between items-center">
                        {selectedSrc && nodes[selectedSrc] ? nodes[selectedSrc].name : <span className="text-slate-600 font-normal">Click a node...</span>}
                        {selectedSrc && <button onClick={() => setSelectedSrc(null)}><X size={16} className="text-slate-500 hover:text-red-400"/></button>}
                    </div>
                </div>

                <div className="flex justify-center -my-2"><ArrowRight className="text-slate-600 rotate-90"/></div>

                <div>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Destination Node</label>
                    <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-purple-400 font-bold flex justify-between items-center">
                        {selectedDest && nodes[selectedDest] ? nodes[selectedDest].name : <span className="text-slate-600 font-normal">Click a node...</span>}
                        {selectedDest && <button onClick={() => setSelectedDest(null)}><X size={16} className="text-slate-500 hover:text-red-400"/></button>}
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <button 
                    disabled={!selectedSrc || !selectedDest}
                    onClick={handleSend}
                    className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wide transition-all disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:shadow-none"
                >
                    <Play size={20} /> SEND
                </button>
            </div>
            
            <button 
                onClick={addRouter}
                className="mt-4 w-full py-2 border border-blue-500/30 text-blue-400 rounded-lg font-bold hover:bg-blue-900/30 transition shadow-sm"
            >
                + Add Dynamic Router
            </button>

            {/* Explanation Log Panel */}
            <div className="mt-8 relative flex-1 flex flex-col">
                <div className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-lg -z-10"></div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b border-slate-800 pb-2">Status & Info</h4>
                <div className="p-3 text-sm text-slate-300 leading-relaxed overflow-y-auto">
                    {infoMessage}
                </div>
            </div>
        </GlassCard>
      </div>

      {/* "Inside the Router" Modal overlay */}
      <AnimatePresence>
          {modalNode && (
              <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8"
              >
                  <motion.div 
                      initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                      className="bg-obsidian border border-slate-700/50 rounded-2xl w-full max-w-4xl p-8 relative shadow-[0_0_50px_rgba(59,130,246,0.1)]"
                  >
                      <button onClick={() => setModalNode(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24}/></button>
                      
                      <div className="mb-8">
                          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">Inside {nodes[modalNode] ? nodes[modalNode].name : 'Router'}</h2>
                          <p className="text-slate-400">The journey of a packet: Input Port → Switching Fabric → Output Port (Line-card processing).</p>
                      </div>

                      <div className="h-64 border border-slate-800 rounded-xl bg-slate-900/50 relative overflow-hidden flex items-center justify-between px-16">
                          <div className="w-24 h-40 bg-slate-800 border-2 border-slate-600 rounded-lg flex flex-col items-center justify-center text-center p-2 relative z-10">
                              <span className="text-xs font-bold text-slate-300 uppercase mb-2">Input Port</span>
                              <div className="text-[8px] text-slate-500">Physical Layer Rev.<br/>Data Link Extraction <br/>Lookup Forwarding</div>
                          </div>
                          
                          <div className="flex-1 max-w-sm h-48 border border-blue-500/30 rounded-full flex items-center justify-center bg-blue-900/10 shadow-[inset_0_0_50px_rgba(59,130,246,0.05)] relative z-10">
                              <span className="text-xl font-black tracking-widest text-blue-500/30 uppercase">Switching Fabric</span>
                              <motion.div 
                                  animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                                  className="absolute inset-4 border border-dashed border-blue-500/20 rounded-full"
                              ></motion.div>
                              <Repeat className="absolute text-blue-500/50 opacity-50" size={64}/>
                          </div>

                          <div className="w-24 h-40 bg-slate-800 border-2 border-slate-600 rounded-lg flex flex-col items-center justify-center text-center p-2 relative z-10">
                              <span className="text-xs font-bold text-slate-300 uppercase mb-2">Output Port</span>
                              <div className="text-[8px] text-slate-500">Queue Management<br/>Data Link Encapsulation<br/>Line Transmission</div>
                          </div>

                          {/* Animated flow path */}
                          <div className="absolute inset-0 z-0 pointer-events-none">
                              <svg className="w-full h-full">
                                  <motion.line x1="200" y1="128" x2="350" y2="128" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" animate={{ strokeDashoffset: [-20, 0] }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
                                  <motion.line x1="500" y1="128" x2="650" y2="128" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" animate={{ strokeDashoffset: [-20, 0] }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
                                  <motion.circle r="6" fill="#10b981" initial={{ cx: 160, cy: 128 }} animate={{ cx: [160, 200, 420, 650, 700], opacity: [0, 1, 1, 1, 0] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.1, 0.5, 0.9, 1] }} />
                              </svg>
                          </div>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
