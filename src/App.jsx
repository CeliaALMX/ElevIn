import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Home,
  User,
  LogOut,
  Bell,
  ArrowUp,
  Users,           
  LifeBuoy,         
  MapPin, 
  Wrench, 
  Heart, 
  MessageSquare, 
  Share2,
  Settings,      // Icono de Configuración
  Moon,          // Icono Luna
  Sun,           // Icono Sol
  ChevronRight,  // Flechita
  Shield,
  HelpCircle
} from 'lucide-react';

// --- IMPORTACIONES UI ---
import LoginScreen from './components/LoginScreen';
import Avatar from './components/ui/Avatar';
import Button from './components/ui/Button';
import Card from './components/ui/Card';

// --- DATOS MOCK ---
import { INITIAL_POSTS_DATA, JOBS_DATA } from './data/mockData';

// --- IMPORTACIONES DE VISTAS ---
import JobsView from './components/views/JobsView';
import SupportView from './components/views/SupportView';
import NetworkingView from './components/views/NetworkingView';
import ProfileView from './components/views/ProfileView';

// --- VISTA FEED ---
const FeedView = ({ user, posts, setPosts }) => {
  const [text, setText] = useState('');
  
  const publish = () => {
    if (!text.trim()) return;
    const newPost = {
      id: Date.now(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userAvatar: user.avatar || 'YO',
      content: text,
      likes: 0,
      comments: 0,
      time: 'Ahora mismo',
    };
    setPosts([newPost, ...posts]);
    setText('');
  };

  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4 px-4">
      <Card>
        <div className="flex gap-3">
          <Avatar initials={user.avatar || 'YO'} />
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`¿Qué hay de nuevo, ${user.name.split(' ')[0]}?`}
              className="w-full p-2 bg-gray-50 dark:bg-slate-900 rounded border-none focus:ring-1 focus:ring-blue-500 resize-none dark:text-white"
              rows={3}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-2 text-blue-600">
                <MapPin size={18} className="cursor-pointer hover:text-blue-800"/>
                <Wrench size={18} className="cursor-pointer hover:text-blue-800"/>
              </div>
              <Button onClick={publish} className="text-sm px-6 rounded-full">Publicar</Button>
            </div>
          </div>
        </div>
      </Card>
      {posts.map((post) => (
        <Card key={post.id}>
          <div className="flex gap-3 mb-2">
            <Avatar initials={post.userAvatar} />
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">{post.userName}</h4>
              <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 px-2 rounded-full">{post.userRole}</span>
            </div>
          </div>
          <p className="text-gray-800 dark:text-gray-200 text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
          <div className="flex justify-between border-t dark:border-slate-700 pt-2">
            <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600 text-sm"><Heart size={16} /> {post.likes}</button>
            <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600 text-sm"><MessageSquare size={16} /> {post.comments}</button>
            <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600 text-sm"><Share2 size={16} /></button>
          </div>
        </Card>
      ))}
    </div>
  );
};

// --- NUEVA VISTA: CONFIGURACIÓN ---
const SettingsView = ({ isDarkMode, toggleTheme }) => {
  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Configuración</h2>
      
      {/* Sección Apariencia */}
      <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow border border-gray-100 dark:border-slate-700 mb-6">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider">Apariencia</h3>
        </div>
        
        {/* Toggle Modo Oscuro */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isDarkMode ? 'bg-blue-900 text-yellow-400' : 'bg-yellow-100 text-orange-500'}`}>
              {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">Modo Oscuro</h4>
              <p className="text-xs text-gray-500">Ajusta el tema visual de la aplicación</p>
            </div>
          </div>
          
          {/* Switch Visual */}
          <button 
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 relative ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
          </button>
        </div>
      </div>

      {/* Sección General (Decorativa) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow border border-gray-100 dark:border-slate-700">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider">Cuenta y Seguridad</h3>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-gray-400" />
              <span className="text-gray-700 dark:text-gray-200 font-medium">Privacidad</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-gray-400" />
              <span className="text-gray-700 dark:text-gray-200 font-medium">Notificaciones</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
            <div className="flex items-center gap-3">
              <HelpCircle size={20} className="text-gray-400" />
              <span className="text-gray-700 dark:text-gray-200 font-medium">Ayuda y Soporte</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE DE NAVEGACIÓN DESKTOP ---
const DesktopNavLink = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center h-full px-4 border-b-4 transition-colors ${
      active 
        ? 'border-yellow-400 text-yellow-400' 
        : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-800'
    }`}
    title={label}
  >
    <Icon size={22} strokeWidth={active ? 3 : 2} />
  </button>
);

