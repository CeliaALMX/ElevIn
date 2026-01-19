import React from 'react';
import { 
  MapPin, 
  Briefcase, 
  Award, 
  Calendar, 
  Edit3, 
  Settings, 
  ShieldCheck, 
  CheckCircle,
  FileText
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Card from '../ui/Card';

const ProfileView = ({ user }) => {
  // Datos simulados extra para darle vida al perfil
  const stats = [
    { label: 'Proyectos', value: '142', icon: Briefcase },
    { label: 'Certificaciones', value: '8', icon: Award },
    { label: 'Años Exp.', value: '12', icon: Calendar },
  ];

  const certifications = [
    { id: 1, title: 'DC-3 Seguridad en Alturas', issuer: 'STPS', date: '2023', color: 'bg-orange-100 text-orange-700' },
    { id: 2, title: 'Mantenimiento Schindler 3300', issuer: 'Schindler Training', date: '2022', color: 'bg-blue-100 text-blue-700' },
    { id: 3, title: 'Normativa NOM-207', issuer: 'Entidad de Acreditación', date: '2021', color: 'bg-green-100 text-green-700' },
  ];

  const experiences = [
    { id: 1, role: 'Supervisor de Mantenimiento', company: 'Elevadores de México', period: '2019 - Presente' },
    { id: 2, role: 'Técnico de Ruta', company: 'Vertical Solutions', period: '2015 - 2019' },
  ];

  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4 px-4">
      
      {/* --- TARJETA PRINCIPAL DE PERFIL --- */}
      <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow border border-gray-100 dark:border-slate-700">
        {/* Portada */}
        <div className="h-32 bg-gradient-to-r from-blue-900 to-blue-700 relative">
          <div className="absolute top-4 right-4">
             <button className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white backdrop-blur-sm transition">
               <Settings size={18} />
             </button>
          </div>
        </div>

        {/* Info del Usuario */}
        <div className="px-5 pb-6 relative">
          <div className="absolute -top-12 left-5 border-4 border-white dark:border-slate-800 rounded-full">
            <Avatar initials={user.avatar || 'YO'} size="lg" />
          </div>
          
          <div className="pt-14 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {user.name} 
                <ShieldCheck size={20} className="text-blue-600 fill-blue-100"/>
              </h2>
              <p className="text-blue-600 dark:text-yellow-400 font-medium">{user.role}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1"><MapPin size={12}/> {user.location || 'Ubicación no definida'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Briefcase size={12}/> {user.company || 'Freelance'}</span>
              </div>
            </div>
            <Button variant="ghost" className="border border-gray-200 dark:border-slate-600">
              <Edit3 size={16} /> <span className="hidden sm:inline">Editar</span>
            </Button>
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {user.bio || 'Profesional apasionado por la industria del transporte vertical. Especialista en diagnóstico de fallas y modernizaciones.'}
          </p>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-3 border-t border-gray-100 dark:border-slate-700 divide-x divide-gray-100 dark:divide-slate-700">
          {stats.map((stat, idx) => (
            <div key={idx} className="py-4 text-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer">
              <stat.icon size={20} className="mx-auto text-gray-400 mb-1" />
              <span className="block font-bold text-lg text-blue-900 dark:text-white">{stat.value}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* --- SECCIÓN DE CERTIFICACIONES --- */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Award className="text-yellow-500" /> Certificaciones y Licencias
          </h3>
          <button className="text-blue-600 text-xs font-bold hover:underline">Ver todas</button>
        </div>
        <div className="space-y-3">
          {certifications.map((cert) => (
            <div key={cert.id} className="flex gap-3 items-start p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition">
              <div className={`p-2 rounded-lg ${cert.color}`}>
                <FileText size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{cert.title}</h4>
                <p className="text-xs text-gray-500">{cert.issuer} • Expedido: {cert.date}</p>
              </div>
              <CheckCircle size={16} className="text-green-500 mt-1" />
            </div>
          ))}
        </div>
      </Card>

      {/* --- EXPERIENCIA LABORAL --- */}
      <Card>
        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Briefcase className="text-blue-500" /> Experiencia Reciente
        </h3>
        <div className="space-y-4 relative">
          {/* Línea conectora vertical */}
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-slate-600"></div>
          
          {experiences.map((exp) => (
            <div key={exp.id} className="relative pl-8">
              <div className="absolute left-0 top-1.5 w-5 h-5 bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-full z-10"></div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">{exp.role}</h4>
              <p className="text-xs font-medium text-blue-600 dark:text-yellow-400">{exp.company}</p>
              <p className="text-xs text-gray-400 mt-0.5">{exp.period}</p>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
};

export default ProfileView;