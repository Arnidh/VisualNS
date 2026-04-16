import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, RefreshCw, Key, ShieldCheck, ChevronRight, Info, BookOpen, Binary, ArrowRight } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { 
  subBytes, 
  shiftRows, 
  mixColumns, 
  addRoundKey, 
  keyExpansion, 
  hexToMatrix, 
  matrixToHex,
  SBOX
} from '../utils/aesEngine';

type AesStep = 'IDLE' | 'SUB_BYTES' | 'SHIFT_ROWS' | 'MIX_COLUMNS' | 'ADD_ROUND_KEY';

interface SimulationState {
  matrix: number[][];
  round: number;
  step: AesStep;
  roundKeys: number[][][];
  isAutoPlaying: boolean;
}

const DEFAULT_PLAINTEXT = "00112233445566778899aabbccddeeff";
const DEFAULT_KEY = "000102030405060708090a0b0c0d0e0f";

export const AesSimulation: React.FC = () => {
  const [plaintext, setPlaintext] = useState(DEFAULT_PLAINTEXT);
  const [encryptionKey, setEncryptionKey] = useState(DEFAULT_KEY);
  
  const [sim, setSim] = useState<SimulationState>({
    matrix: hexToMatrix(DEFAULT_PLAINTEXT),
    round: 0,
    step: 'IDLE',
    roundKeys: keyExpansion(hexToMatrix(DEFAULT_KEY).flat()),
    isAutoPlaying: false
  });

  const [history, setHistory] = useState<SimulationState[]>([]);

  // Calculate detailed operation math for the side panel
  const details = useMemo(() => {
    const lines: { label: string, math: string, highlight?: boolean }[] = [];
    const currentMatrix = sim.matrix;
    const currentKey = sim.roundKeys[sim.round];

    switch (sim.step) {
      case 'SUB_BYTES':
        lines.push({ label: 'Logic', math: 'State[r,c] = SBox[State[r,c]]', highlight: true });
        // Show first 4 substitutions as examples
        for (let i = 0; i < 4; i++) {
          const val = currentMatrix[i % 4][Math.floor(i / 4)];
          lines.push({ label: `Cell [${i%4},${Math.floor(i/4)}]`, math: `0x${val.toString(16).toUpperCase()} → 0x${SBOX[val].toString(16).toUpperCase()}` });
        }
        break;
      case 'SHIFT_ROWS':
        lines.push({ label: 'Logic', math: 'Cyclic shift row r by r bytes', highlight: true });
        lines.push({ label: 'Row 0', math: 'No shift' });
        lines.push({ label: 'Row 1', math: 'Shift left 1' });
        lines.push({ label: 'Row 2', math: 'Shift left 2' });
        lines.push({ label: 'Row 3', math: 'Shift left 3' });
        break;
      case 'MIX_COLUMNS':
        lines.push({ label: 'Logic', math: 'Matrix multiplication in GF(2^8)', highlight: true });
        lines.push({ label: 'Column 0', math: '[0x02 0x03 0x01 0x01] × Col' });
        break;
      case 'ADD_ROUND_KEY':
        lines.push({ label: 'Logic', math: 'State ⊕ RoundKey', highlight: true });
        for (let i = 0; i < 4; i++) {
          const sVal = currentMatrix[i % 4][Math.floor(i / 4)];
          const kVal = currentKey[i % 4][Math.floor(i / 4)];
          lines.push({ 
            label: `Cell [${i%4},${Math.floor(i/4)}]`, 
            math: `0x${sVal.toString(16).toUpperCase()} ⊕ 0x${kVal.toString(16).toUpperCase()} = 0x${(sVal ^ kVal).toString(16).toUpperCase()}` 
          });
        }
        break;
      case 'IDLE':
        lines.push({ label: 'Status', math: history.length > 0 ? 'Encryption Complete' : 'Ready to Start' });
        break;
    }
    return lines;
  }, [sim, history.length]);

  const stepInfo = useMemo(() => {
    switch (sim.step) {
      case 'IDLE': return { label: 'Start', desc: 'Initialize state with plaintext.' };
      case 'SUB_BYTES': return { label: 'SubBytes', desc: 'Non-linear substitution step.' };
      case 'SHIFT_ROWS': return { label: 'ShiftRows', desc: 'Transposition step for diffusion.' };
      case 'MIX_COLUMNS': return { label: 'MixColumns', desc: 'Linear mixing for diffusion.' };
      case 'ADD_ROUND_KEY': return { label: 'AddRoundKey', desc: 'XORing state with Round Key.' };
      default: return { label: '', desc: '' };
    }
  }, [sim.step]);

  const handleReset = useCallback(() => {
    const keys = keyExpansion(hexToMatrix(encryptionKey).flat());
    setSim({
      matrix: hexToMatrix(plaintext),
      round: 0,
      step: 'IDLE',
      roundKeys: keys,
      isAutoPlaying: false
    });
    setHistory([]);
  }, [plaintext, encryptionKey]);

  const nextStep = useCallback(() => {
    setHistory(prev => [...prev, { ...sim }]);
    
    setSim(current => {
      let nextMatrix = [...current.matrix.map(row => [...row])];
      let nextRound = current.round;
      let nextStep: AesStep = 'IDLE';

      if (current.step === 'IDLE') {
        nextStep = 'ADD_ROUND_KEY';
      } else if (current.round === 0) {
        nextStep = 'SUB_BYTES';
        nextRound = 1;
      } else if (current.round < 10) {
        switch (current.step) {
          case 'SUB_BYTES':
            nextMatrix = subBytes(current.matrix);
            nextStep = 'SHIFT_ROWS';
            break;
          case 'SHIFT_ROWS':
            nextMatrix = shiftRows(current.matrix);
            nextStep = 'MIX_COLUMNS';
            break;
          case 'MIX_COLUMNS':
            nextMatrix = mixColumns(current.matrix);
            nextStep = 'ADD_ROUND_KEY';
            break;
          case 'ADD_ROUND_KEY':
            nextMatrix = addRoundKey(current.matrix, current.roundKeys[current.round]);
            nextStep = 'SUB_BYTES';
            nextRound = current.round + 1;
            break;
        }
      } else if (current.round === 10) {
        switch (current.step) {
          case 'SUB_BYTES':
            nextMatrix = subBytes(current.matrix);
            nextStep = 'SHIFT_ROWS';
            break;
          case 'SHIFT_ROWS':
            nextMatrix = shiftRows(current.matrix);
            nextStep = 'ADD_ROUND_KEY';
            break;
          case 'ADD_ROUND_KEY':
             nextMatrix = addRoundKey(current.matrix, current.roundKeys[10]);
             nextStep = 'IDLE'; 
             break;
        }
      }

      if (current.step === 'IDLE' && nextStep === 'ADD_ROUND_KEY') {
          nextMatrix = addRoundKey(current.matrix, current.roundKeys[0]);
      }

      return {
        ...current,
        matrix: nextMatrix,
        round: nextRound,
        step: nextStep,
        isAutoPlaying: nextStep === 'IDLE' ? false : current.isAutoPlaying
      };
    });
  }, [sim]);

  useEffect(() => {
    let timer: any;
    if (sim.isAutoPlaying && sim.step !== 'IDLE' || (sim.step === 'IDLE' && history.length === 0 && sim.isAutoPlaying)) {
       timer = setTimeout(nextStep, 1500);
    }
    return () => clearTimeout(timer);
  }, [sim.isAutoPlaying, sim.step, nextStep, history.length]);

  return (
    <div className="flex flex-col gap-8">
      {/* TOP SECTION: MATRIX (LEFT) + DETAILS (RIGHT) */}
      <div className="flex flex-col xl:flex-row gap-8">
        {/* Left: Matrix Display */}
        <div className="flex-1">
          <GlassCard className="h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
                <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2
                  ${sim.isAutoPlaying ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${sim.isAutoPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                    {sim.isAutoPlaying ? 'Live Processing' : 'System Idle'}
                </div>
            </div>

            <div className="p-8 pb-12">
              <div className="mb-10">
                <h3 className="text-3xl font-black text-white flex items-center gap-3">
                  <Binary className="text-blue-400" />
                  Internal State
                </h3>
                <p className="text-slate-400 font-mono text-sm mt-1 uppercase tracking-[0.2em]">
                  Round {sim.round} <span className="text-slate-600">/</span> {stepInfo.label}
                </p>
              </div>

              <div className="flex justify-center py-10">
                <div className="grid grid-cols-4 gap-4 sm:gap-6 p-6 bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)] relative">
                  <AnimatePresence mode="popLayout">
                    {sim.matrix.map((row, r) => (
                      row.map((byte, c) => (
                        <motion.div
                          key={`${r}-${c}-${byte}-${sim.step}`}
                          layoutId={`${r}-${c}`}
                          initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
                          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                          exit={{ opacity: 0, scale: 0.5, rotateY: -90 }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          className={`w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center rounded-2xl border-2 font-mono text-2xl font-black transition-all duration-500
                            ${sim.step === 'SUB_BYTES' ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 
                              sim.step === 'SHIFT_ROWS' ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.15)]' :
                              sim.step === 'MIX_COLUMNS' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]' :
                              'bg-slate-800/40 border-slate-700/50 text-white'}`}
                        >
                          {byte.toString(16).padStart(2, '0').toUpperCase()}
                        </motion.div>
                      ))
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Interaction Controls */}
              <div className="flex justify-center gap-4">
                 <button 
                   onClick={handleReset}
                   className="p-3 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white border border-slate-700/50 transition-all active:scale-95"
                 >
                   <RefreshCw size={24} />
                 </button>
                 <button 
                    onClick={() => setSim(s => ({ ...s, isAutoPlaying: !s.isAutoPlaying }))}
                    className={`flex items-center gap-3 px-10 py-4 rounded-xl font-black text-lg transition-all transform active:scale-95
                      ${sim.isAutoPlaying ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-blue-600 text-white shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)]'}`}
                  >
                    {sim.isAutoPlaying ? <><Pause size={24} /> Pause</> : <><Play size={24} /> Start Simulation</>}
                  </button>
                  <button 
                   onClick={nextStep}
                   className="p-3 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white border border-slate-700/50 transition-all active:scale-95"
                 >
                   <SkipForward size={24} />
                 </button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right: Detailed Operations */}
        <div className="w-full xl:w-[480px]">
          <GlassCard className="h-full flex flex-col p-8 !bg-slate-900/40">
             <div className="mb-6 flex items-center justify-between">
                <div>
                   <h3 className="text-xl font-black text-white flex items-center gap-2">
                     <BookOpen className="text-purple-400" size={20} />
                     Step Mechanics
                   </h3>
                   <p className="text-xs text-slate-500 font-mono mt-1 uppercase">Detailed Mathematical View</p>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                   <Info className="text-purple-400" size={16} />
                </div>
             </div>

             <div className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[600px] custom-scrollbar">
                {details.map((line, idx) => (
                   <motion.div 
                     initial={{ opacity: 0, x: 10 }}
                     animate={{ opacity: 1, x: 0 }}
                     key={`${sim.step}-${idx}`}
                     className={`p-4 rounded-xl border transition-all
                       ${line.highlight ? 'bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20' : 'bg-slate-800/40 border-slate-700/50'}`}
                   >
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{line.label}</div>
                      <div className={`font-mono font-bold ${line.highlight ? 'text-blue-300' : 'text-slate-300'}`}>
                         {line.math}
                      </div>
                   </motion.div>
                ))}

                {sim.step === 'ADD_ROUND_KEY' && (
                  <div className="mt-8 pt-6 border-t border-slate-800">
                     <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Round Key Segment</h4>
                     <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 font-mono text-purple-400 text-sm break-all">
                        {matrixToHex(sim.roundKeys[sim.round])}
                     </div>
                  </div>
                )}
             </div>

             <div className="mt-6 p-4 glass-panel !bg-slate-900/60 border-slate-700/50">
                <p className="text-sm text-slate-400 leading-relaxed italic">
                   "{stepInfo.desc}"
                </p>
             </div>
          </GlassCard>
        </div>
      </div>

      {/* BOTTOM SECTION: STEPS EXPLORER */}
      <GlassCard className="p-6 !bg-slate-950/20">
         <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
               <div key={r} className="flex items-center">
                  <button 
                    onClick={() => {
                        const keys = keyExpansion(hexToMatrix(encryptionKey).flat());
                        setSim(s => ({ ...s, round: r, step: 'IDLE', matrix: r === 0 ? hexToMatrix(plaintext) : s.matrix, roundKeys: keys }));
                    }}
                    className={`flex flex-col items-center gap-2 group transition-all shrink-0
                      ${sim.round === r ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                  >
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all
                        ${sim.round === r ? 'bg-blue-600 text-white ring-4 ring-blue-500/20' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'}`}>
                        {r}
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">
                        {r === 0 ? 'Init' : r === 10 ? 'Final' : `Round ${r}`}
                     </span>
                  </button>
                  {r < 10 && (
                     <div className="mx-4 text-slate-800">
                        <ArrowRight size={16} />
                     </div>
                  )}
               </div>
            ))}
         </div>
      </GlassCard>

      {/* FOOTER: INPUTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
         <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-1">Plaintext Segment (32 hex chars)</label>
            <input 
               type="text" 
               value={plaintext}
               onChange={(e) => setPlaintext(e.target.value)}
               className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 font-mono text-blue-400 focus:border-blue-500 outline-none transition-all shadow-inner"
            />
         </div>
         <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-1">Master Key (128-bit hex)</label>
            <input 
               type="text" 
               value={encryptionKey}
               onChange={(e) => setEncryptionKey(e.target.value)}
               className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 font-mono text-purple-400 focus:border-purple-500 outline-none transition-all shadow-inner"
            />
         </div>
      </div>
    </div>
  );
};
