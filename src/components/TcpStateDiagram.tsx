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
}

const NODES: Node[] = [
  { id: 'CLOSED', x: 200, y: 40, label: 'CLOSED' },
  { id: 'LISTEN', x: 380, y: 40, label: 'LISTEN' },
  { id: 'SYN_SENT', x: 80, y: 150, label: 'SYN_SENT' },
  { id: 'SYN_RCVD', x: 320, y: 150, label: 'SYN_RCVD' },
  { id: 'ESTABLISHED', x: 200, y: 260, label: 'ESTABLISHED' },
  { id: 'FIN_WAIT_1', x: 80, y: 380, label: 'FIN_WAIT_1' },
  { id: 'FIN_WAIT_2', x: 80, y: 500, label: 'FIN_WAIT_2' },
  { id: 'CLOSE_WAIT', x: 320, y: 380, label: 'CLOSE_WAIT' },
  { id: 'LAST_ACK', x: 320, y: 500, label: 'LAST_ACK' },
  { id: 'CLOSING', x: 200, y: 440, label: 'CLOSING' },
  { id: 'TIME_WAIT', x: 200, y: 580, label: 'TIME_WAIT' },
];

const EDGES: Edge[] = [
  { from: 'CLOSED', to: 'SYN_SENT' },
  { from: 'LISTEN', to: 'SYN_RCVD' },
  { from: 'SYN_SENT', to: 'ESTABLISHED' },
  { from: 'SYN_RCVD', to: 'ESTABLISHED' },
  { from: 'ESTABLISHED', to: 'FIN_WAIT_1' },
  { from: 'ESTABLISHED', to: 'CLOSE_WAIT' },
  { from: 'FIN_WAIT_1', to: 'FIN_WAIT_2' },
  { from: 'FIN_WAIT_1', to: 'CLOSING' },
  { from: 'FIN_WAIT_2', to: 'TIME_WAIT' },
  { from: 'CLOSING', to: 'TIME_WAIT' },
  { from: 'CLOSE_WAIT', to: 'LAST_ACK' },
  { from: 'LAST_ACK', to: 'CLOSED' },
  { from: 'TIME_WAIT', to: 'CLOSED' },
];

export const TcpStateDiagram: React.FC<{ currentState: TcpStateValue }> = ({ currentState }) => {
  return (
    <svg width="460" height="650" viewBox="0 0 460 650" className="drop-shadow-2xl">
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
      {EDGES.map((edge) => {
        const fromNode = NODES.find(n => n.id === edge.from)!;
        const toNode = NODES.find(n => n.id === edge.to)!;
        const isActive = currentState === edge.from || currentState === edge.to;

        return (
          <motion.line
            key={`${edge.from}-${edge.to}`}
            x1={fromNode.x}
            y1={fromNode.y}
            x2={toNode.x}
            y2={toNode.y}
            stroke={isActive ? '#3b82f6' : '#1e293b'}
            strokeWidth={isActive ? 3 : 1}
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{ pathLength: 1, opacity: isActive ? 1 : 0.2 }}
            transition={{ duration: 1 }}
            filter={isActive ? 'url(#glow-edge)' : ''}
          />
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
              className={`text-[10px] font-mono font-bold tracking-tighter ${isActive ? 'fill-blue-400' : 'fill-slate-600'}`}
              animate={{
                opacity: isActive ? 1 : 0.6,
                scale: isActive ? 1.1 : 1,
              }}
            >
              {node.label}
            </motion.text>
          </g>
        );
      })}
    </svg>
  );
};
