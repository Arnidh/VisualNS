import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'framer-motion';
import { GlassCard } from '../components/GlassCard';
import { TcpStateDiagram } from '../components/TcpStateDiagram';
import { RootState } from '../store';
import { setClientState, setServerState, resetTcp, Packet } from '../store/tcpSlice';
import { MousePointer2, ArrowDownCircle } from 'lucide-react';

export const TcpModule: React.FC = () => {
  const dispatch = useDispatch();
  const { clientState, serverState, clientBuffer, serverBuffer } = useSelector((state: RootState) => state.tcp as any);
  
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollContainerRef.current = document.querySelector('main');
  }, []);

  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Update states via MotionValue Event
  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (latest < 0.1) {
      if (clientState !== 'CLOSED') dispatch(resetTcp());
    } else if (latest >= 0.1 && latest < 0.22) {
      if (clientState !== 'SYN_SENT') {
        dispatch(setClientState('SYN_SENT'));
        dispatch(setServerState('LISTEN'));
      }
    } else if (latest >= 0.22 && latest < 0.33) {
      if (serverState !== 'SYN_RCVD') dispatch(setServerState('SYN_RCVD'));
    } else if (latest >= 0.33 && latest < 0.5) {
      if (clientState !== 'ESTABLISHED') {
          dispatch(setClientState('ESTABLISHED'));
          dispatch(setServerState('ESTABLISHED'));
      }
    } else if (latest >= 0.5 && latest < 0.6) {
      if (clientState !== 'FIN_WAIT_1') {
          dispatch(setClientState('FIN_WAIT_1'));
          dispatch(setServerState('ESTABLISHED'));
      }
    } else if (latest >= 0.6 && latest < 0.7) {
      if (clientState !== 'FIN_WAIT_2') {
          dispatch(setClientState('FIN_WAIT_2'));
          dispatch(setServerState('CLOSE_WAIT'));
      }
    } else if (latest >= 0.7 && latest < 0.85) {
      if (serverState !== 'LAST_ACK') {
          dispatch(setClientState('TIME_WAIT'));
          dispatch(setServerState('LAST_ACK'));
      }
    } else if (latest >= 0.85) {
      if (clientState !== 'CLOSED' && latest > 0.9) {
          dispatch(setClientState('CLOSED'));
          dispatch(setServerState('CLOSED'));
      }
    }
  });

  // Packet movement driven by scroll
  const synX = useTransform(smoothProgress, [0.12, 0.2], ["20%", "80%"]);
  const synOpacity = useTransform(smoothProgress, [0.1, 0.12, 0.2, 0.22], [0, 1, 1, 0]);

  const synAckX = useTransform(smoothProgress, [0.23, 0.31], ["80%", "20%"]);
  const synAckOpacity = useTransform(smoothProgress, [0.21, 0.23, 0.31, 0.33], [0, 1, 1, 0]);

  const ackX = useTransform(smoothProgress, [0.34, 0.42], ["20%", "80%"]);
  const ackOpacity = useTransform(smoothProgress, [0.32, 0.34, 0.42, 0.44], [0, 1, 1, 0]);

  const dataX = useTransform(smoothProgress, [0.45, 0.53], ["20%", "80%"]);
  const dataOpacity = useTransform(smoothProgress, [0.43, 0.45, 0.53, 0.55], [0, 1, 1, 0]);

  const fin1X = useTransform(smoothProgress, [0.55, 0.63], ["20%", "80%"]);
  const fin1Opacity = useTransform(smoothProgress, [0.53, 0.55, 0.63, 0.65], [0, 1, 1, 0]);

  const ackFin1X = useTransform(smoothProgress, [0.65, 0.73], ["80%", "20%"]);
  const ackFin1Opacity = useTransform(smoothProgress, [0.63, 0.65, 0.73, 0.75], [0, 1, 1, 0]);

  const fin2X = useTransform(smoothProgress, [0.75, 0.83], ["80%", "20%"]);
  const fin2Opacity = useTransform(smoothProgress, [0.73, 0.75, 0.83, 0.85], [0, 1, 1, 0]);

  const ackFin2X = useTransform(smoothProgress, [0.85, 0.93], ["20%", "80%"]);
  const ackFin2Opacity = useTransform(smoothProgress, [0.83, 0.85, 0.93, 0.95], [0, 1, 1, 0]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* THE STICKY VISUALIZATION LAYER */}
      <div className="sticky top-0 h-screen w-full flex overflow-hidden pointer-events-none">
        
        {/* Left Sidebar: State Machine Diagram */}
        <div className="w-[480px] h-full p-8 flex flex-col justify-center border-r border-slate-700/30 bg-obsidian/20 backdrop-blur-sm pointer-events-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400">
               State Transition Diagram
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">Real-time Lifecycle tracking</p>
          </div>
          
          <TcpStateDiagram currentState={clientState} />

          <div className="mt-auto grid grid-cols-2 gap-4">
            <GlassCard className="!p-3 border-blue-500/20">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Client</div>
                <div className="text-sm font-mono text-blue-300">{clientState}</div>
            </GlassCard>
            <GlassCard className="!p-3 border-purple-500/20">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Server</div>
                <div className="text-sm font-mono text-purple-300">{serverState}</div>
            </GlassCard>
          </div>
        </div>

        {/* Center: Network Simulation */}
        <div className="flex-1 relative bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent_70%)] pointer-events-auto">
            {/* Headers */}
            <div className="flex justify-between items-center px-16 py-10">
              <div className="flex flex-col">
                <span className="font-black text-3xl text-blue-300 drop-shadow-[0_0_15px_rgba(147,197,253,0.4)]">Client</span>
                <span className="text-xs text-blue-500/70 font-mono uppercase tracking-[0.2em] font-bold mt-1">Initiator</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-black text-3xl text-purple-300 drop-shadow-[0_0_15px_rgba(216,180,254,0.4)]">Server</span>
                <span className="text-xs text-purple-500/70 font-mono uppercase tracking-[0.2em] font-bold mt-1">Target</span>
              </div>
            </div>

            {/* Visual Lifelines */}
            <div className="absolute left-[20%] top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-blue-500/10 to-blue-500/0"></div>
            <div className="absolute right-[20%] top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/40 via-purple-500/10 to-purple-500/0"></div>

            {/* Buffers */}
            <div className="absolute left-[8%] top-[30%] w-32 h-64 glass-panel border-blue-500/20 shadow-blue-500/5 bg-blue-500/5 flex flex-col items-center p-2 gap-2 overflow-hidden">
                <div className="text-[8px] text-blue-400 font-bold uppercase tracking-widest border-b border-blue-500/20 w-full text-center pb-1">Client Buffer</div>
                <div className="flex-1 w-full flex flex-col-reverse gap-1">
                    {clientBuffer.slice(-8).map((pkt: Packet) => (
                        <div key={pkt.id} className="w-full h-6 bg-blue-500/20 border border-blue-500/40 rounded flex items-center justify-center text-[8px] font-bold text-blue-200">
                             {pkt.type} [{pkt.size}B]
                        </div>
                    ))}
                </div>
            </div>

            <div className="absolute right-[8%] top-[30%] w-32 h-64 glass-panel border-purple-500/20 shadow-purple-500/5 bg-purple-500/5 flex flex-col items-center p-2 gap-2 overflow-hidden">
                <div className="text-[8px] text-purple-400 font-bold uppercase tracking-widest border-b border-purple-500/20 w-full text-center pb-1">Server Buffer</div>
                <div className="flex-1 w-full flex flex-col-reverse gap-1">
                    {serverBuffer.slice(-8).map((pkt: Packet) => (
                        <div key={pkt.id} className="w-full h-6 bg-purple-500/20 border border-purple-500/40 rounded flex items-center justify-center text-[8px] font-bold text-purple-200">
                             {pkt.type} [{pkt.size}B]
                        </div>
                    ))}
                </div>
            </div>

            {/* Scrolling Packets */}
            
            {/* 1. SYN */}
            <motion.div style={{ left: synX, top: '30%', opacity: synOpacity }} className="absolute z-30 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-500 shadow-[0_0_20px_#3b82f6] flex items-center justify-center ring-2 ring-blue-300 ring-offset-2 ring-offset-obsidian">
                    <span className="text-[8px] font-black text-white">SYN</span>
                </div>
                <div className="mt-4 p-2 glass-panel border-blue-500/30 text-[8px] font-mono text-blue-200 w-24">"Hello!"</div>
            </motion.div>

            {/* 2. SYN-ACK */}
            <motion.div style={{ left: synAckX, top: '40%', opacity: synAckOpacity }} className="absolute z-30 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-purple-500 shadow-[0_0_20px_#a855f7] flex items-center justify-center ring-2 ring-purple-300 ring-offset-2 ring-offset-obsidian">
                    <span className="text-[8px] font-black text-white">S-A</span>
                </div>
                <div className="mt-4 p-2 glass-panel border-purple-500/30 text-[8px] font-mono text-purple-200 w-32">"Heard you, Hello back"</div>
            </motion.div>

            {/* 3. ACK */}
            <motion.div style={{ left: ackX, top: '30%', opacity: ackOpacity }} className="absolute z-30 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 shadow-[0_0_20px_#2563eb] flex items-center justify-center ring-2 ring-blue-300 ring-offset-2 ring-offset-obsidian">
                    <span className="text-[8px] font-black text-white">ACK</span>
                </div>
                <div className="mt-4 p-2 glass-panel border-blue-500/30 text-[8px] font-mono text-blue-200 w-24">"Got it!"</div>
            </motion.div>

            {/* 4. DATA */}
            <motion.div style={{ left: dataX, top: '50%', opacity: dataOpacity }} className="absolute z-30 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-500 shadow-[0_0_20px_#10b981] flex items-center justify-center ring-2 ring-emerald-300 ring-offset-2 ring-offset-obsidian">
                    <span className="text-[8px] font-black text-white">DATA</span>
                </div>
                <div className="mt-4 p-2 glass-panel border-emerald-500/30 text-[8px] font-mono text-emerald-200 w-24">"Here's my information."</div>
            </motion.div>

            {/* 5. FIN 1 */}
            <motion.div style={{ left: fin1X, top: '60%', opacity: fin1Opacity }} className="absolute z-30 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-orange-500 shadow-[0_0_20px_#f97316] flex items-center justify-center ring-2 ring-orange-300 ring-offset-2 ring-offset-obsidian">
                    <span className="text-[8px] font-black text-white">FIN</span>
                </div>
                <div className="mt-4 p-2 glass-panel border-orange-500/30 text-[8px] font-mono text-orange-200 w-24">"Goodbye, I'm done."</div>
            </motion.div>

            {/* 6. ACK FIN 1 */}
            <motion.div style={{ left: ackFin1X, top: '70%', opacity: ackFin1Opacity }} className="absolute z-30 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-purple-600 shadow-[0_0_20px_#c084fc] flex items-center justify-center ring-2 ring-purple-300 ring-offset-2 ring-offset-obsidian">
                    <span className="text-[8px] font-black text-white">ACK</span>
                </div>
                <div className="mt-4 p-2 glass-panel border-purple-500/30 text-[8px] font-mono text-purple-200 w-24">"Understood."</div>
            </motion.div>

            {/* 7. FIN 2 */}
            <motion.div style={{ left: fin2X, top: '80%', opacity: fin2Opacity }} className="absolute z-30 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-orange-500 shadow-[0_0_20px_#f97316] flex items-center justify-center ring-2 ring-orange-300 ring-offset-2 ring-offset-obsidian">
                    <span className="text-[8px] font-black text-white">FIN</span>
                </div>
                <div className="mt-4 p-2 glass-panel border-orange-500/30 text-[8px] font-mono text-orange-200 w-24">"I'm also done."</div>
            </motion.div>

            {/* 8. ACK FIN 2 */}
            <motion.div style={{ left: ackFin2X, top: '60%', opacity: ackFin2Opacity }} className="absolute z-30 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 shadow-[0_0_20px_#2563eb] flex items-center justify-center ring-2 ring-blue-300 ring-offset-2 ring-offset-obsidian">
                    <span className="text-[8px] font-black text-white">ACK</span>
                </div>
                <div className="mt-4 p-2 glass-panel border-blue-500/30 text-[8px] font-mono text-blue-200 w-24">"Confirmed."</div>
            </motion.div>
        
        </div>
      </div>

      {/* THE SCROLLING CONTENT LAYER (Triggers) */}
      <div className="relative z-10 pt-24 pb-64">
        {/* Connection Establishment */}
        <ScrollSection 
            title="Start" 
            desc="Both devices are quiet. No connection is made yet between the Client and the Server. They are waiting to see if anyone wants to talk." 
            icon={<MousePointer2 size={32} className="text-blue-500" />}
        />
        <ScrollSection 
            title="Step 1: Client Says Hello (SYN)" 
            desc="The Client wants to talk! It sends a 'Hello' (SYN) message to the Server." 
            icon={<ArrowDownCircle size={32} className="text-blue-400" />}
        />
        <ScrollSection 
            title="Step 2: Server Replies Hello (SYN-ACK)" 
            desc="The Server hears the request. It replies with 'I hear you, Hello to you too' (SYN-ACK). Now both know the other is listening." 
            icon={<ArrowDownCircle size={32} className="text-purple-400" />}
        />
        <ScrollSection 
            title="Step 3: Ready to Talk (ACK)" 
            desc="The Client says 'Got it!' (ACK). The connection is now open! This entire process is called the 3-Way Handshake." 
            icon={<ArrowDownCircle size={32} className="text-emerald-400" />}
        />
        
        {/* Data Transfer */}
        <ScrollSection 
            title="Talking (Data Transmission)" 
            desc="With the connection open, the Client and Server can now safely send data back and forth like a phone call." 
            icon={<ArrowDownCircle size={32} className="text-white" />}
        />
        
        {/* Connection Release */}
        <ScrollSection 
            title="Step 4: Client Wants to Stop (FIN)" 
            desc="When finished, the Client sends a 'Goodbye, I'm done' (FIN) message to the Server. This starts the connection release." 
            icon={<ArrowDownCircle size={32} className="text-orange-400" />}
        />
        <ScrollSection 
            title="Step 5: Server Agrees (ACK)" 
            desc="The Server says 'Okay, I understand you want to stop' (ACK). The Client waits quietly while the Server finishes any remaining tasks." 
            icon={<ArrowDownCircle size={32} className="text-purple-400" />}
        />
        <ScrollSection 
            title="Step 6: Server Says Goodbye (FIN)" 
            desc="Once the Server is completely done, it sends its own 'Goodbye, I'm also done' (FIN) message to the Client." 
            icon={<ArrowDownCircle size={32} className="text-orange-400" />}
        />
        <ScrollSection 
            title="Step 7: Final Confirmation (ACK)" 
            desc="The Client says 'Confirmed!' (ACK). The Server closes immediately. The Client waits roughly two minutes (TIME_WAIT) just to be sure their final message was received, then fully closes." 
            icon={<ArrowDownCircle size={32} className="text-blue-400" />}
        />
      </div>
    </div>
  );
};

const ScrollSection: React.FC<{ title: string, desc: string, icon: React.ReactNode }> = ({ title, desc, icon }) => {
    return (
        <section className="h-screen flex items-center pl-[520px] pr-12 pointer-events-none">
            <motion.div 
               initial={{ opacity: 0, x: 20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: false, amount: 0.5 }}
               className="max-w-xl glass-panel !bg-slate-900/60 p-10 border-slate-700/50 pointer-events-auto shadow-2xl"
            >
                <div className="mb-4">{icon}</div>
                <h3 className="text-3xl font-black text-white mb-4 drop-shadow-md">{title}</h3>
                <p className="text-slate-400 leading-relaxed text-lg font-light">
                    {desc}
                </p>
            </motion.div>
        </section>
    );
}
