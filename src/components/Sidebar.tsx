import React from 'react';
import { NavLink } from 'react-router-dom';
import { Network, ShieldAlert, Cpu, Activity, Lock } from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 h-full glass-panel flex flex-col border-y-0 border-l-0 rounded-none border-r border-slate-700/50">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 flex items-center gap-2">
          <Network className="text-blue-400" />
          VisualNS
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-light">Interactive Network Architecture</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-8">
        <NavItem to="/tcp" icon={<Activity size={20} />} label="TCP Dynamics" />
        <NavItem to="/routing" icon={<Network size={20} />} label="Routing & SDN" />
        <NavItem to="/vpn" icon={<ShieldAlert size={20} />} label="VPNs & QoS" />
        <NavItem to="/crypto" icon={<Lock size={20} />} label="Cryptography" />
        <NavItem to="/attacks" icon={<Cpu size={20} />} label="Security & Defense" />
      </nav>

      <div className="p-4 border-t border-slate-700/50 text-xs text-slate-500 text-center">
        Weightless Tech Engine v1.0
      </div>
    </aside>
  );
};

const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string }> = ({ to, icon, label }) => {
  return (
    <NavLink 
      to={to} 
      className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </NavLink>
  );
};
