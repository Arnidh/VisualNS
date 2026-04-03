import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-4 left-4 z-50 p-3 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all backdrop-blur-md shadow-lg"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ marginLeft: -256 }}
            animate={{ marginLeft: 0 }}
            exit={{ marginLeft: -256 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="h-full shrink-0 relative z-40"
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-1 h-full overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
