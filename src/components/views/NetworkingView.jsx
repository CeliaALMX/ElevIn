import React from 'react';
import { UserPlus, MapPin, Award } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Card from '../ui/Card'; // Asumimos componente Card compartido

const MOCK_USERS = [
  { id: 1, name: 'Roberto Díaz', role: 'Especialista Hidráulico', company: 'Independiente', location: 'CDMX', initials: 'RD' },
  { id: 2, name: 'Laura M.', role: 'Gerente de Mantenimiento', company: 'Kone', location: 'Monterrey', initials: 'LM' },
  { id: 3, name: 'Ing. Felipe', role: 'Inspector Certificado', company: 'TÜV', location: 'Guadalajara', initials: 'IF' },
];

const NetworkingView = () => {
  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4 px-4">
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 rounded-xl text-white shadow-lg">
        <h2 className="text-xl font-bold">Tu Red Profesional</h2>
        <p className="text-sm text-blue-200 opacity-90">Conecta con 1,240 colegas del sector.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {MOCK_USERS.map((u) => (
          <Card key={u.id} className="flex items-center gap-4 p-4">
            <Avatar initials={u.initials} size="md" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 dark:text-white truncate">{u.name}</h4>
              <p className="text-xs text-blue-600 dark:text-yellow-400 font-medium truncate">{u.role}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                 <span className="flex items-center gap-0.5"><MapPin size={10}/> {u.location}</span>
                 <span>•</span>
                 <span>{u.company}</span>
              </div>
            </div>
            <button className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 dark:bg-slate-700 dark:text-blue-300 transition-colors">
              <UserPlus size={20} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NetworkingView;