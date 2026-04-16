import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, ChevronDown, ChevronRight } from 'lucide-react';

type Topic = {
  id: string;
  title: string;
  intro: string;
  commands: { cmd: string; note?: string }[];
};

const TOPICS: Topic[] = [
  {
    id: 'basics',
    title: 'Session basics (PuTTY / serial or Telnet / SSH)',
    intro: 'Connect to the ICX7150, enter privileged EXEC, then global configuration. Commands follow Cisco-style CLI patterns common on Ruckus/Brocade ICX.',
    commands: [
      { cmd: 'en', note: 'short for enable — enters privileged EXEC (privileged mode)' },
      { cmd: 'enable' },
      { cmd: 'show version' },
      { cmd: 'show running-config' },
      { cmd: 'configure terminal', note: 'or: config t — enter global configuration mode' },
      { cmd: 'config t' },
      { cmd: 'exit', note: 'step back one mode; use end or Ctrl+Z to leave config to privileged EXEC' },
      { cmd: 'end' },
      { cmd: 'write memory', note: 'save running-config to startup-config (vendor wording may vary)' },
    ],
  },
  {
    id: 'intro-lab',
    title: 'Introduction: Switch mode vs Router mode (ICX7150)',
    intro: 'Know which context you are in. Switching focuses on L2; routing on L3 interfaces and protocols.',
    commands: [
      { cmd: 'show system' },
      { cmd: 'show ip interface brief' },
      { cmd: 'show vlan' },
      { cmd: 'ip routing', note: 'often used when enabling router behavior / L3 (lab-dependent)' },
    ],
  },
  {
    id: 'telnet-ping',
    title: 'Switch mode — Telnet and ping (same network)',
    intro: 'Verify L2/L3 reachability from the management path your lab uses.',
    commands: [
      { cmd: 'telnet <ip-address>' },
      { cmd: 'ping <ip-address>' },
      { cmd: 'ping <ip> source vlan <id>', note: 'if your image supports sourcing from a VLAN/SVI' },
      { cmd: 'traceroute <ip-address>', note: 'if enabled' },
    ],
  },
  {
    id: 'vlan',
    title: 'Switch mode — VLANs (same VLAN talks; different VLANs isolated)',
    intro: 'Create VLANs, assign access ports, and verify with show commands.',
    commands: [
      { cmd: 'vlan <id>', note: 'under config; or vlan batch style per your lab script' },
      { cmd: 'interface ethernet <port>' },
      { cmd: 'switchport access vlan <id>' },
      { cmd: 'switchport mode access' },
      { cmd: 'show vlan' },
      { cmd: 'show interfaces brief' },
    ],
  },
  {
    id: 'inter-vlan',
    title: 'Router mode — Inter-VLAN routing',
    intro: 'Typically SVIs or routed interfaces with IP addresses; hosts use the SVI as default gateway.',
    commands: [
      { cmd: 'interface ve <id>', note: 'SVI for VLAN — syntax varies by image; sometimes vlan <id> interface' },
      { cmd: 'ip address <addr> <mask>' },
      { cmd: 'ip helper-address <dhcp-server>', note: 'if relaying DHCP in lab' },
      { cmd: 'show ip route' },
      { cmd: 'show ip interface' },
    ],
  },
  {
    id: 'acl',
    title: 'Router mode — Access Control Lists (hardware lab)',
    intro: 'Define traffic classes, apply to interfaces in the correct direction (in/out).',
    commands: [
      { cmd: 'ip access-list extended <name>' },
      { cmd: 'permit ip <src> <wildcard> <dst> <wildcard>' },
      { cmd: 'deny ip any any' },
      { cmd: 'interface <intf>' },
      { cmd: 'ip access-group <name> in' },
      { cmd: 'show access-list' },
    ],
  },
  {
    id: 'ros',
    title: 'Router mode — Router-on-a-Stick',
    intro: 'One physical interface toward a switch with subinterfaces or tagged VLANs; correlate with your physical cabling.',
    commands: [
      { cmd: 'interface ethernet <port>.<sub>' },
      { cmd: 'encapsulation dot1q <vlan-id>' },
      { cmd: 'ip address <addr> <mask>' },
      { cmd: 'show interface' },
    ],
  },
  {
    id: 'ospf',
    title: 'Router mode — OSPF',
    intro: 'Enable the routing process, advertise networks, and verify neighbors/routes.',
    commands: [
      { cmd: 'router ospf' },
      { cmd: 'area <id>' },
      { cmd: 'network <prefix> <wildcard> area <id>' },
      { cmd: 'show ip ospf neighbor' },
      { cmd: 'show ip ospf database' },
      { cmd: 'show ip route ospf' },
    ],
  },
  {
    id: 'dhcp-snoop',
    title: 'DHCP snooping',
    intro: 'Trust uplinks, untrust access ports, verify bindings.',
    commands: [
      { cmd: 'ip dhcp snooping' },
      { cmd: 'ip dhcp snooping vlan <id>' },
      { cmd: 'interface <intf>' },
      { cmd: 'ip dhcp snooping trust' },
      { cmd: 'show ip dhcp snooping' },
      { cmd: 'show ip dhcp snooping binding' },
    ],
  },
  {
    id: 'port-sec',
    title: 'Port security',
    intro: 'Aligns with your port-security lab: enable on access ports, set maximum MACs, violation action.',
    commands: [
      { cmd: 'interface ethernet <port>' },
      { cmd: 'port security' },
      { cmd: 'port security maximum <n>' },
      { cmd: 'port security violation restrict', note: 'or shutdown / protect per policy' },
      { cmd: 'show port security' },
      { cmd: 'show mac-address' },
    ],
  },
];

export const IcxCliReferencePanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>('basics');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
      >
        <Terminal size={16} />
        CLI reference
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
              className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-white">ICX / PuTTY-style CLI reference</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Patterns for lab topics — exact syntax can vary by FastIron/ICX version; confirm with <code className="text-emerald-400">?</code> in each mode.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                {TOPICS.map((topic) => {
                  const isOpen = expanded === topic.id;
                  return (
                    <div key={topic.id} className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : topic.id)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
                      >
                        {isOpen ? <ChevronDown size={18} className="text-emerald-500 shrink-0" /> : <ChevronRight size={18} className="text-slate-500 shrink-0" />}
                        <span className="font-semibold text-slate-200 text-sm">{topic.title}</span>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-0 border-t border-slate-800/80">
                          <p className="text-xs text-slate-500 leading-relaxed mb-3">{topic.intro}</p>
                          <ul className="space-y-2 font-mono text-xs">
                            {topic.commands.map((c, i) => (
                              <li key={i} className="rounded-lg bg-slate-950/80 border border-slate-800 px-3 py-2">
                                <code className="text-emerald-300">{c.cmd}</code>
                                {c.note && <p className="text-slate-500 mt-1 font-sans text-[11px] leading-snug">{c.note}</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
