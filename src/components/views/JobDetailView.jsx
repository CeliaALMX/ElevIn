import React from 'react';
import { ArrowLeft, MapPin, Building, Briefcase, Calendar, Clock, CheckCircle, Share2, Flag, DollarSign, Check } from 'lucide-react';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

const JobDetailView = ({ job, onBack, onApply, userRole, isApplied, onReport }) => {
  if (!job) return null;
  const isCompany = userRole === 'Empresa';

  return (
    <div className="w-full min-h-screen bg-white dark:bg-slate-900 animate-in slide-in-from-right-4 duration-300">
      
      {/* Barra Navegación */}
      <div className="sticky top-16 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between shadow-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold text-sm">
          <ArrowLeft size={18} /> <span>Regresar a Empleos</span>
        </button>
        
        <div className="flex items-center gap-3">
             <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <Share2 size={18} />
             </button>
             {!isCompany && (
               /* Botón Header: También cambia estado */
               <Button 
                 onClick={() => !isApplied && onApply(job.id, job.title)} 
                 disabled={isApplied}
                 size="sm" 
                 className={`hidden sm:flex text-xs py-1.5 h-8 ${isApplied ? 'bg-green-600 hover:bg-green-700 border-green-600 text-white cursor-default' : ''}`}
               >
                 {isApplied ? (
                   <> <Check size={14} className="mr-1"/> CV Enviado </>
                 ) : 'Postularme'}
               </Button>
             )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 pb-8 border-b border-gray-100 dark:border-slate-800">
           <div className="shrink-0">
              <Avatar initials={job.companyInitials} src={job.companyAvatar} size="xl" className="rounded-lg bg-gray-50 dark:bg-slate-800 text-2xl" />
           </div>
           <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                {job.title}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-600 dark:text-gray-300 text-sm">
                 <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Building size={16} /> {job.company}
                 </span>
                 <span className="hidden sm:inline text-gray-300">|</span>
                 <span className="flex items-center gap-1.5">
                    <MapPin size={16} /> {job.location}
                 </span>
                 <span className="hidden sm:inline text-gray-300">|</span>
                 <span className="text-gray-400">Publicado {job.postedAtRelative}</span>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                 <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md uppercase tracking-wide">
                    {job.type}
                 </span>
                 <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-md uppercase tracking-wide flex items-center gap-1">
                    <DollarSign size={12} /> {job.salary}
                 </span>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Contenido Izquierdo */}
          <div className="lg:col-span-8 space-y-8">
            <section>
               <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Descripción del Puesto</h3>
               <p className="text-gray-600 dark:text-gray-300 leading-7 text-base whitespace-pre-line">
                 {job.description}
               </p>
            </section>

            {job.responsibilities && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Responsabilidades Clave</h3>
                <ul className="space-y-3">
                  {job.responsibilities.split('\n').map((item, idx) => (
                    item.trim() && (
                      <li key={idx} className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                        <CheckCircle size={18} className="text-blue-500 mt-1 shrink-0" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    )
                  ))}
                </ul>
              </section>
            )}

            <section className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-xl border border-gray-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Detalles Operativos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Horario Laboral</p>
                        <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
                            <Clock size={16} className="text-blue-500"/>
                            {job.schedule || 'A convenir'}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Días de Trabajo</p>
                        <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
                            <Calendar size={16} className="text-blue-500"/>
                            {job.workDays || 'Lunes a Viernes'}
                        </div>
                    </div>
                </div>
            </section>
          </div>

          {/* Sidebar Derecho */}
          <div className="lg:col-span-4">
             <div className="sticky top-32 p-6 bg-blue-50 dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4">
                   {isApplied ? '¡Ya te has postulado!' : '¿Te interesa este puesto?'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                   {isApplied 
                     ? 'Tu currículum ha sido enviado a la empresa. Te notificarán si tu perfil es seleccionado.' 
                     : 'Lee detenidamente los requisitos. Si tu perfil encaja, la empresa recibirá tu CV automáticamente.'}
                </p>

                {!isCompany ? (
                   <Button 
                     onClick={() => !isApplied && onApply(job.id, job.title)} 
                     disabled={isApplied}
                     className={`w-full py-3 text-base mb-3 transition-all ${
                       isApplied 
                       ? 'bg-green-600 hover:bg-green-700 text-white border-transparent shadow-none cursor-default' 
                       : 'shadow-lg shadow-blue-500/20'
                     }`}
                   >
                     {isApplied ? (
                       <div className="flex items-center justify-center gap-2"><CheckCircle size={20}/> CV Enviado</div>
                     ) : (
                       'Postularme Ahora'
                     )}
                   </Button>
                ) : (
                    <div className="w-full py-2.5 bg-white dark:bg-slate-900 text-center text-gray-400 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 mb-3 cursor-not-allowed">
                       Vista de Reclutador
                    </div>
                )}
                
                <div className="text-center">
                    <button 
                      onClick={() => onReport(job)} 
                      className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 underline flex items-center justify-center gap-1 w-full transition-colors"
                    >
                        <Flag size={12} /> Reportar este empleo
                    </button>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default JobDetailView;