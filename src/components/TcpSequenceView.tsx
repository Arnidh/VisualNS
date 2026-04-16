import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type TcpPhase = 'idle' | 'handshake' | 'data' | 'teardown';

type Msg = { id: string; from: 'client' | 'server'; label: string; detail: string };

const PHASE_MESSAGES: Record<Exclude<TcpPhase, 'idle'>, Msg[]> = {
  handshake: [
    {
      id: 'syn',
      from: 'client',
      label: 'SYN',
      detail: 'Client sends its initial sequence number (ISN) and requests a connection.',
    },
    {
      id: 'synack',
      from: 'server',
      label: 'SYN + ACK',
      detail: 'Server acknowledges the SYN and sends its own ISN in one segment.',
    },
    {
      id: 'ack',
      from: 'client',
      label: 'ACK',
      detail: 'Client acknowledges the server’s SYN. Both sides are now ESTABLISHED.',
    },
  ],
  data: [
    {
      id: 'data',
      from: 'client',
      label: 'DATA',
      detail: 'Application bytes travel in numbered segments; acknowledgements are not shown in this zoomed view.',
    },
  ],
  teardown: [
    {
      id: 'fin1',
      from: 'client',
      label: 'FIN',
      detail: 'This side signals it has no more data to send (starts half-close).',
    },
    {
      id: 'ack1',
      from: 'server',
      label: 'ACK',
      detail: 'The peer acknowledges the FIN so the first half-close is complete.',
    },
    {
      id: 'fin2',
      from: 'server',
      label: 'FIN',
      detail: 'The other side sends its FIN when it is done sending.',
    },
    {
      id: 'ack2',
      from: 'client',
      label: 'ACK',
      detail: 'Final acknowledgement; sockets move toward CLOSED (TIME_WAIT then closed).',
    },
  ],
};

const PHASE_LABEL: Record<TcpPhase, string> = {
  idle: 'Before any connection',
  handshake: 'Connection establishment (3-way handshake)',
  data: 'Data transfer',
  teardown: 'Connection teardown (orderly close)',
};

interface TcpSequenceViewProps {
  phase: TcpPhase;
  step: number;
}

export const TcpSequenceView: React.FC<TcpSequenceViewProps> = ({ phase, step }) => {
  if (phase === 'idle') {
    return (
      <div className="rounded-2xl border border-slate-700/60 bg-slate-950/80 p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">{PHASE_LABEL.idle}</p>
        <div className="flex justify-between items-start gap-6">
          <div className="text-center flex-1">
            <div className="mx-auto w-3 h-3 rounded-full bg-slate-600 mb-2" />
            <span className="text-xs font-mono text-blue-300">CLOSED</span>
            <p className="text-[10px] text-slate-500 mt-2 leading-snug">No connection context for this pair of endpoints.</p>
          </div>
          <div className="flex-1 flex items-center justify-center pt-8 text-[10px] text-slate-600 text-center">Nothing on the wire yet</div>
          <div className="text-center flex-1">
            <div className="mx-auto w-3 h-3 rounded-full bg-slate-600 mb-2" />
            <span className="text-xs font-mono text-purple-300">LISTEN</span>
            <p className="text-[10px] text-slate-500 mt-2 leading-snug">Server is ready to accept an incoming open.</p>
          </div>
        </div>
      </div>
    );
  }

  const messages = PHASE_MESSAGES[phase];
  const active = Math.max(0, Math.min(step, messages.length - 1));

  return (
    <div className="rounded-2xl border border-blue-500/25 bg-slate-950/95 p-5 shadow-[inset_0_1px_0_rgba(59,130,246,0.06)]">
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <p className="text-[11px] font-semibold text-blue-300/95 leading-tight">{PHASE_LABEL[phase]}</p>
        <span className="text-[10px] text-slate-500 font-mono shrink-0">
          Step {active + 1} of {messages.length}
        </span>
      </div>

      <div className="space-y-0 rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span className="text-blue-400/90">Client</span>
          <span className="text-center text-slate-600">Wire</span>
          <span className="text-right text-purple-400/90">Server</span>
        </div>

        <div className="p-3 space-y-2">
          {messages.map((msg, i) => {
            const isCurrent = i === active;
            const isFuture = i > active;
            const clientLeft = msg.from === 'client';

            return (
              <div
                key={msg.id}
                className={`rounded-lg px-2 py-2 transition-colors ${
                  isCurrent ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : isFuture ? 'opacity-40' : 'opacity-70'
                }`}
              >
                <div className="flex items-center min-h-[36px]">
                  <div className="w-[22%] flex justify-center">
                    <div className={`w-2 h-2 rounded-full ${clientLeft ? 'bg-blue-400' : 'bg-slate-700'}`} />
                  </div>
                  <div className="flex-1 relative h-8 flex items-center justify-center">
                    <div
                      className={`absolute left-[10%] right-[10%] h-[2px] rounded-full ${
                        clientLeft
                          ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80'
                          : 'bg-gradient-to-l from-blue-500/80 to-purple-500/80'
                      } ${isFuture ? 'opacity-30' : ''}`}
                    />
                    <span
                      className={`relative z-10 px-2 py-0.5 rounded text-[9px] font-mono font-black ${
                        isCurrent ? 'bg-slate-800 text-white border border-slate-600' : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {msg.label}
                    </span>
                    {clientLeft ? (
                      <span className="absolute right-1 text-[8px] text-slate-600">→</span>
                    ) : (
                      <span className="absolute left-1 text-[8px] text-slate-600">←</span>
                    )}
                  </div>
                  <div className="w-[22%] flex justify-center">
                    <div className={`w-2 h-2 rounded-full ${!clientLeft ? 'bg-purple-400' : 'bg-slate-700'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${phase}-${active}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-4 text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-3"
        >
          <span className="text-slate-500">What’s happening: </span>
          {messages[active].detail}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export function phaseFromSegment(seg: number): TcpPhase {
  if (seg <= 0) return 'idle';
  if (seg <= 3) return 'handshake';
  if (seg === 4) return 'data';
  return 'teardown';
}

export function stepWithinPhase(seg: number): number {
  if (seg <= 0) return 0;
  if (seg <= 3) return seg - 1;
  if (seg === 4) return 0;
  return seg - 5;
}
