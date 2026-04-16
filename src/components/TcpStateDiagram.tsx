import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TcpStateValue } from '../store/tcpSlice';

interface Node {
  id: TcpStateValue;
  x: number;
  y: number;
  label: string;
}

interface Edge {
  from: TcpStateValue;
  to: TcpStateValue;
  pathType: 'client' | 'server' | 'anomaly';
  label: string;
  isCurve?: boolean;
}

const NODES: Node[] = [
  { id: 'CLOSED', x: 200, y: 40, label: 'CLOSED' },
  { id: 'LISTEN', x: 380, y: 40, label: 'LISTEN' },
  { id: 'SYN_SENT', x: 60, y: 150, label: 'SYN_SENT' },
  { id: 'SYN_RCVD', x: 340, y: 150, label: 'SYN_RCVD' },
  { id: 'ESTABLISHED', x: 200, y: 260, label: 'ESTABLISHED' },
  { id: 'FIN_WAIT_1', x: 60, y: 380, label: 'FIN_WAIT_1' },
  { id: 'FIN_WAIT_2', x: 60, y: 500, label: 'FIN_WAIT_2' },
  { id: 'CLOSE_WAIT', x: 340, y: 380, label: 'CLOSE_WAIT' },
  { id: 'LAST_ACK', x: 340, y: 500, label: 'LAST_ACK' },
  { id: 'CLOSING', x: 200, y: 440, label: 'CLOSING' },
  { id: 'TIME_WAIT', x: 200, y: 580, label: 'TIME_WAIT' },
];

const EDGES: Edge[] = [
  { from: 'CLOSED', to: 'SYN_SENT', pathType: 'client', label: 'Send: SYN' },
  { from: 'CLOSED', to: 'LISTEN', pathType: 'server', label: 'Passive Open' },
  { from: 'LISTEN', to: 'SYN_RCVD', pathType: 'server', label: 'Recv: SYN, Send: SYN-ACK' },
  { from: 'SYN_SENT', to: 'ESTABLISHED', pathType: 'client', label: 'Recv: SYN-ACK, Send: ACK' },
  { from: 'SYN_RCVD', to: 'ESTABLISHED', pathType: 'server', label: 'Recv: ACK' },
  { from: 'ESTABLISHED', to: 'FIN_WAIT_1', pathType: 'client', label: 'Send: FIN' },
  { from: 'ESTABLISHED', to: 'CLOSE_WAIT', pathType: 'server', label: 'Recv: FIN, Send: ACK' },
  { from: 'FIN_WAIT_1', to: 'FIN_WAIT_2', pathType: 'client', label: 'Recv: ACK' },
  { from: 'FIN_WAIT_1', to: 'CLOSING', pathType: 'anomaly', label: 'Recv: FIN, Send: ACK' },
  { from: 'FIN_WAIT_2', to: 'TIME_WAIT', pathType: 'client', label: 'Recv: FIN, Send: ACK' },
  { from: 'CLOSING', to: 'TIME_WAIT', pathType: 'anomaly', label: 'Recv: ACK' },
  { from: 'CLOSE_WAIT', to: 'LAST_ACK', pathType: 'server', label: 'Send: FIN' },
  { from: 'LAST_ACK', to: 'CLOSED', pathType: 'server', label: 'Recv: ACK' },
  { from: 'TIME_WAIT', to: 'CLOSED', pathType: 'client', label: 'Timeout' },
  { from: 'SYN_SENT', to: 'SYN_RCVD', pathType: 'anomaly', label: 'Recv: SYN, Send: SYN-ACK', isCurve: true },
];

const ESTABLISHMENT_IDS = new Set<TcpStateValue>(['CLOSED', 'LISTEN', 'SYN_SENT', 'SYN_RCVD', 'ESTABLISHED']);

const CLOSING_IDS = new Set<TcpStateValue>([
  'ESTABLISHED',
  'FIN_WAIT_1',
  'FIN_WAIT_2',
  'CLOSE_WAIT',
  'LAST_ACK',
  'CLOSING',
  'TIME_WAIT',
  'CLOSED',
]);

export type TcpDiagramRegion = 'establishment' | 'closing';

function filterEdgesFor(region: TcpDiagramRegion): Edge[] {
  const allow = region === 'establishment' ? ESTABLISHMENT_IDS : CLOSING_IDS;
  return EDGES.filter((e) => allow.has(e.from) && allow.has(e.to));
}

function filterNodesFor(region: TcpDiagramRegion): Node[] {
  const allow = region === 'establishment' ? ESTABLISHMENT_IDS : CLOSING_IDS;
  return NODES.filter((n) => allow.has(n.id));
}

function viewBoxFor(nodes: Node[]): { vb: string; aspect: number } {
  if (nodes.length === 0) return { vb: '0 0 400 300', aspect: 400 / 300 };
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const padX = 70;
  const padY = 55;
  const minX = Math.min(...xs) - padX;
  const maxX = Math.max(...xs) + padX;
  const minY = Math.min(...ys) - padY;
  const maxY = Math.max(...ys) + padY;
  const w = maxX - minX;
  const h = maxY - minY;
  return { vb: `${minX} ${minY} ${w} ${h}`, aspect: w / h };
}

