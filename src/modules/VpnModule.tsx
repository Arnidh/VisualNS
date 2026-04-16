import React from 'react';
import { SerialTerminal } from '../components/SerialTerminal';
import { IcxCliReferencePanel } from '../components/IcxCliReferencePanel';

export const VpnModule: React.FC = () => {
  return (
    <div className="h-full flex flex-col gap-6 animate-float">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-400 mb-2">VPNs & QoS</h1>
          <p className="text-slate-400">Virtual PuTTY Terminal: Connect directly to your hardware via COM ports.</p>
        </div>
        <div className="shrink-0 self-end sm:self-start">
          <IcxCliReferencePanel />
        </div>
      </header>
      
      <div className="flex-1 min-h-0">
        <SerialTerminal />
      </div>
    </div>
  );
};
