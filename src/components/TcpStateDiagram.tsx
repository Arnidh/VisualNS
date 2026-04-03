import React from 'react';
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

const getPathColor = (pathType: string, isActive: boolean) => {
  if (!isActive) return '#1e293b';
  if (pathType === 'client') return '#3b82f6'; // Blue
  if (pathType === 'server') return '#a855f7'; // Purple
  return '#ef4444'; // Red for anomaly
};

const getTextColor = (pathType: string) => {
  if (pathType === 'client') return 'fill-blue-400';
  if (pathType === 'server') return 'fill-purple-400';
  return 'fill-red-400';
};

export const TcpStateDiagram: React.FC<{ currentState: TcpStateValue }> = ({ currentState }) => {
  return (
    <div className="relative w-full h-full">
      {/* Legend */}
      <div className="absolute top-2 left-2 p-2 rounded bg-black/40 border border-slate-700/50 text-[10px] space-y-1">
        <div className="flex items-center gap-2"><div className="w-3 h-1 bg-blue-500 rounded"></div><span className="text-blue-200">Client Path</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-1 bg-purple-500 rounded"></div><span className="text-purple-200">Server Path</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-1 bg-red-500 rounded"></div><span className="text-red-200">Simultaneous/Anomaly</span></div>
      </div>

      <svg width="460" height="650" viewBox="-40 0 500 650" className="drop-shadow-2xl">
        <defs>
          <filter id="glow-edge">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Draw Edges */}
        {EDGES.map((edge, idx) => {
          const fromNode = NODES.find(n => n.id === edge.from)!;
          const toNode = NODES.find(n => n.id === edge.to)!;
          const isActive = currentState === edge.from || currentState === edge.to;
          const strokeColor = getPathColor(edge.pathType, isActive);

          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          
          let pathD = `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
          if (edge.isCurve) {
            pathD = `M ${fromNode.x} ${fromNode.y} Q ${midX} ${midY - 40} ${toNode.x} ${toNode.y}`;
          }

          return (
            <g key={`edge-${idx}`}>
              <motion.path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isActive ? 3 : 1}
                initial={{ pathLength: 0, opacity: 0.2 }}
                animate={{ pathLength: 1, opacity: isActive ? 1 : 0.3 }}
                transition={{ duration: 1 }}
                filter={isActive ? 'url(#glow-edge)' : ''}
              />
              <motion.text
                x={midX}
                y={edge.isCurve ? midY - 20 : midY - 5}
                textAnchor="middle"
                className={`text-[8px] font-mono ${getTextColor(edge.pathType)}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: isActive ? 1 : 0.4 }}
              >
                {edge.label}
              </motion.text>
            </g>
          );
        })}

        {/* Draw Nodes */}
        {NODES.map((node) => {
          const isActive = currentState === node.id;
          
          return (
            <g key={node.id}>
              <motion.circle
                cx={node.x}
                cy={node.y}
                fill={isActive ? '#3b82f6' : '#0f172a'}
                stroke={isActive ? '#60a5fa' : '#334155'}
                strokeWidth={2}
                initial={{ r: 8 }}
                animate={{
                  r: isActive ? 12 : 8,
                  scale: isActive ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  scale: { repeat: Infinity, duration: 2 },
                  duration: 0.3
                }}
                className="cursor-help"
              />
              <motion.text
                x={node.x}
                y={node.y + 25}
                textAnchor="middle"
                className={`text-[10px] font-mono font-bold tracking-tighter ${isActive ? 'fill-blue-400' : 'fill-slate-500'}`}
                animate={{
                  opacity: isActive ? 1 : 0.8,
                  scale: isActive ? 1.1 : 1,
                }}
              >
                {node.label}
              </motion.text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
