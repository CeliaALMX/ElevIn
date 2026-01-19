import React from 'react';
import { MessageCircle, Search, AlertTriangle, Check, ChevronDown } from 'lucide-react';
import Card from '../ui/Card'; // Asumimos que extraes Card a su propio archivo o lo usas desde App
import Button from '../ui/Button';

// Mock data local para visualización
const TECHNICAL_THREADS = [
  { id: 1, title: 'Error 50 en equipo Schindler 3300', author: 'Carlos Ruiz', status: 'resolved', replies: 12, tag: 'Tracción' },
  { id: 2, title: 'Ruido en operador de puertas Fermator', author: 'Ana López', status: 'open', replies: 3, tag: 'Puertas' },
  { id: 3, title: 'Duda sobre normativa EN-81-20 foso reducido', author: 'Ing. Pedro', status: 'open', replies: 0, tag: 'Normativa' },
];

const SupportView = () => {
  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4 px-4">
      {/* Header de Soporte */}
      <div className="bg-blue-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="text-yellow-400" /> Centro de Soporte
          </h2>
          <p className="text-blue-200 text-sm mt-1">Resuelve fallas con la ayuda de la comunidad.</p>
          <div className="mt-4 flex gap-2">
             <div className="flex-1 bg-blue-800/50 rounded-lg flex items-center px-3 border border-blue-700">
               <Search size={18} className="text-blue-300" />
               <input 
                 placeholder="Buscar código de error..." 
                 className="bg-transparent border-none p-2 w-full outline-none text-white text-sm placeholder-blue-400"
               />
             </div>
             <Button className="whitespace-nowrap">Preguntar</Button>
          </div>
        </div>
      </div>

      {/* Lista de Hilos */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-700 dark:text-gray-300 px-1">Discusiones Recientes</h3>
        {TECHNICAL_THREADS.map((thread) => (
          <div key={thread.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border border-gray-100 dark:border-slate-700 hover:border-blue-300 transition-colors cursor-pointer">
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mb-1 inline-block ${
                  thread.tag === 'Tracción' ? 'bg-orange-100 text-orange-700' :
                  thread.tag === 'Puertas' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {thread.tag}
                </span>
                <h4 className="font-bold text-blue-900 dark:text-white text-lg leading-tight">{thread.title}</h4>
                <p className="text-xs text-gray-500 mt-1">Iniciado por {thread.author}</p>
              </div>
              {thread.status === 'resolved' ? (
                 <span className="bg-green-100 text-green-700 p-1 rounded-full"><Check size={16} /></span>
              ) : (
                 <span className="bg-gray-100 text-gray-400 p-1 rounded-full"><MessageCircle size={16} /></span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 border-t dark:border-slate-700 pt-2">
              <span className="flex items-center gap-1"><MessageCircle size={14}/> {thread.replies} respuestas</span>
              <span className="flex items-center gap-1 text-blue-600 font-medium">Ver solución <ChevronDown size={14}/></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupportView;