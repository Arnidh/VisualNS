import React from 'react';
import { AesSimulation } from '../components/AesSimulation';
import { Shield, Lock, Zap } from 'lucide-react';

export const CryptoModule: React.FC = () => {
  return (
    <div className="min-h-full pb-20">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <Lock className="text-blue-400" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Cryptography Lab
            </h1>
            <p className="text-slate-400 font-medium">
              Interactive Block Cipher & Protocol Visualizer
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <Badge icon={<Shield size={12}/>} text="NIST FIPS-197" color="blue" />
          <Badge icon={<Zap size={12}/>} text="AES-128 Standard" color="purple" />
        </div>
      </header>

      <AesSimulation />
    </div>
  );
};

const Badge: React.FC<{ icon: React.ReactNode, text: string, color: 'blue' | 'purple' }> = ({ icon, text, color }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
    ${color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
    {icon}
    {text}
  </div>
);
