import React, { useState, useEffect } from 'react';
import { ArrowLeft, Briefcase, MapPin, DollarSign, Building, Clock, Calendar, ListChecks, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';

const ALCALDIAS_CDMX = [
  "Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán",
  "Cuajimalpa de Morelos", "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco",
  "Iztapalapa", "La Magdalena Contreras", "Miguel Hidalgo", "Milpa Alta",
  "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco"
];

const CreateJobView = ({ onCreate, onCancel, currentUser }) => {
  const [jobData, setJobData] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',
    description: '',
    responsibilities: '',
    schedule: '',
    workDays: '',
    type: 'Tiempo Completo'
  });

  // Autocompletar datos de empresa al cargar
  useEffect(() => {
    if (currentUser) {
      setJobData(prev => ({
        ...prev,
        company: currentUser.name || '',
        location: ALCALDIAS_CDMX[0]
      }));
    }
  }, [currentUser]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(jobData);
  };

  const handleChange = (e) => {
    setJobData({ ...jobData, [e.target.name]: e.target.value });
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* --- BARRA SUPERIOR FIJA --- */}
      <div className="sticky top-16 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Publicar Nueva Vacante
          </h1>
        </div>
        <div className="hidden sm:block text-xs text-gray-400 font-medium">
            Borrador • {currentUser?.name}
        </div>
      </div>

      {/* --- CONTENIDO DEL FORMULARIO --- */}
      <div className="max-w-4xl mx-auto p-6 pb-24">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SECCIÓN 1: DATOS CLAVE */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
             <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-slate-700 pb-2">
                <Briefcase className="text-blue-600" size={20}/>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Información General</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                   <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Título del Puesto</label>
                   <input 
                      name="title" required value={jobData.title} onChange={handleChange}
                      placeholder="Ej. Técnico Especialista en Hidráulicos"
                      className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white text-lg font-medium"
                   />
                </div>

                <div>
                   <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Empresa</label>
                   <div className="relative">
                      <Building className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                      <input 
                        readOnly 
                        value={jobData.company} 
                        className="w-full pl-10 p-3 bg-gray-100 dark:bg-slate-800/50 text-gray-500 border border-gray-200 dark:border-slate-600 rounded-xl cursor-not-allowed font-medium"
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ubicación</label>
                   <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                      <select name="location" value={jobData.location} onChange={handleChange}
                        className="w-full pl-10 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-500 dark:text-white appearance-none"
                      >
                         {ALCALDIAS_CDMX.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Oferta Salarial (Mensual)</label>
                   <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 text-green-600" size={18}/>
                      <input name="salary" required value={jobData.salary} onChange={handleChange}
                        placeholder="$18,000 - $22,000"
                        className="w-full pl-10 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl outline-none focus:border-green-500 dark:text-white font-medium"
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tipo de Contrato</label>
                   <select name="type" value={jobData.type} onChange={handleChange}
                      className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-500 dark:text-white"
                   >
                      <option>Tiempo Completo</option>
                      <option>Medio Tiempo</option>
                      <option>Por Proyecto</option>
                   </select>
                </div>
             </div>
          </div>

          {/* SECCIÓN 2: DETALLES Y DESCRIPCIÓN */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
             <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-slate-700 pb-2">
                <ListChecks className="text-blue-600" size={20}/>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Detalles del Perfil</h2>
             </div>

             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Horario Laboral</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                            <input name="schedule" required value={jobData.schedule} onChange={handleChange}
                                placeholder="Ej. L-V 9:00 a 18:00"
                                className="w-full pl-10 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Días Laborales</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                            <input name="workDays" required value={jobData.workDays} onChange={handleChange}
                                placeholder="Ej. Lunes a Sábado"
                                className="w-full pl-10 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción Completa</label>
                    <textarea name="description" required rows="6" value={jobData.description} onChange={handleChange}
                        placeholder="Describe los objetivos del puesto, la cultura de la empresa, beneficios adicionales, etc."
                        className="w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-500 dark:text-white resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex justify-between">
                        <span>Responsabilidades y Requisitos</span>
                        <span className="text-xs font-normal text-gray-400">Escribe cada punto en una nueva línea</span>
                    </label>
                    <div className="relative">
                        <ListChecks className="absolute left-3 top-4 text-gray-400" size={18} />
                        <textarea name="responsibilities" required rows="5" value={jobData.responsibilities} onChange={handleChange}
                            placeholder="- Mantenimiento preventivo mensual&#10;- Atención a llamadas de emergencia&#10;- Conocimiento en maniobras Thyssen"
                            className="w-full pl-10 p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-500 dark:text-white resize-none"
                        />
                    </div>
                </div>
             </div>
          </div>

          {/* BARRA DE ACCIÓN INFERIOR */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex justify-center z-30">
             <div className="w-full max-w-4xl flex gap-4">
                <Button type="button" onClick={onCancel} variant="secondary" className="flex-1 py-3 text-base">
                    Cancelar
                </Button>
                <Button type="submit" className="flex-[2] py-3 text-base font-bold shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
                    <CheckCircle size={20} /> Publicar Vacante Ahora
                </Button>
             </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateJobView;