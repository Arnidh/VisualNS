import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X } from 'lucide-react';

export const AesTheoryModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-200 text-xs font-bold uppercase tracking-widest hover:bg-purple-500/20 transition-colors"
      >
        <BookOpen size={16} />
        How AES works
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
                <h2 className="text-lg font-bold text-white">AES-128 — static round structure</h2>
                <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" aria-label="Close">
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 text-sm text-slate-300 leading-relaxed">
                <section>
                  <h3 className="text-white font-semibold mb-2">State block</h3>
                  <p>
                    AES operates on a 4×4 byte <strong className="text-slate-200">state</strong> (128 bits). The plaintext and key you enter are interpreted as hex bytes and loaded into this
                    grid (column-major order in the engine).
                  </p>
                </section>

                <section>
                  <h3 className="text-white font-semibold mb-2">Initial round</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      <strong className="text-blue-300">AddRoundKey</strong> — XOR the state with the first 128 bits of the expanded key schedule (whitening).
                    </li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-white font-semibold mb-2">Rounds 1–9 (same pattern each round)</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      <strong className="text-blue-300">SubBytes</strong> — Each byte is replaced using a fixed S-box (non-linear substitution). This provides confusion: small input changes spread
                      unpredictably.
                    </li>
                    <li>
                      <strong className="text-purple-300">ShiftRows</strong> — Row <em>r</em> is rotated left by <em>r</em> bytes. This moves bytes between columns for diffusion.
                    </li>
                    <li>
                      <strong className="text-emerald-300">MixColumns</strong> — Each column is multiplied by a fixed matrix in GF(2⁸) (polynomial arithmetic mod an irreducible polynomial). Mixes
                      bytes within columns.
                    </li>
                    <li>
                      <strong className="text-amber-300">AddRoundKey</strong> — XOR with the round subkey from key expansion.
                    </li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-white font-semibold mb-2">Final round (round 10)</h3>
                  <p className="mb-2">There is no MixColumns in the last round:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>SubBytes</li>
                    <li>ShiftRows</li>
                    <li>AddRoundKey (with last round key)</li>
                  </ol>
                  <p className="mt-2 text-slate-400 text-xs">The ciphertext is read from the final state as hex.</p>
                </section>

                <section>
                  <h3 className="text-white font-semibold mb-2">Key expansion</h3>
                  <p>
                    The 128-bit key is expanded into <strong className="text-slate-200">11</strong> round keys (for AES-128). The simulator derives these internally; the “Round Key Segment” panel shows
                    the key material XORed at the current round.
                  </p>
                </section>

                <section>
                  <h3 className="text-white font-semibold mb-2">Using this visualization</h3>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
                    <li>Use <strong className="text-slate-300">Step</strong> (skip forward) to walk one transformation at a time and read the math on the right.</li>
                    <li>Default plaintext/key are valid 32-hex / 32-hex examples; change them and <strong className="text-slate-300">reset</strong> to re-init.</li>
                  </ul>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
