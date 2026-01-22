import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';

const REASONS = [
  "Es un fraude o estafa",
  "Pide dinero para aplicar",
  "Información falsa o engañosa",
  "Lenguaje ofensivo o discriminatorio",
  "La empresa no existe",
  "Otro motivo"
];

const ReportJobModal = ({ isOpen, onClose, onSubmit, jobTitle }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulamos un delay de red
    setTimeout(() => {
      onSubmit({ reason: selectedReason, details });
      setIsSubmitting(false);
      setSelectedReason('');
      setDetails('');
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="bg-red-50 dark:bg-red-900/20 p-4 border-b border-red-100 dark:border-red-900/30 flex justify-between items-start">
          <div className="flex gap-3">
             <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-full text-red-600 dark:text-red-400">
                <ShieldAlert size={24} />
             </div>
             <div>
               <h3 className="font-bold text-red-700 dark:text-red-300">Reportar Empleo</h3>
               <p className="text-xs text-red-600/80 dark:text-red-300/70 mt-0.5 max-w-[200px] truncate">
                 {jobTitle}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="text-red-400 hover:text-red-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
              ¿Cuál es el problema?
            </label>
            <div className="space-y-2">
              {REASONS.map((reason) => (
                <label key={reason} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <input 
                    type="radio" 
                    name="reason" 
                    value={reason}
                    required
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Detalles adicionales (Opcional)
            </label>
            <textarea 
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows="3"
              placeholder="Explica brevemente por qué reportas este empleo..."
              className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:border-red-500 dark:text-white resize-none text-sm"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedReason || isSubmitting}
              className={`flex-1 bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-500/20 ${isSubmitting ? 'opacity-70' : ''}`}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ReportJobModal;