import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'framer-motion';
import { GlassCard } from '../components/GlassCard';
import { TcpStateDiagram } from '../components/TcpStateDiagram';
import { phaseFromSegment, TcpPhase } from '../components/TcpSequenceView';
import { RootState } from '../store';
import { setClientState, setServerState, resetTcp } from '../store/tcpSlice';
import { MousePointer2, ArrowDownCircle } from 'lucide-react';

/** One idle + 3 handshake + 1 data + 4 teardown = 9 scroll steps. */
const SECTIONS = 9;

function packetWindow(k: number): readonly [number, number] {
  const a = (k + 1) / SECTIONS;
  const b = k === 7 ? 1 : (k + 2) / SECTIONS;
  return [a, b] as const;
}

export const TcpModule: React.FC = () => {
  const dispatch = useDispatch();
  const { clientState, serverState } = useSelector((state: RootState) => state.tcp as any);

  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [segment, setSegment] = useState(0);

  React.useEffect(() => {
    scrollContainerRef.current = document.querySelector('main');
  }, []);

  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const scrollSeg = useRef<number | null>(null);
  useMotionValueEvent(smoothProgress, 'change', (latest) => {
    const seg = Math.min(SECTIONS - 1, Math.max(0, Math.floor(latest * SECTIONS - 1e-6)));
    if (scrollSeg.current === seg) return;
    scrollSeg.current = seg;
    setSegment(seg);

    if (seg === 0) {
      dispatch(resetTcp());
      return;
    }
    if (seg === 1) {
      dispatch(setClientState('SYN_SENT'));
      dispatch(setServerState('LISTEN'));
      return;
    }
    if (seg === 2) {
      dispatch(setClientState('SYN_SENT'));
      dispatch(setServerState('SYN_RCVD'));
      return;
    }
    if (seg === 3 || seg === 4) {
      dispatch(setClientState('ESTABLISHED'));
      dispatch(setServerState('ESTABLISHED'));
      return;
    }
    if (seg === 5) {
      dispatch(setClientState('FIN_WAIT_1'));
      dispatch(setServerState('ESTABLISHED'));
      return;
    }
    if (seg === 6) {
      dispatch(setClientState('FIN_WAIT_2'));
      dispatch(setServerState('CLOSE_WAIT'));
      return;
    }
    if (seg === 7) {
      dispatch(setClientState('TIME_WAIT'));
      dispatch(setServerState('LAST_ACK'));
      return;
    }
    dispatch(setClientState('CLOSED'));
    dispatch(setServerState('CLOSED'));
  });

  React.useEffect(() => {
    const latest = smoothProgress.get();
    const seg = Math.min(SECTIONS - 1, Math.max(0, Math.floor(latest * SECTIONS - 1e-6)));
    setSegment(seg);
  }, [smoothProgress]);

  const [s0a, s0b] = packetWindow(0);
  const synOpacity = useTransform(smoothProgress, [s0a, s0a + 0.004, s0b - 0.004, s0b], [0, 1, 1, 0]);
  const synLeft = useTransform(smoothProgress, (v) => {
    if (v < s0a || v >= s0b) return '20%';
    const t = (v - s0a) / (s0b - s0a);
    return `${20 + t * 60}%`;
  });

  const [s1a, s1b] = packetWindow(1);
  const synAckOpacity = useTransform(smoothProgress, [s1a, s1a + 0.004, s1b - 0.004, s1b], [0, 1, 1, 0]);
  const synAckLeft = useTransform(smoothProgress, (v) => {
    if (v < s1a || v >= s1b) return '80%';
    const t = (v - s1a) / (s1b - s1a);
    return `${80 - t * 60}%`;
  });

  const [s2a, s2b] = packetWindow(2);
  const ackOpacity = useTransform(smoothProgress, [s2a, s2a + 0.004, s2b - 0.004, s2b], [0, 1, 1, 0]);
  const ackLeft = useTransform(smoothProgress, (v) => {
    if (v < s2a || v >= s2b) return '20%';
    const t = (v - s2a) / (s2b - s2a);
    return `${20 + t * 60}%`;
  });

  const [s3a, s3b] = packetWindow(3);
  const dataOpacity = useTransform(smoothProgress, [s3a, s3a + 0.004, s3b - 0.004, s3b], [0, 1, 1, 0]);
  const dataLeft = useTransform(smoothProgress, (v) => {
    if (v < s3a || v >= s3b) return '20%';
    const t = (v - s3a) / (s3b - s3a);
    return `${20 + t * 60}%`;
  });

  const [s4a, s4b] = packetWindow(4);
  const fin1Opacity = useTransform(smoothProgress, [s4a, s4a + 0.004, s4b - 0.004, s4b], [0, 1, 1, 0]);
  const fin1Left = useTransform(smoothProgress, (v) => {
    if (v < s4a || v >= s4b) return '20%';
    const t = (v - s4a) / (s4b - s4a);
    return `${20 + t * 60}%`;
  });

  const [s5a, s5b] = packetWindow(5);
  const ackFin1Opacity = useTransform(smoothProgress, [s5a, s5a + 0.004, s5b - 0.004, s5b], [0, 1, 1, 0]);
  const ackFin1Left = useTransform(smoothProgress, (v) => {
    if (v < s5a || v >= s5b) return '80%';
    const t = (v - s5a) / (s5b - s5a);
    return `${80 - t * 60}%`;
  });

  const [s6a, s6b] = packetWindow(6);
  const fin2Opacity = useTransform(smoothProgress, [s6a, s6a + 0.004, s6b - 0.004, s6b], [0, 1, 1, 0]);
  const fin2Left = useTransform(smoothProgress, (v) => {
    if (v < s6a || v >= s6b) return '80%';
    const t = (v - s6a) / (s6b - s6a);
    return `${80 - t * 60}%`;
  });

  const [s7a, s7b] = packetWindow(7);
  const ackFin2Opacity = useTransform(smoothProgress, [s7a, s7a + 0.004, 0.998, 1], [0, 1, 1, 1]);
  const ackFin2Left = useTransform(smoothProgress, (v) => {
    if (v < s7a || v >= s7b) return '20%';
    const t = (v - s7a) / (s7b - s7a);
    return `${20 + t * 60}%`;
  });

  const phase: TcpPhase = phaseFromSegment(segment);
  /** Show one full subgraph: opening (idle, handshake, data) or closing (teardown) only. */
  const diagramView = phase === 'teardown' ? 'closing' : 'establishment';

  const wireScale =
    phase === 'handshake' ? 1.06 : phase === 'data' ? 1.04 : phase === 'teardown' ? 1.06 : 1;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="sticky top-0 min-h-screen w-full flex flex-col xl:flex-row overflow-hidden pointer-events-none">
        <div className="xl:w-[min(100%,620px)] xl:max-w-[620px] xl:shrink-0 w-full p-4 xl:p-5 flex flex-col justify-start xl:border-r border-slate-700/30 bg-obsidian/25 backdrop-blur-sm pointer-events-auto gap-4 overflow-y-auto max-h-[min(100vh,920px)] xl:max-h-screen xl:h-screen">
          <TcpStateDiagram clientState={clientState} serverState={serverState} view={diagramView} />

          <div className="grid grid-cols-2 gap-2">
            <GlassCard className="!p-3 border-blue-500/20">
              <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Client state</div>
              <div className="text-[11px] font-mono text-blue-300 leading-tight">{clientState}</div>
            </GlassCard>
            <GlassCard className="!p-3 border-purple-500/20">
              <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Server state</div>
              <div className="text-[11px] font-mono text-purple-300 leading-tight">{serverState}</div>
            </GlassCard>
          </div>
        </div>

        <motion.div
          className="flex-1 relative bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.04),transparent_65%)] pointer-events-auto flex flex-col"
          animate={{ scale: wireScale }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        >
          <div className="px-10 pt-8 pb-4 shrink-0">
            <PhaseWireTitle phase={phase} segment={segment} />
          </div>

          <div className="flex-1 relative min-h-0 px-12 pb-10">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <span className="font-black text-2xl text-blue-300">Client</span>
                <span className="text-[10px] text-blue-500/80 font-mono uppercase tracking-[0.15em] font-bold mt-0.5">Sends / receives</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-black text-2xl text-purple-300">Server</span>
                <span className="text-[10px] text-purple-500/80 font-mono uppercase tracking-[0.15em] font-bold mt-0.5">Sends / receives</span>
              </div>
            </div>

            <div className="absolute left-[18%] top-16 bottom-8 w-px bg-gradient-to-b from-blue-500/35 via-blue-500/10 to-transparent" />
            <div className="absolute right-[18%] top-16 bottom-8 w-px bg-gradient-to-b from-purple-500/35 via-purple-500/10 to-transparent" />

            {phase === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-slate-600 text-center max-w-sm">Scroll down to begin the handshake. This area will show one moving segment at a time.</p>
              </div>
            )}

            {phase === 'handshake' && (
              <>
                <PacketBubble
                  style={{ left: synLeft, top: '34%', opacity: synOpacity }}
                  color="blue"
                  label="SYN"
                  caption="Opens the handshake."
                />
                <PacketBubble
                  style={{ left: synAckLeft, top: '46%', opacity: synAckOpacity }}
                  color="purple"
                  label="SYN-ACK"
                  caption="Server responds."
                />
                <PacketBubble
                  style={{ left: ackLeft, top: '34%', opacity: ackOpacity }}
                  color="blue"
                  label="ACK"
                  caption="Completes open."
                />
              </>
            )}

            {phase === 'data' && (
              <PacketBubble
                style={{ left: dataLeft, top: '42%', opacity: dataOpacity }}
                color="emerald"
                label="DATA"
                caption="Application data in a segment."
              />
            )}

            {phase === 'teardown' && (
              <>
                <PacketBubble
                  style={{ left: fin1Left, top: '32%', opacity: fin1Opacity }}
                  color="orange"
                  label="FIN"
                  caption="First side done sending."
                />
                <PacketBubble
                  style={{ left: ackFin1Left, top: '46%', opacity: ackFin1Opacity }}
                  color="purple"
                  label="ACK"
                  caption="ACK that FIN."
                />
                <PacketBubble
                  style={{ left: fin2Left, top: '60%', opacity: fin2Opacity }}
                  color="orange"
                  label="FIN"
                  caption="Other side closes."
                />
                <PacketBubble
                  style={{ left: ackFin2Left, top: '42%', opacity: ackFin2Opacity }}
                  color="blue"
                  label="ACK"
                  caption="Last ACK."
                />
              </>
            )}
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 pt-24 pb-64">
        <ScrollSection
          step={1}
          total={SECTIONS}
          phase="Idle"
          title="No connection yet"
          desc="The client has not started a connection. The server may be listening. There is no shared TCP state until the first SYN is sent."
          icon={<MousePointer2 size={28} className="text-blue-500" />}
        />
        <ScrollSection
          step={2}
          total={SECTIONS}
          phase="Establishment"
          title="First segment: SYN"
          desc="The client sends SYN. It picks an initial sequence number (ISN). This is the start of the three-way handshake only—nothing is ‘connected’ until the third ACK."
          icon={<ArrowDownCircle size={28} className="text-blue-400" />}
        />
        <ScrollSection
          step={3}
          total={SECTIONS}
          phase="Establishment"
          title="Second segment: SYN-ACK"
          desc="The server replies with a single segment that both acknowledges the client’s SYN and carries its own SYN. The client still must send one more ACK."
          icon={<ArrowDownCircle size={28} className="text-purple-400" />}
        />
        <ScrollSection
          step={4}
          total={SECTIONS}
          phase="Establishment"
          title="Third segment: ACK"
          desc="The client ACKs the server’s SYN. Now both ends agree on sequence numbers—the connection is ESTABLISHED and ready for data."
          icon={<ArrowDownCircle size={28} className="text-emerald-400" />}
        />
        <ScrollSection
          step={5}
          total={SECTIONS}
          phase="Data"
          title="Payload on an open connection"
          desc="With ESTABLISHED on both sides, TCP carries application bytes in DATA segments (with sequence and ACK fields in real packets). Here we show one direction to keep the picture simple."
          icon={<ArrowDownCircle size={28} className="text-white" />}
        />
        <ScrollSection
          step={6}
          total={SECTIONS}
          phase="Teardown"
          title="First FIN"
          desc="One side sends FIN when it has no more data. That half of the connection stops sending; the other side can still send until it also FINs."
          icon={<ArrowDownCircle size={28} className="text-orange-400" />}
        />
        <ScrollSection
          step={7}
          total={SECTIONS}
          phase="Teardown"
          title="ACK the FIN"
          desc="The peer must acknowledge the FIN. You’ll see states like FIN_WAIT_2 and CLOSE_WAIT while each side finishes its half."
          icon={<ArrowDownCircle size={28} className="text-purple-400" />}
        />
        <ScrollSection
          step={8}
          total={SECTIONS}
          phase="Teardown"
          title="Second FIN"
          desc="The other side sends its FIN when it is done. After this is acknowledged, both sides can release the connection."
          icon={<ArrowDownCircle size={28} className="text-orange-400" />}
        />
        <ScrollSection
          step={9}
          total={SECTIONS}
          phase="Teardown"
          title="Final ACK"
          desc="The last ACK confirms the second FIN. One endpoint may sit in TIME_WAIT briefly, then both return to CLOSED."
          icon={<ArrowDownCircle size={28} className="text-blue-400" />}
        />
      </div>
    </div>
  );
};

