import React from 'react';
import { Search, MapPin, Building, Briefcase, PlusCircle, Clock, Check } from 'lucide-react';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

const JobsView = ({ jobs, onViewDetail, userRole, onCreateJobClick, appliedJobs = [] }) => {
  const isCompany = userRole === 'Empresa';

  return (
    <div className="pb-24 pt-4 max-w-3xl mx-auto space-y-6">
      
      <div className="flex flex-col gap-4">
        {isCompany && (
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 rounded-2xl shadow-lg flex justify-between items-center text-white">
            <div>
              <h3 className="font-bold text-xl">Panel de Reclutamiento</h3>
              <p className="text-sm text-blue-200 opacity-90 mt-1">Gestiona tus vacantes y encuentra talento.</p>
            </div>
            <Button onClick={onCreateJobClick} className="bg-white text-blue-900 hover:bg-blue-50 border-none flex items-center gap-2 shadow-none font-bold">
              <PlusCircle size={20} /> <span className="hidden sm:inline">Nueva Vacante</span>
            </Button>
          </div>
        )}

        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <Search className="text-gray-400" size={20} />
          <input
            placeholder="Buscar por puesto, empresa o alcaldía..."
            className="flex-1 outline-none dark:bg-transparent dark:text-white text-base"
          />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center opacity-50">
           <Briefcase size={64} className="mb-4 text-gray-300"/>
           <p className="text-gray-500 text-lg">No hay vacantes disponibles.</p>
        </div>
      ) : (
        jobs.map((job) => {
          // Verificamos si ya aplicó
          const isApplied = appliedJobs.includes(job.id);

          return (
            <div 
              key={job.id}
              onClick={() => onViewDetail(job)}
              className={`group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border p-6 transition-all hover:shadow-md cursor-pointer relative overflow-hidden ${isApplied ? 'border-green-200 dark:border-green-900/30' : 'border-gray-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'}`}
            >
              <div className="flex gap-5 relative z-10">
                <div className="shrink-0 pt-1">
                    <Avatar initials={job.companyInitials} src={job.companyAvatar} size="md" className="rounded-lg shadow-sm" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pr-4">
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {job.title}
                        </h3>
                        {/* Etiqueta de Postulado en la lista */}
                        {isApplied && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 uppercase tracking-wide border border-green-200 dark:border-green-800">
                            <Check size={10} strokeWidth={3} /> Postulado
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-400 whitespace-nowrap bg-gray-50 dark:bg-slate-700 px-2 py-1 rounded-full">
                          {job.postedAtRelative || 'Hoy'}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                      <Building size={14} /> {job.company}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                          <MapPin size={12} /> {job.location}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                          {job.salary}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full">
                          <Clock size={12} /> {job.type}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-700/50 flex justify-end">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                    Ver detalles completos &rarr;
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default JobsView;