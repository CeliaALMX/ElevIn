import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Briefcase, Home, User, LogOut, Bell, ArrowUp, Users, LifeBuoy, Settings, Loader2, MessageCircle, Shield, AlertTriangle } from 'lucide-react'; 
import { useQueryClient } from '@tanstack/react-query';
import { supabase, recoverSupabase } from './lib/supabase';

// --- COMPONENTES UI ---
import LoginScreen from './components/LoginScreen';
import Avatar from './components/ui/Avatar';
import { DesktopNavLink, NavButton } from './components/ui/NavComponents';
import ReportJobModal from './components/modals/ReportJobModal';

// --- CHAT CONTEXT & WIDGET ---
import { ChatProvider } from './context/ChatContext';
import ChatWidget from './components/chat/ChatWidget';

// --- NOTIFICATION CONTEXT & COMPONENT ---
import { NotificationProvider } from './context/NotificationContext';
import NotificationBell from './components/ui/NotificationBell';

// --- COMPONENTES MODULARIZADOS ---
import SearchBar from './components/ui/SearchBar';

// --- VISTAS CON LAZY LOADING ---
const FeedView = lazy(() => import('./components/views/FeedView'));
const JobsView = lazy(() => import('./components/views/JobsView'));
const NetworkingView = lazy(() => import('./components/views/NetworkingView'));
const SupportView = lazy(() => import('./components/views/SupportView'));
const ProfileView = lazy(() => import('./components/views/ProfileView'));
const SettingsView = lazy(() => import('./components/views/SettingsView'));
const JobDetailView = lazy(() => import('./components/views/JobDetailView'));
const CreateJobView = lazy(() => import('./components/views/CreateJobView'));
const SearchView = lazy(() => import('./components/views/SearchView'));
const ConversationsView = lazy(() => import('./components/views/ConversationsView'));
const AdminDashboard = lazy(() => import('./components/views/AdminDashboard'));

import { JOBS_DATA } from './data/mockData';

const PageLoader = () => (
  <div className="flex justify-center items-center h-64">
    <Loader2 className="animate-spin text-gold-premium w-8 h-8" />
  </div>
);

function App() {
  // 1. MEJORA: Intentamos leer el usuario del almacenamiento local INMEDIATAMENTE.
  // Esto hace que la app cargue "instantáneo" al recargar, sin esperar a Supabase.
  const [user, setUser] = useState(() => {
    try {
        const saved = localStorage.getItem('elevin_profile');
        return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [view, setView] = useState(() => localStorage.getItem('elevin_view') || 'feed');
  
  // Si ya tenemos usuario en memoria, NO mostramos el loading (false). Si no, sí (true).
  const [sessionLoading, setSessionLoading] = useState(!user);
  
  const [viewedProfile, setViewedProfile] = useState(null);
  const [isBlockedByExtension, setIsBlockedByExtension] = useState(false);

  const queryClient = useQueryClient();
  const userRef = useRef(null);
  const fetchingProfileRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
    // Cada vez que el usuario cambia, actualizamos el localStorage para mantenerlo fresco
    if (user) {
        localStorage.setItem('elevin_profile', JSON.stringify(user));
    } else {
        localStorage.removeItem('elevin_profile');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('elevin_view', view);
  }, [view]);

  // --- ESTADOS DE DATOS ---
  const [jobs, setJobs] = useState(() => {
    try {
        const savedJobs = localStorage.getItem('elevin_jobs');
        return savedJobs ? JSON.parse(savedJobs) : JOBS_DATA;
    } catch (e) { return JOBS_DATA; }
  });

  const [appliedJobs, setAppliedJobs] = useState(() => {
    try {
        const saved = localStorage.getItem('elevin_applications');
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [reportedJobs, setReportedJobs] = useState(() => {
    try {
        const saved = localStorage.getItem('elevin_reported');
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [searchResults, setSearchResults] = useState({ users: [], jobs: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [jobToReport, setJobToReport] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => { localStorage.setItem('elevin_jobs', JSON.stringify(jobs)); }, [jobs]);
  useEffect(() => { localStorage.setItem('elevin_applications', JSON.stringify(appliedJobs)); }, [appliedJobs]);
  useEffect(() => { localStorage.setItem('elevin_reported', JSON.stringify(reportedJobs)); }, [reportedJobs]);

  const fetchProfile = async (userId, { includeAdmin = false } = {}) => {
    if (fetchingProfileRef.current && fetchingProfileRef.current.userId === userId) {
        return fetchingProfileRef.current.promise;
    }

    const fetchPromise = (async () => {
        try {
          console.log(`[DEBUG] fetchProfile INICIANDO REAL para ID: ${userId}`);
          const publicSelect = 'id, full_name, role, avatar_initials, avatar_url, cover_url, bio, company, location, email, phone, certifications, projects, experience';
          const privateSelect = `${publicSelect}, is_admin`;
    
          const dbRequest = supabase
            .from('profiles')
            .select(includeAdmin ? privateSelect : publicSelect)
            .eq('id', userId)
            .single();

          const timeoutCheck = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('EXTENSION_BLOCK')), 6000)
          );

          const { data, error } = await Promise.race([dbRequest, timeoutCheck]);
          
          if (error) throw error;
    
          console.log("[DEBUG] Perfil descargado correctamente");
          setIsBlockedByExtension(false);

          if (data) {
            let email = data.email;
            if (!email) {
                const { data: authData } = await supabase.auth.getUser();
                email = authData?.user?.email || 'No definido';
            }
            const publicRole = data.role === 'Admin' ? 'Técnico' : data.role;
    
            return { 
              id: data.id, 
              name: data.full_name, 
              role: publicRole, 
              avatar: data.avatar_initials, 
              avatar_url: data.avatar_url, 
              cover_url: data.cover_url, 
              bio: data.bio, 
              company: data.company || 'Independiente', 
              location: data.location,
              email: email,
              phone: data.phone || 'Sin teléfono',
              certifications: data.certifications || '',
              projects: data.projects || '',
              experience: Array.isArray(data.experience) ? data.experience : (data.experience ? [data.experience] : []),
              ...(includeAdmin ? { is_admin: !!data.is_admin } : {}),
            };
          }
          return null;
        } catch (error) { 
            console.error("Error fetching profile:", error);
            if (error.message === 'EXTENSION_BLOCK') {
                setIsBlockedByExtension(true);
                // IMPORTANTE: Si estamos bloqueados pero tenemos usuario en caché, NO bloqueamos la app.
                // Solo quitamos el loading para que el usuario pueda usar la app con datos cacheados.
                setSessionLoading(false); 
            }
            return null; 
        } finally {
            fetchingProfileRef.current = null;
        }
    })();

    fetchingProfileRef.current = { userId, promise: fetchPromise };
    return fetchPromise;
  };

  useEffect(() => {
    let mounted = true;
    console.log("[DEBUG] Inicio de validación de sesión");

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          // Si no hay sesión válida, borramos el usuario (incluso si estaba en caché)
          if (mounted) {
              setUser(null);
              localStorage.removeItem('elevin_profile');
          }
        } else {
          // Si hay sesión válida, verificamos si necesitamos actualizar datos
          // Si ya tenemos usuario cargado del caché, esto corre en "segundo plano" (background update)
          if (mounted) {
             const profile = await fetchProfile(session.user.id, { includeAdmin: true });
             // Solo actualizamos si obtuvimos datos frescos, si falló (por bloqueo), nos quedamos con el caché
             if (profile) setUser(profile);
          }
        }
      } catch (err) {
        console.error("[DEBUG] Error verificando sesión:", err);
      } finally {
        if (mounted) setSessionLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => { 
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            if (mounted) {
                setUser(null);
                setSessionLoading(false);
                localStorage.removeItem('elevin_profile');
            }
            return;
        }

        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
             // Solo llamamos si los IDs no coinciden o queremos forzar refresh
             if (userRef.current?.id !== session.user.id) {
                const profile = await fetchProfile(session.user.id, { includeAdmin: true });
                if (mounted && profile) setUser(profile);
             }
        }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  // --- Recuperación por inactividad ---
  useEffect(() => {
    if (!user?.id) return;
    const IDLE_MS = 120_000;
    let lastActivityAt = Date.now();
    let recovering = false;
    let destroyed = false;
    const runRecoveryIfIdle = async (reason) => {
      const now = Date.now();
      const idleFor = now - lastActivityAt;
      if (destroyed || recovering || idleFor < IDLE_MS) return;
      recovering = true;
      try { await recoverSupabase(user.id); } catch (e) { if (e?.code === 'NO_SESSION') handleLogout(); } finally { recovering = false; lastActivityAt = Date.now(); }
    };
    const markActivity = () => { if (Date.now() - lastActivityAt >= IDLE_MS) runRecoveryIfIdle('activity'); lastActivityAt = Date.now(); };
    window.addEventListener('focus', () => runRecoveryIfIdle('focus'));
    window.addEventListener('pointerdown', markActivity, { passive: true });
    window.addEventListener('keydown', markActivity);
    return () => { destroyed = true; window.removeEventListener('pointerdown', markActivity); window.removeEventListener('keydown', markActivity); };
  }, [user?.id]);

  const handleProfileRefresh = async () => { if (user?.id) { const updated = await fetchProfile(user.id, { includeAdmin: true }); setUser(updated); } };

  useEffect(() => { 
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); } 
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); } 
  }, [isDarkMode]);

  const handleLogout = async () => { 
    try { await supabase.auth.signOut(); } catch (e) {}
    setUser(null); 
    setView('feed'); 
    localStorage.removeItem('elevin_view'); 
    localStorage.removeItem('elevin_profile'); // Limpiamos perfil al salir
  };
  
  const handleGoToCreateJob = () => { setView('create-job'); window.scrollTo(0,0); };
  const handleCreateJob = (newJobData) => { setJobs(prev => [{id: Date.now(), ...newJobData, user_id: user.id, companyAvatar: user.avatar_url, companyInitials: user.avatar, postedAt: new Date(), postedAtRelative: 'Hace un momento'}, ...prev]); alert('¡Publicado!'); setView('jobs'); window.scrollTo(0,0); };
  const handleViewJobDetail = (job) => { setSelectedJob(job); setView('job-detail'); window.scrollTo(0,0); };
  const handleViewCompanyProfile = async (job) => { if (job.user_id) { const p = await fetchProfile(job.user_id); if(p) { setViewedProfile(p); setView('profile'); window.scrollTo(0,0); } } else { /*mock*/ } };
  const handleViewUserProfile = async (userId) => { if (userId === user.id) { handleGoToMyProfile(); return; } const p = await fetchProfile(userId); if(p) { setViewedProfile(p); setView('profile'); window.scrollTo(0,0); } };
  const handleGoToMyProfile = () => { setViewedProfile(null); setView('profile'); };
  const handlePerformSearch = async (query) => { 
      if (!query.trim()) return; setIsSearching(true); setView('search'); window.scrollTo(0,0);
      try { 
          const { data } = await supabase.from('profiles').select('id, full_name, role, avatar_initials, avatar_url, company').ilike('full_name', `%${query}%`).limit(10);
          const j = jobs.filter(job => job.title.toLowerCase().includes(query.toLowerCase()));
          setSearchResults({ users: (data||[]).map(u => ({...u, role: u.role==='Admin'?'Técnico':u.role})), jobs: j });
      } catch (err) {} finally { setIsSearching(false); }
  };
  const handleSearchResultClick = (type, item) => { if (type === 'profile') handleViewUserProfile(item.id); else handleViewJobDetail(item); };
  const handleApplyJob = (id) => { if (!appliedJobs.includes(id)) setAppliedJobs(prev => [...prev, id]); };
  const handleOpenReport = (job) => { setJobToReport(job); setIsReportModalOpen(true); };
  const handleSubmitReport = () => { if (jobToReport) { setReportedJobs(prev => [...prev, jobToReport.id]); alert("Reportado"); setIsReportModalOpen(false); setJobToReport(null); if (view==='job-detail') setView('jobs'); } };
  const visibleJobs = jobs.filter(job => !reportedJobs.includes(job.id));


  // --- PANTALLA DE CARGA / BLOQUEO ---
  if (sessionLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 gap-6 px-4 text-center">
            {isBlockedByExtension ? (
                <div className="max-w-md bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl border-2 border-red-200 dark:border-red-900">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Conexión Bloqueada</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                        Parece que una extensión está impidiendo que la aplicación se conecte.
                    </p>
                    <button onClick={() => window.location.reload()} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
                        Reintentar
                    </button>
                </div>
            ) : (
                <>
                    <Loader2 className="animate-spin text-gold-champagne w-10 h-10"/>
                    <p className="text-sm text-gray-500 font-mono animate-pulse">Iniciando sesión segura...</p>
                </>
            )}
        </div>
      );
  }

  if (!user) return <LoginScreen />;

  return (
    <NotificationProvider currentUser={user}>
      <ChatProvider currentUser={user}>
        <div className="min-h-screen w-full bg-ivory dark:bg-emerald-deep transition-colors duration-300">
          <nav className="sticky top-0 z-30 bg-emerald-deep text-ivory shadow-md border-b-4 border-gold-champagne">
            <div className="max-w-7xl mx-auto px-2 md:px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-lg text-yellow-400 shrink-0 cursor-pointer" onClick={() => setView('feed')}>
                <ArrowUp className="bg-gold-premium text-gold-champagne p-0.5 rounded" size={28} />
                <span className="hidden md:inline text-xl font-bold tracking-tight text-gold-premium">AscenLin</span>
              </div>
              <div className="hidden md:flex h-full items-center gap-1 ml-4">
                 <DesktopNavLink icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
                 <DesktopNavLink icon={Briefcase} label="Empleos" active={view === 'jobs' || view === 'job-detail' || view === 'create-job'} onClick={() => setView('jobs')} />
                 <DesktopNavLink icon={Users} label="Red" active={view === 'networking'} onClick={() => setView('networking')} />
                 <DesktopNavLink icon={LifeBuoy} label="Soporte" active={view === 'support'} onClick={() => setView('support')} />
                 {user.is_admin && <DesktopNavLink icon={Shield} label="Admin" active={view === 'admin'} onClick={() => setView('admin')} />}
              </div>
              <SearchBar onSearch={handlePerformSearch} />
              <div className="flex items-center gap-2 md:gap-4 shrink-0">
                 <button onClick={handleGoToMyProfile} className={`hidden md:flex items-center gap-2 p-1 pr-3 rounded-full transition-colors group ${view === 'profile' && !viewedProfile ? 'bg-gold-premium' : 'hover:bg-gold-premium'}`}>
                   <div className="w-8 h-8 rounded-full bg-gold-champagne border border-gold-champagne flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                      <Avatar initials={user.avatar} src={user.avatar_url} size="sm" className="border-none" />
                   </div>
                   <span className="text-xs text-blue-100 font-bold group-hover:text-white max-w-[100px] truncate">{user.name}</span>
                 </button>
                 <div className="hidden md:block h-6 w-px bg-gold-premium mx-1"></div>
                 <button onClick={() => setView('chat')} className={`p-2 rounded-full transition-all ${view === 'chat' ? 'bg-gold-premium text-white shadow-lg' : 'text-gold-champagne hover:text-white hover:bg-white/10'}`}><MessageCircle size={22} /></button>
                 <NotificationBell />
                 <button onClick={() => setView('settings')} className={`hidden md:block p-2 rounded-full transition-colors ${view === 'settings' ? 'bg-gold-premium text-white shadow-lg' : 'text-gold-champagne hover:text-white hover:bg-white/10'}`}><Settings size={22} /></button>
                 <button onClick={handleLogout} className="hidden sm:block text-red-300 hover:text-red-100 transition-colors p-2"><LogOut size={22} /></button>
              </div>
            </div>
          </nav>
          <main className={`min-h-[calc(100vh-4rem)] ${(view === 'job-detail' || view === 'create-job' || view === 'chat' || view === 'admin') ? 'w-full' : 'max-w-7xl mx-auto p-4'}`}>
            <Suspense fallback={<PageLoader />}>
                {view === 'feed' && <FeedView user={user} onViewProfile={handleViewUserProfile} />}
                {view === 'jobs' && <JobsView jobs={visibleJobs} userRole={user.role} onCreateJobClick={handleGoToCreateJob} onViewDetail={handleViewJobDetail} appliedJobs={appliedJobs} />}
                {view === 'job-detail' && <JobDetailView job={selectedJob} onBack={() => setView('jobs')} onApply={handleApplyJob} userRole={user.role} isApplied={appliedJobs.includes(selectedJob?.id)} onReport={handleOpenReport} onViewCompany={handleViewCompanyProfile} />}
                {view === 'create-job' && <CreateJobView onCreate={handleCreateJob} onCancel={() => setView('jobs')} currentUser={user} />}
                {view === 'search' && <SearchView results={searchResults} loading={isSearching} onItemClick={handleSearchResultClick} />}
                {view === 'networking' && <NetworkingView />}
                {view === 'support' && <SupportView />}
                {view === 'chat' && <ConversationsView currentUser={user} />}
                {view === 'admin' && <AdminDashboard currentUser={user} />}
                {view === 'profile' && <ProfileView user={viewedProfile || user} currentUser={user} onProfileUpdate={handleProfileRefresh} />}
                {view === 'settings' && <SettingsView isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />}
            </Suspense>
          </main>
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-around p-2 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <NavButton icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
            <NavButton icon={Briefcase} label="Empleos" active={view === 'jobs' || view === 'job-detail' || view === 'create-job'} onClick={() => setView('jobs')} />
            <NavButton icon={Users} label="Red" active={view === 'networking'} onClick={() => setView('networking')} />
            <NavButton icon={MessageCircle} label="Chat" active={view === 'chat'} onClick={() => setView('chat')} />
            <NavButton icon={User} label="Perfil" active={view === 'profile'} onClick={handleGoToMyProfile} />
            {user.is_admin && <NavButton icon={Shield} label="Admin" active={view === 'admin'} onClick={() => setView('admin')} />}
          </div>
          <ChatWidget currentUser={user} />
          <ReportJobModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} onSubmit={handleSubmitReport} jobTitle={jobToReport?.title} />
        </div>
      </ChatProvider>
    </NotificationProvider>
  );
}

export default App;