const getPathColor = (pathType: string, isActive: boolean) => {
  if (!isActive) return '#1e293b';
  if (pathType === 'client') return '#3b82f6';
  if (pathType === 'server') return '#a855f7';
  return '#ef4444';
};

const getTextColor = (pathType: string) => {
  if (pathType === 'client') return 'fill-blue-300';
  if (pathType === 'server') return 'fill-purple-300';
  return 'fill-red-300';
};

export interface TcpStateDiagramProps {
  clientState: TcpStateValue;
  serverState: TcpStateValue;
  view: TcpDiagramRegion;
}

export const TcpStateDiagram: React.FC<TcpStateDiagramProps> = ({ clientState, serverState, view }) => {
  const active = new Set<TcpStateValue>([clientState, serverState]);
  const nodes = useMemo(() => filterNodesFor(view), [view]);
  const edges = useMemo(() => filterEdgesFor(view), [view]);
  const { vb, aspect } = useMemo(() => viewBoxFor(nodes), [nodes]);
  const filterId = `glow-edge-${view}`;

  const title =
    view === 'establishment'
      ? 'Establishment — 3-way handshake'
      : 'Teardown — orderly close';

  const subtitle =
    view === 'establishment'
      ? 'States and transitions used to open a connection (through ESTABLISHED).'
      : 'States and transitions used to shut down (back to CLOSED).';

  return (
    <div className="relative w-full flex flex-col rounded-2xl border border-slate-600/70 bg-slate-950/60 shadow-lg">
      <div className="px-5 pt-5 pb-3 border-b border-slate-800/90">
        <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">{subtitle}</p>
      </div>

      <div className="relative flex-1 p-4 md:p-5">
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
          <span className="flex items-center gap-2">
            <span className="inline-block w-8 h-1 rounded bg-blue-500" />
            Client path
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-8 h-1 rounded bg-purple-500" />
            Server path
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-8 h-1 rounded bg-red-500" />
            Alternate path
          </span>
        </div>

        <div className="w-full rounded-xl bg-slate-900/50 border border-slate-800/80 p-3 md:p-4">
          <svg
            viewBox={vb}
            className="w-full h-auto min-h-[280px] md:min-h-[340px] max-h-[min(52vh,520px)]"
            preserveAspectRatio="xMidYMid meet"
            style={{ aspectRatio: aspect }}
            aria-label={title}
          >
            <defs>
              <filter id={filterId}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {edges.map((edge, idx) => {
              const fromNode = nodes.find((n) => n.id === edge.from)!;
              const toNode = nodes.find((n) => n.id === edge.to)!;
              if (!fromNode || !toNode) return null;

              const isActive = active.has(edge.from) || active.has(edge.to);
              const strokeColor = getPathColor(edge.pathType, isActive);
              const midX = (fromNode.x + toNode.x) / 2;
              const midY = (fromNode.y + toNode.y) / 2;

              let pathD = `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
              if (edge.isCurve) {
                pathD = `M ${fromNode.x} ${fromNode.y} Q ${midX} ${midY - 40} ${toNode.x} ${toNode.y}`;
              }

              return (
                <g key={`edge-${view}-${idx}`}>
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isActive ? 3.5 : 2}
                    initial={{ pathLength: 0, opacity: 0.25 }}
                    animate={{ pathLength: 1, opacity: isActive ? 1 : 0.4 }}
                    transition={{ duration: 1 }}
                    filter={isActive ? `url(#${filterId})` : ''}
                  />
                  <motion.text
                    x={midX}
                    y={edge.isCurve ? midY - 28 : midY - 10}
                    textAnchor="middle"
                    className={`text-[11px] md:text-[12px] font-mono font-medium ${getTextColor(edge.pathType)}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isActive ? 1 : 0.55 }}
                  >
                    {edge.label}
                  </motion.text>
                </g>
              );
            })}

            {nodes.map((node) => {
              const isActive = active.has(node.id);
              return (
                <g key={`${view}-${node.id}`}>
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    fill={isActive ? '#2563eb' : '#0f172a'}
                    stroke={isActive ? '#93c5fd' : '#475569'}
                    strokeWidth={isActive ? 2.5 : 2}
                    initial={{ r: 10 }}
                    animate={{
                      r: isActive ? 15 : 10,
                      scale: isActive ? [1, 1.06, 1] : 1,
                    }}
                    transition={{
                      scale: { repeat: Infinity, duration: 2 },
                      duration: 0.3,
                    }}
                  />
                  <motion.text
                    x={node.x}
                    y={node.y + 26}
                    textAnchor="middle"
                    className={`text-[12px] md:text-[13px] font-mono font-bold ${isActive ? 'fill-sky-300' : 'fill-slate-500'}`}
                    animate={{
                      opacity: isActive ? 1 : 0.9,
                    }}
                  >
                    {node.label}
                  </motion.text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
