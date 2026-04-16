import React from 'react';
import { PortSecuritySim } from '../components/PortSecuritySim';
import { ShieldAlert, Fingerprint, Activity } from 'lucide-react';

export const AttacksModule: React.FC = () => {
  return (
    <div className="min-h-full pb-20">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
            <ShieldAlert className="text-red-400" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Security & Defense
            </h1>
            <p className="text-slate-400 font-medium">
              Layer 2 Protection & Port Security Lab
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <Badge icon={<Fingerprint size={12}/>} text="MAC Filtering" color="red" />
          <Badge icon={<Activity size={12}/>} text="Violation Monitoring" color="amber" />
        </div>
      </header>

      <PortSecuritySim />
    </div>
  );
};

const Badge: React.FC<{ icon: React.ReactNode, text: string, color: 'red' | 'amber' }> = ({ icon, text, color }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
    ${color === 'red' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
    {icon}
    {text}
  </div>
);
