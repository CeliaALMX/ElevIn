import React from 'react';

export const DesktopNavLink = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center h-full px-4 border-b-4 transition-colors ${active ? 'border-gold-premium text-gold-premium' : 'border-transparent text-softgray hover:text-ivory hover:bg-emerald-medium/50'}`}>
    <Icon size={22} strokeWidth={active ? 3 : 2} /> <span className="text-xs mt-1">{label}</span>
  </button>
);

export const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 w-full p-1 rounded-lg ${active ? 'text-emerald-deep dark:text-gold-premium bg-gold-premium/10 dark:bg-emerald-dark/40' : 'text-softgray hover:text-emerald-deep dark:hover:text-ivory'}`}>
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);