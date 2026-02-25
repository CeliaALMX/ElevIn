import React, { useEffect, useState } from 'react';
import { MessageCircle, Search, AlertTriangle, Check, ChevronDown, Loader2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
// 1. Importamos el hook de notificaciones
import { useNotifications } from '../../context/NotificationContext';

const SupportView = ({ currentUser }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el modal/formulario de nueva consulta
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState('General');

  // 2. Extraemos la función notify
  const { notify } = useNotifications();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        profiles (full_name)
      `)
      .order('created_at', { ascending: false });
      
    if (error) console.error('Error fetching tickets', error);
    else setTickets(data);
    setLoading(false);
  };

  // 3. Función para enviar una nueva pregunta y NOTIFICAR
  const handleCreateTicket = async () => {
    if (!newTitle.trim()) return;

    const { data, error } = await supabase
      .from('support_tickets')
      .insert([{
        user_id: currentUser?.id,
        title: newTitle,
        tag: newTag,
        status: 'open'
      }])
      .select()
      .single();

    if (!error) {
      // ENVIAR NOTIFICACIÓN AL STAFF/ADMIN
      // Aquí puedes poner el ID de tu usuario admin
      await notify({
        recipientId: 'PON_AQUI_EL_ID_DE_TU_ADMIN', 
        type: 'support_ticket',
        message: `ha iniciado una nueva consulta técnica: ${newTitle}`,
        entityId: data.id
      });

      setNewTitle('');
      setShowForm(false);
      fetchTickets();
    }
  };

  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4 px-4">
      {/* Header de Soporte */}
      <div className="bg-gradient-to-r from-emerald-dark to-emerald-medium rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="text-yellow-400" /> Centro de Soporte
          </h2>
          <p className="text-blue-100 text-sm mt-1">Resuelve fallas con la ayuda de la comunidad.</p>
          
          {showForm ? (
            <div className="mt-4 space-y-2 animate-in slide-in-from-top-2">
              <input 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Describe tu duda técnica..."
                className="w-full p-2 rounded-lg text-gray-900 outline-none"
              />
              <div className="flex gap-2">
                <select 
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="p-2 rounded-lg text-gray-900 text-sm outline-none"
                >
                  <option value="General">General</option>
                  <option value="Tracción">Tracción</option>
                  <option value="Puertas">Puertas</option>
                  <option value="Electrónica">Electrónica</option>
                </select>
                <Button onClick={handleCreateTicket} className="flex-1">Enviar Consulta</Button>
                <button onClick={() => setShowForm(false)} className="text-xs underline">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
               <div className="flex-1 bg-white rounded-lg flex items-center px-3 border border-gold-premium">
                 <Search size={18} className="text-gold-premium" />
                 <input 
                   placeholder="Buscar código de error..." 
                   className="bg-transparent border-none p-2 w-full outline-none text-emerald-900 text-sm placeholder-emerald-700"
                 />
               </div>
               <Button onClick={() => setShowForm(true)} className="whitespace-nowrap">Preguntar</Button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Hilos */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-700 dark:text-gray-300 px-1">Discusiones Recientes</h3>
        
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-emerald-600"/></div>
        ) : tickets.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No hay consultas recientes.</p>
        ) : (
          tickets.map((thread) => (
            <div key={thread.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border border-gray-100 dark:border-slate-700 hover:border-emerald-300 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mb-1 inline-block ${
                    thread.tag === 'Tracción' ? 'bg-orange-100 text-orange-700' :
                    thread.tag === 'Puertas' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {thread.tag || 'General'}
                  </span>
                  <h4 className="font-bold text-emerald-900 dark:text-white text-lg leading-tight group-hover:text-emerald-600 transition-colors">{thread.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">Iniciado por {thread.profiles?.full_name || 'Anónimo'}</p>
                </div>
                {thread.status === 'resolved' ? (
                   <span className="bg-green-100 text-green-700 p-1 rounded-full"><Check size={16} /></span>
                ) : (
                   <span className="bg-gray-100 text-gray-400 p-1 rounded-full"><MessageCircle size={16} /></span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 border-t dark:border-slate-700 pt-2">
                <span className="flex items-center gap-1"><MessageCircle size={14}/> 0 respuestas</span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">Ver detalles <ChevronDown size={14}/></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SupportView;