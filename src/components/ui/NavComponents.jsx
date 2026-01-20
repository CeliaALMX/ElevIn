import React from 'react';

export const DesktopNavLink = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center h-full px-4 border-b-4 transition-colors ${active ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-800'}`}>
    <Icon size={22} strokeWidth={active ? 3 : 2} /> <span className="text-xs mt-1">{label}</span>
  </button>
);

export const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 w-full p-1 rounded-lg ${active ? 'text-blue-900 dark:text-yellow-400 bg-blue-50 dark:bg-white/5' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);