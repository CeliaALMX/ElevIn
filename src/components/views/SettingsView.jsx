import React from 'react';
import { Moon, Sun } from 'lucide-react';

const SettingsView = ({ isDarkMode, toggleTheme }) => (
  <div className="pb-24 pt-4 max-w-2xl mx-auto px-4">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Configuración</h2>
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between shadow border border-gray-100 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isDarkMode ? 'bg-blue-900 text-yellow-400' : 'bg-yellow-100 text-orange-500'}`}>{isDarkMode ? <Moon size={20} /> : <Sun size={20} />}</div>
        <div><h4 className="font-bold text-gray-900 dark:text-white">Modo Oscuro</h4><p className="text-xs text-gray-500">Ajusta el tema visual</p></div>
      </div>
      <button onClick={toggleTheme} className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
    </div>
  </div>
);

export default SettingsView;