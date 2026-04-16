import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { X, Terminal as TerminalIcon, Settings, Play, Square, Trash2 } from 'lucide-react';
import { GlassCard } from './GlassCard';

import '@xterm/xterm/css/xterm.css';

const PUTTY_THEME = {
  background: '#000000',
  foreground: '#bbbbbb',
  cursor: '#bbbbbb',
  black: '#000000',
  red: '#bb0000',
  green: '#00bb00',
  yellow: '#bbbb00',
  blue: '#0000bb',
  magenta: '#bb00bb',
  cyan: '#00bbbb',
  white: '#bbbbbb',
  brightBlack: '#555555',
  brightRed: '#ff5555',
  brightGreen: '#55ff55',
  brightYellow: '#ffff55',
  brightBlue: '#5555ff',
  brightMagenta: '#ff55ff',
  brightCyan: '#55ffff',
  brightWhite: '#ffffff',
};

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export const SerialTerminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const writeRef = useRef<WritableStreamDefaultWriter | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [baudRate, setBaudRate] = useState(115200);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState('serial' in navigator);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize Terminal
    term.current = new Terminal({
      theme: PUTTY_THEME,
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 14,
      cursorBlink: true,
      scrollback: 5000,
      convertEol: true,
      allowProposedApi: true,
      screenReaderMode: true,
      cursorStyle: 'block',
    });

    fitAddon.current = new FitAddon();
    term.current.loadAddon(fitAddon.current);
    term.current.open(terminalRef.current);
    
    // Initial fit with a small delay to ensure container is rendered
    const timeoutId = setTimeout(() => {
      fitAddon.current?.fit();
    }, 100);

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.current?.fit();
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current.parentElement || terminalRef.current);
    }

    // Welcome message
    term.current.writeln('\x1b[1;32mVisualNS Virtual PuTTY Terminal\x1b[0m');
    term.current.writeln('Ready to connect...');

    // Handle user input
    term.current.onData((data) => {
      if (writeRef.current) {
        writeRef.current.write(new TextEncoder().encode(data));
      }
    });

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      disconnect();
      term.current?.dispose();
    };
  }, []);

  const connect = async () => {
    setError(null);
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });
      portRef.current = port;
      setIsConnected(true);

      term.current?.writeln(`\x1b[1;34mConnected to port at ${baudRate} baud.\x1b[0m`);

      // Start read loop
      readLoop();
      
      // Get writer
      writeRef.current = port.writable.getWriter();
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      console.error(err);
    }
  };

  const readLoop = async () => {
    if (!portRef.current || !portRef.current.readable) return;

    try {
      const reader = portRef.current.readable.getReader();
      readerRef.current = reader;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const text = new TextDecoder().decode(value);
          term.current?.write(text);
        }
      }
    } catch (err) {
      console.error('Read error:', err);
      setError('Connection interrupted');
      setIsConnected(false);
    } finally {
      readerRef.current?.releaseLock();
    }
  };

  const disconnect = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
      }
      if (writeRef.current) {
        writeRef.current.releaseLock();
      }
      if (portRef.current) {
        await portRef.current.close();
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      portRef.current = null;
      readerRef.current = null;
      writeRef.current = null;
      setIsConnected(false);
      term.current?.writeln('\x1b[1;31mDisconnected.\x1b[0m');
    }
  };

  const clearTerminal = () => {
    term.current?.clear();
  };

  if (!isSupported) {
    return (
      <GlassCard className="p-8 text-center border-red-500/30">
        <h2 className="text-xl font-bold text-red-400 mb-4">Browser Not Supported</h2>
        <p className="text-slate-400">
          The Web Serial API is required for this virtual terminal. 
          Please use a modern browser like **Chrome, Edge, or Opera**.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-obsidian/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-md font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-slate-500" />
            <select 
              value={baudRate} 
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={isConnected}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
            >
              {BAUD_RATES.map(rate => (
                <option key={rate} value={rate}>{rate} baud</option>
              ))}
            </select>
          </div>
          
          {isConnected ? (
            <button 
              onClick={disconnect}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg font-bold text-sm transition-all"
            >
              <Square size={16} /> Disconnect
            </button>
          ) : (
            <button 
              onClick={connect}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            >
              <Play size={16} /> Open Port
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={clearTerminal}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Clear Terminal"
          >
            <Trash2 size={18} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/50 border border-slate-800 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 flex flex-col min-h-[400px] bg-[#000000] rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden group">
        {/* Terminal Header Decoration */}
        <div className="flex-none h-9 bg-slate-800/40 border-b border-slate-700/30 flex items-center justify-between px-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <TerminalIcon size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PuTTY Serial Terminal</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
          </div>
        </div>
        
        {/* The XTerm Div Wrapper */}
        <div className="flex-1 relative bg-black">
          <div 
            ref={terminalRef} 
            className="absolute inset-0"
          />
          
          {error && (
            <div className="absolute bottom-4 left-4 right-4 p-3 bg-red-900/60 border border-red-500/30 rounded-lg backdrop-blur-md text-xs text-red-200 flex justify-between items-start z-20 animate-in fade-in slide-in-from-bottom-2">
               <span>Error: {error}</span>
               <button onClick={() => setError(null)} className="hover:text-white transition-colors"><X size={14} /></button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-500 font-mono text-center">
        Note: Web Serial API permissions are granted per-origin. Ensure your device is ready before clicking 'Open Port'.
      </p>
    </div>
  );
};
