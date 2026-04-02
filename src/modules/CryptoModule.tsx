import React from 'react';
import { GlassCard } from '../components/GlassCard';

export const CryptoModule: React.FC = () => {
  return (
    <div className="h-full flex flex-col gap-6 animate-float">
      <header className="mb-4">
        <h1 className="text-4xl font-bold text-white mb-2">Cryptography</h1>
        <p className="text-slate-400">Block Ciphers & Quantum Math.</p>
      </header>
      <GlassCard className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Crypto block visualization pending.</p>
      </GlassCard>
    </div>
  );
};
