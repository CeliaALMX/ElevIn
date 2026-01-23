import React from 'react';
import { Loader2, Search, Briefcase, ChevronRight, MapPin } from 'lucide-react';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';

const SearchView = ({ results, loading, onItemClick }) => {
  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>;

  const hasResults = results.users.length > 0 || results.jobs.length > 0;

  if (!hasResults) {
    return (
      <div className="text-center py-10 text-gray-500">
        <Search size={48} className="mx-auto mb-4 opacity-20" />
        <p>No encontramos resultados para tu búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold px-1">Resultados de la búsqueda</h2>
      
      {/* RESULTADOS DE USUARIOS/EMPRESAS */}
      {results.users.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Personas y Empresas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.users.map(user => (
              <Card key={user.id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => onItemClick('profile', user)}>
                <div className="flex items-center gap-3">
                  <Avatar initials={user.avatar_initials} src={user.avatar_url} />
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{user.full_name}</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 truncate">{user.role}</p>
                    {user.company && <p className="text-xs text-gray-500 truncate flex items-center gap-1"><Briefcase size={10}/> {user.company}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* RESULTADOS DE EMPLEOS */}
      {results.jobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Empleos</h3>
          <div className="space-y-2">
            {results.jobs.map(job => (
              <Card key={job.id} className="p-4 hover:border-blue-400 cursor-pointer group" onClick={() => onItemClick('job', job)}>
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-blue-700 dark:text-blue-300 group-hover:underline">{job.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{job.company}</p>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-blue-500" size={20}/>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={12}/> {job.location}</span>
                    <span className="text-green-600 font-medium">{job.salary}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchView;