import React from 'react';
import { Search, MapPin, Building, Briefcase } from 'lucide-react';
import Card from '../ui/Card'; // Asumimos componente Card compartido
import Button from '../ui/Button';

const JobsView = ({ jobs, onApply }) => (
  <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4 px-4">
    <div className="flex items-center gap-2 mb-4 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
      <Search className="text-gray-400" size={20} />
      <input
        placeholder="Buscar empleos (ej. Técnico, Supervisor)..."
        className="flex-1 outline-none dark:bg-transparent dark:text-white text-sm"
      />
    </div>

    {jobs.map((job) => (
      <Card key={job.id} className="border-l-4 border-l-yellow-400 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-blue-900 dark:text-white">
              {job.title}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 flex items-center gap-1 font-medium">
              <Building size={14} className="text-blue-500"/> {job.company}
            </div>
          </div>
          <span className="text-[10px] bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">
            NUEVO
          </span>
        </div>
        
        <div className="flex gap-3 text-xs text-gray-500 mt-3 bg-gray-50 dark:bg-slate-900/50 p-2 rounded-lg">
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {job.location}
          </span>
          <span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-400">
            <Briefcase size={12} /> {job.salary}
          </span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2 leading-relaxed">
          {job.description}
        </p>
        
        <div className="mt-4 flex justify-end items-center gap-2 pt-2 border-t dark:border-slate-700">
          <span className="text-xs text-gray-400 mr-auto">Publicado hace 2 días</span>
          <Button onClick={() => onApply(job.title)} className="text-sm py-1.5 px-4 shadow-md shadow-yellow-500/20">
            Postularme Ahora
          </Button>
        </div>
      </Card>
    ))}
  </div>
);

export default JobsView;