// --- APP CONTENT PRINCIPAL ---
function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('feed');
  const [posts, setPosts] = useState(INITIAL_POSTS_DATA);
  
  // ESTADO DEL TEMA (MODO OSCURO)
  // Iniciamos en true (Oscuro) porque dijiste "como está ahorita"
  const [isDarkMode, setIsDarkMode] = useState(true);

  // EFECTO: Sincronizar clase 'dark' en el HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans min-h-screen transition-colors duration-300">
      
      {/* Navbar Superior (Header) */}
      <nav className="sticky top-0 z-30 bg-blue-900 text-white shadow-md border-b-4 border-yellow-500">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* 1. LOGO */}
          <div className="flex items-center gap-2 font-bold text-lg text-yellow-400 shrink-0">
            <ArrowUp className="bg-yellow-400 text-blue-900 p-0.5 rounded" size={28} />
            <span className="hidden lg:inline">ElevatorConnect</span>
            <span className="lg:hidden">ElevIn</span>
          </div>

          {/* 2. NAVEGACIÓN CENTRAL (SOLO VISIBLE EN ESCRITORIO 'md') */}
          <div className="hidden md:flex h-full items-center gap-1">
             <DesktopNavLink icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
             <DesktopNavLink icon={Briefcase} label="Empleos" active={view === 'jobs'} onClick={() => setView('jobs')} />
             <DesktopNavLink icon={Users} label="Networking" active={view === 'networking'} onClick={() => setView('networking')} />
             <DesktopNavLink icon={LifeBuoy} label="Soporte" active={view === 'support'} onClick={() => setView('support')} />
          </div>

          {/* 3. PERFIL Y ACCIONES (Derecha) */}
          <div className="flex items-center gap-4 shrink-0">
             
             {/* Botón Perfil */}
             <button 
               onClick={() => setView('profile')}
               className={`flex items-center gap-2 p-1 pr-3 rounded-full transition-colors group ${view === 'profile' ? 'bg-blue-800' : 'hover:bg-blue-800'}`}
             >
               <div className="w-8 h-8 rounded-full bg-blue-700 border border-blue-400 flex items-center justify-center text-xs font-bold text-white">
                  {user.avatar || 'YO'}
               </div>
               <span className="text-xs text-blue-200 hidden sm:block font-bold group-hover:text-white">
                 {user.name}
               </span>
             </button>

             <div className="h-6 w-px bg-blue-700 mx-1"></div>

             {/* NUEVO: Botón CONFIGURACIÓN */}
             <button 
               onClick={() => setView('settings')}
               className={`p-1.5 rounded-full transition-colors ${view === 'settings' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:text-white hover:bg-blue-800'}`}
               title="Configuración"
             >
               <Settings size={20} />
             </button>

             <Bell size={20} className="text-blue-200 cursor-pointer hover:text-white" />
             
             <button onClick={() => setUser(null)} className="text-blue-200 hover:text-red-300 transition-colors" title="Cerrar Sesión">
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </nav>

      {/* Área Principal */}
      <main className="max-w-4xl mx-auto">
        {view === 'feed' && <FeedView user={user} posts={posts} setPosts={setPosts} />}
        {view === 'jobs' && <JobsView jobs={JOBS_DATA} onApply={(t) => alert(`Postulado a: ${t}`)} />}
        {view === 'networking' && <NetworkingView />}
        {view === 'support' && <SupportView />}
        {view === 'profile' && <ProfileView user={user} />}
        {/* Renderizado de la vista Configuración */}
        {view === 'settings' && <SettingsView isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
      </main>

      {/* Barra de Navegación Inferior (SOLO MÓVIL) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-around p-3 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <NavButton icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
        <NavButton icon={Briefcase} label="Empleos" active={view === 'jobs'} onClick={() => setView('jobs')} />
        <NavButton icon={Users} label="Red" active={view === 'networking'} onClick={() => setView('networking')} />
        {/* Agregamos también el botón de Settings abajo para acceso rápido en móvil */}
        <NavButton icon={Settings} label="Ajustes" active={view === 'settings'} onClick={() => setView('settings')} />
        <NavButton icon={User} label="Perfil" active={view === 'profile'} onClick={() => setView('profile')} />
      </div>
    </div>
  );
}

const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 w-full ${active ? 'text-blue-900 dark:text-yellow-400' : 'text-gray-400 hover:text-gray-600'}`}>
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[9px] font-medium">{label}</span>
  </button>
);

export default App;