function PhaseWireTitle({ phase, segment }: { phase: TcpPhase; segment: number }) {
  const labels: Record<TcpPhase, { title: string; sub: string }> = {
    idle: { title: 'Overview', sub: 'Nothing in flight. Scroll to handshake.' },
    handshake: {
      title: 'Zoom: establishment',
      sub: 'Only the three handshake segments are shown on the wire.',
    },
    data: { title: 'Zoom: data', sub: 'One DATA segment while the connection is open.' },
    teardown: { title: 'Zoom: teardown', sub: 'Only the four closing segments are shown.' },
  };
  const { title, sub } = labels[phase];
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">{title}</p>
      <p className="text-[12px] text-slate-400 mt-1">{sub}</p>
      <p className="text-[10px] text-slate-600 mt-2 font-mono">Scroll step {segment + 1} / {SECTIONS}</p>
    </div>
  );
}

const PacketBubble: React.FC<{
  style: { left: unknown; top: string; opacity: unknown };
  color: 'blue' | 'purple' | 'emerald' | 'orange';
  label: string;
  caption: string;
}> = ({ style, color, label, caption }) => {
  const ring: Record<typeof color, string> = {
    blue: 'bg-blue-500 shadow-[0_0_20px_#3b82f6] ring-blue-300',
    purple: 'bg-purple-500 shadow-[0_0_20px_#a855f7] ring-purple-300',
    emerald: 'bg-emerald-500 shadow-[0_0_20px_#10b981] ring-emerald-300',
    orange: 'bg-orange-500 shadow-[0_0_20px_#f97316] ring-orange-300',
  };
  const border: Record<typeof color, string> = {
    blue: 'border-blue-500/30 text-blue-200',
    purple: 'border-purple-500/30 text-purple-200',
    emerald: 'border-emerald-500/30 text-emerald-200',
    orange: 'border-orange-500/30 text-orange-200',
  };
  return (
    <motion.div style={style as any} className="absolute z-30 flex flex-col items-center -translate-x-1/2">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-obsidian ${ring[color]}`}>
        <span className="text-[9px] font-black text-white">{label}</span>
      </div>
      <div className={`mt-2 px-2 py-1.5 glass-panel border text-[10px] max-w-[220px] text-center leading-snug ${border[color]}`}>{caption}</div>
    </motion.div>
  );
};

const ScrollSection: React.FC<{
  step: number;
  total: number;
  phase: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}> = ({ step, total, phase, title, desc, icon }) => {
  return (
    <section className="h-screen flex items-center pl-4 md:pl-[620px] pr-6 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: false, amount: 0.45 }}
        className="max-w-lg glass-panel !bg-slate-900/70 p-8 border-slate-700/50 pointer-events-auto shadow-xl"
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold mb-1">
          {phase} · Step {step} of {total}
        </p>
        <div className="mb-3">{icon}</div>
        <h3 className="text-xl font-black text-white mb-2">{title}</h3>
        <p className="text-slate-400 leading-relaxed text-sm font-light">{desc}</p>
      </motion.div>
    </section>
  );
};
