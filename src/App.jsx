import React, { useState } from 'react';
import {
  MessageSquare,
  Heart,
  Share2,
  Briefcase,
  Home,
  User,
  LogOut,
  MapPin,
  Building,
  Wrench,
  CheckCircle,
  Search,
  Bell,
  ArrowUp,
} from 'lucide-react';

// --- IMPORTACIONES ---
// Asegúrate de que estas rutas existan en tu proyecto
import LoginScreen from './components/LoginScreen';
import Button from './components/ui/Button';
import Avatar from './components/ui/Avatar';
import { INITIAL_POSTS_DATA, JOBS_DATA } from './data/mockData';

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-5 bg-red-100 text-red-800 border border-red-300 rounded m-5">
          <h2>Error de Renderizado</h2>
          <pre className="text-xs mt-2">{this.state.error?.toString()}</pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-700 text-white rounded"
          >
            Recargar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- COMPONENTES UI AUXILIARES ---
const Card = ({ children, className = '' }) => (
  <div
    className={`bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-100 dark:border-slate-700 p-4 ${className}`}
  >
    {children}
  </div>
);

// --- VISTAS (FEED, JOBS, PROFILE) ---

const FeedView = ({ user, posts, setPosts }) => {
  const [text, setText] = useState('');

  const publish = () => {
    if (!text.trim()) return;
    const newPost = {
      id: Date.now(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userAvatar: user.avatar,
      content: text,
      likes: 0,
      comments: 0,
      time: 'Ahora mismo',
    };
    setPosts([newPost, ...posts]);
    setText('');
  };

  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4">
      <Card>
        <div className="flex gap-3">
          <Avatar initials={user.avatar} />
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="¿Qué novedad hay en obra hoy?"
              className="w-full p-2 bg-gray-50 dark:bg-slate-900 rounded border-none focus:ring-1 focus:ring-blue-500 resize-none dark:text-white"
              rows={3}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-2 text-blue-600">
                <MapPin size={18} />
                <Wrench size={18} />
              </div>
              <Button onClick={publish} className="text-sm px-6 rounded-full">
                Publicar
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {posts.map((post) => (
        <Card key={post.id}>
          <div className="flex gap-3 mb-2">
            <Avatar initials={post.userAvatar} />
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                {post.userName}
              </h4>
              <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 px-2 rounded-full">
                {post.userRole}
              </span>
            </div>
          </div>
          <p className="text-gray-800 dark:text-gray-200 text-sm mb-3 whitespace-pre-wrap">
            {post.content}
          </p>
          {post.image && (
            <div className="bg-gray-100 dark:bg-slate-700 h-32 rounded flex items-center justify-center text-gray-400 text-xs mb-3">
              [Imagen Adjunta: {post.image}]
            </div>
          )}
          <div className="flex justify-between border-t dark:border-slate-700 pt-2">
            <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600 text-sm">
              <Heart size={16} /> {post.likes}
            </button>
            <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600 text-sm">
              <MessageSquare size={16} /> {post.comments}
            </button>
            <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600 text-sm">
              <Share2 size={16} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
};

const JobsView = ({ jobs, onApply }) => (
  <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4">
    <div className="flex items-center gap-2 mb-4 bg-white dark:bg-slate-800 p-2 rounded shadow-sm">
      <Search className="text-gray-400" />
      <input
        placeholder="Buscar empleos..."
        className="flex-1 outline-none dark:bg-transparent dark:text-white"
      />
    </div>

    {jobs.map((job) => (
      <Card key={job.id} className="border-l-4 border-l-yellow-400">
        <div className="flex justify-between">
          <h3 className="font-bold text-blue-900 dark:text-white">
            {job.title}
          </h3>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            Activo
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
          <Building size={14} /> {job.company}
        </div>
        <div className="flex gap-3 text-xs text-gray-500 mt-2">
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {job.location}
          </span>
          <span className="font-bold text-gray-700 dark:text-gray-400">
            {job.salary}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
          {job.description}
        </p>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => onApply(job.title)} className="text-sm py-1">
            Postularme
          </Button>
        </div>
      </Card>
    ))}
  </div>
);

const ProfileView = ({ user }) => (
  <div className="pb-24 pt-4 max-w-2xl mx-auto">
    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow mb-4">
      <div className="h-24 bg-blue-900"></div>
      <div className="px-4 pb-4 relative">
        <div className="absolute -top-10 left-4">
          <Avatar initials={user.avatar} size="lg" />
        </div>
        <div className="pt-12">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-1">
            {user.name}{' '}
            <CheckCircle size={16} className="text-blue-500" fill="white" />
          </h2>
          <p className="text-blue-700 dark:text-yellow-400 text-sm font-medium">
            {user.role}
          </p>
          <p className="text-gray-500 text-xs mt-1">{user.location}</p>
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            {user.bio}
          </p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 mb-4">
      <Card className="text-center py-4 bg-blue-50 dark:bg-blue-900/20">
        <span className="block text-2xl font-bold text-blue-900 dark:text-blue-300">
          12
        </span>
        <span className="text-xs text-gray-500">Certificaciones</span>
      </Card>
      <Card className="text-center py-4 bg-yellow-50 dark:bg-yellow-900/10">
        <span className="block text-2xl font-bold text-yellow-600">85</span>
        <span className="text-xs text-gray-500">Proyectos</span>
      </Card>
    </div>
  </div>
);

// --- APP CONTENT Y EXPORT ---

const AppContent = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('feed');
  const [posts, setPosts] = useState(INITIAL_POSTS_DATA);
  const [notif, setNotif] = useState('');

  const showNotif = (msg) => {
    setNotif(msg);
    setTimeout(() => setNotif(''), 3000);
  };

  // Si no hay usuario, mostramos el login
  // IMPORTANTE: Si LoginScreen tiene algún error, esto podría fallar
  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div
      className="bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans w-full"
      style={{ minHeight: '100vh' }}
    >
      {/* Header */}
      <nav className="sticky top-0 z-30 bg-blue-900 text-white shadow-md border-b border-yellow-500">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-yellow-400">
            <ArrowUp
              className="bg-yellow-400 text-blue-900 p-0.5 rounded"
              size={20}
            />
            ElevatorConnect
          </div>
          <div className="flex items-center gap-4">
            <Bell size={20} className="text-blue-200" />
            <button
              onClick={() => setUser(null)}
              className="text-blue-200 hover:text-red-300"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main View */}
      <main className="px-4">
        {view === 'feed' && (
          <FeedView user={user} posts={posts} setPosts={setPosts} />
        )}
        {view === 'jobs' && (
          <JobsView
            jobs={JOBS_DATA}
            onApply={(t) => showNotif(`Postulado a: ${t}`)}
          />
        )}
        {view === 'profile' && <ProfileView user={user} />}
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-around p-3 pb-safe z-40">
        <button
          onClick={() => setView('feed')}
          className={`flex flex-col items-center gap-1 ${
            view === 'feed'
              ? 'text-blue-900 dark:text-yellow-400'
              : 'text-gray-400'
          }`}
        >
          <Home size={22} />
          <span className="text-[10px]">Inicio</span>
        </button>
        <button
          onClick={() => setView('jobs')}
          className={`flex flex-col items-center gap-1 ${
            view === 'jobs'
              ? 'text-blue-900 dark:text-yellow-400'
              : 'text-gray-400'
          }`}
        >
          <Briefcase size={22} />
          <span className="text-[10px]">Empleos</span>
        </button>
        <button
          onClick={() => setView('profile')}
          className={`flex flex-col items-center gap-1 ${
            view === 'profile'
              ? 'text-blue-900 dark:text-yellow-400'
              : 'text-gray-400'
          }`}
        >
          <User size={22} />
          <span className="text-[10px]">Perfil</span>
        </button>
      </div>

      {/* Notifications */}
      {notif && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-800 text-white px-6 py-2 rounded-full shadow-lg text-sm font-bold border border-yellow-400 z-50 flex items-center gap-2 animate-pulse">
          <CheckCircle size={16} className="text-yellow-400" /> {notif}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
