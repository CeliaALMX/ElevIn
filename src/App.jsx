import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Briefcase, Home, User, LogOut, Bell, ArrowUp, Users, LifeBuoy, Settings, Loader2, MessageCircle, Shield, AlertTriangle } from 'lucide-react'; 
import { useQueryClient } from '@tanstack/react-query';
import { supabase, recoverSupabase } from './lib/supabase';

// --- COMPONENTES UI ---
import LoginScreen from './components/LoginScreen';
import Avatar from './components/ui/Avatar';
import { DesktopNavLink, NavButton } from './components/ui/NavComponents';
import ReportJobModal from './components/modals/ReportJobModal';

// --- NUEVAS VISTAS DE ESTADO ---
import { CheckEmailView, VerifiedView } from './components/views/AuthStatusViews';

// --- CHAT CONTEXT & WIDGET ---
import { ChatProvider, ChatContext } from './context/ChatContext'; 
import ChatWidget from './components/chat/ChatWidget';
import { useChat } from './hooks/useChat'; 

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

// --- COMPONENTE DE CONTENIDO (Aquí vive toda la lógica) ---
function AppContent() {
  const [user, setUser] = useState(() => {
    try {
        const saved = localStorage.getItem('elevin_profile');
        return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [view, setView] = useState(() => localStorage.getItem('elevin_view') || 'feed');
  const [sessionLoading, setSessionLoading] = useState(!user);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [isBlockedByExtension, setIsBlockedByExtension] = useState(false);
  const [authStatusView, setAuthStatusView] = useState(null); 

  const queryClient = useQueryClient();
  const userRef = useRef(null);
  const fetchingProfileRef = useRef(null);
  
  // Ahora sí podemos usar useChat porque AppContent está dentro del Provider
  const { openChatWithUser } = useChat();

  useEffect(() => {
    userRef.current = user;
    if (user) {
        localStorage.setItem('elevin_profile', JSON.stringify(user));
    } else {
        localStorage.removeItem('elevin_profile');
    }
  }, [user]);

  useEffect(() => {
    if (view !== 'check-email' && view !== 'verified') {
        localStorage.setItem('elevin_view', view);
    }
  }, [view]);

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
          const publicSelect = 'id, full_name, role, avatar_initials, avatar_url, cover_url, bio, company, location, email, phone, certifications, projects, experience';
          const privateSelect = `${publicSelect}, is_admin`;
          const dbRequest = supabase.from('profiles').select(includeAdmin ? privateSelect : publicSelect).eq('id', userId).maybeSingle(); 
          const timeoutCheck = new Promise((_, reject) => setTimeout(() => reject(new Error('EXTENSION_BLOCK')), 6000));
          const { data, error } = await Promise.race([dbRequest, timeoutCheck]);
          if (error) throw error;
          setIsBlockedByExtension(false);
          if (data) {
            return { 
              id: data.id, name: data.full_name, role: data.role === 'Admin' ? 'Técnico' : data.role, 
              avatar: data.avatar_initials, avatar_url: data.avatar_url, cover_url: data.cover_url, 
              bio: data.bio, company: data.company || 'Independiente', location: data.location,
              email: data.email, phone: data.phone || 'Sin teléfono', certifications: data.certifications || '',
              projects: data.projects || '', experience: Array.isArray(data.experience) ? data.experience : (data.experience ? [data.experience] : []),
              is_admin: !!data.is_admin,
            };
          }
          return null;
        } catch (error) { return null; } finally { fetchingProfileRef.current = null; }
    })();
    fetchingProfileRef.current = { userId, promise: fetchPromise };
    return fetchPromise;
  };

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const profile = await fetchProfile(session.user.id, { includeAdmin: true });
        if (profile && mounted) {
          setUser(profile);
          setView('feed');
        }
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setView('feed');
      }
    });

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
           const profile = await fetchProfile(session.user.id, { includeAdmin: true });
           if (profile) setUser(profile);
        }
      } catch (err) {} finally { if (mounted) setSessionLoading(false); }
    };

    checkSession();
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => { 
    await supabase.auth.signOut();
    setUser(null); setView('feed'); 
    localStorage.removeItem('elevin_view'); localStorage.removeItem('elevin_profile');
  };
  
  const handleViewJobDetail = (job) => { setSelectedJob(job); setView('job-detail'); window.scrollTo(0,0); };
  const handleViewUserProfile = async (userId) => { 
    if (userId === user.id) { setViewedProfile(null); setView('profile'); return; } 
    const p = await fetchProfile(userId); 
    if(p) { setViewedProfile(p); setView('profile'); window.scrollTo(0,0); } 
  };
  const handleGoToMyProfile = () => { setViewedProfile(null); setView('profile'); };
  const handleApplyJob = (id) => { if (!appliedJobs.includes(id)) setAppliedJobs(prev => [...prev, id]); };
  const handleOpenReport = (job) => { setJobToReport(job); setIsReportModalOpen(true); };
  const handleSubmitReport = () => { if (jobToReport) { setReportedJobs(prev => [...prev, jobToReport.id]); setIsReportModalOpen(false); } };

  const handleGlobalSearch = async (query) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setView('search');
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, avatar_initials, role, company, location')
        .ilike('full_name', `%${query}%`)
        .limit(20);
      if (error) throw error;
      const filteredJobs = jobs.filter(job => 
        job.title.toLowerCase().includes(query.toLowerCase()) ||
        job.company.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults({ users: profiles || [], jobs: filteredJobs });
    } catch (err) {
      console.error("Error en búsqueda global:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNotificationAction = async (notification) => {
    const { type, actor_id, entity_id } = notification;
    setViewedProfile(null);
    setSelectedJob(null);

    switch (type) {
      case 'message':
        if (actor_id) {
          const profile = await fetchProfile(actor_id);
          if (profile) {
            openChatWithUser(profile);
            setView('chat'); 
          }
        }
        break;

      case 'comment':
      case 'like':
        if (entity_id) {
          try {
            const { data: postData } = await supabase
              .from('posts')
              .select(`*, profiles (full_name, role, avatar_initials, avatar_url, company)`)
              .eq('id', entity_id)
              .maybeSingle();

            if (postData) {
              setSelectedJob(postData);
              setView('job-detail');
            } else {
              setView('feed');
            }
          } catch (err) {
            setView('feed');
          }
        }
        break;

      case 'follow':
        if (actor_id) {
          const profile = await fetchProfile(actor_id);
          if (profile) {
            setViewedProfile(profile);
            setView('profile');
          }
        }
        break;

      default:
        setView('feed');
        break;
    }
    window.scrollTo(0, 0);
  };

  if (sessionLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gold-champagne w-10 h-10"/></div>;
  if (!user) return <LoginScreen onRegisterSuccess={() => setAuthStatusView('check-email')} />;

  return (
        <div className="min-h-screen w-full bg-ivory dark:bg-emerald-deep transition-colors">
          <nav className="sticky top-0 z-30 bg-emerald-deep text-ivory shadow-md border-b-4 border-gold-champagne">
            <div className="max-w-7xl mx-auto px-2 md:px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold cursor-pointer" onClick={() => setView('feed')}>
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
              
              <SearchBar onSearch={handleGlobalSearch} />

              <div className="flex items-center gap-2 md:gap-4 shrink-0">
                 <button onClick={handleGoToMyProfile} className={`hidden md:flex items-center gap-2 p-1 pr-3 rounded-full transition-colors group ${view === 'profile' && !viewedProfile ? 'bg-gold-premium' : 'hover:bg-gold-premium'}`}>
                   <Avatar initials={user.avatar} src={user.avatar_url} size="sm" />
                   <span className="text-xs text-blue-100 font-bold group-hover:text-white max-w-[100px] truncate">{user.name}</span>
                 </button>
                 <div className="hidden md:block h-6 w-px bg-gold-premium mx-1"></div>
                 <button onClick={() => setView('chat')} className={`p-2 rounded-full transition-all ${view === 'chat' ? 'bg-gold-premium text-white' : 'text-gold-champagne hover:bg-white/10'}`}><MessageCircle size={22} /></button>
                 <NotificationBell onNavigate={handleNotificationAction} />
                 <button onClick={() => setView('settings')} className={`hidden md:block p-2 rounded-full transition-colors ${view === 'settings' ? 'bg-gold-premium text-white' : 'text-gold-champagne hover:bg-white/10'}`}><Settings size={22} /></button>
                 <button onClick={handleLogout} className="hidden sm:block text-red-300 hover:text-red-100 p-2"><LogOut size={22} /></button>
              </div>
            </div>
          </nav>
          <main className={`min-h-[calc(100vh-4rem)] ${(view === 'job-detail' || view === 'chat' || view === 'admin') ? 'w-full' : 'max-w-7xl mx-auto p-4'}`}>
            <Suspense fallback={<PageLoader />}>
                {view === 'feed' && <FeedView user={user} onViewProfile={handleViewUserProfile} />}
                {view === 'jobs' && <JobsView jobs={jobs.filter(j => !reportedJobs.includes(j.id))} userRole={user.role} onCreateJobClick={() => setView('create-job')} onViewDetail={handleViewJobDetail} appliedJobs={appliedJobs} />}
                {view === 'job-detail' && <JobDetailView job={selectedJob} onBack={() => setView('jobs')} onApply={handleApplyJob} userRole={user.role} isApplied={appliedJobs.includes(selectedJob?.id)} onReport={handleOpenReport} onViewCompany={(j) => handleViewUserProfile(j.user_id)} />}
                {view === 'networking' && <NetworkingView user={user} onNavigate={setView} />}
                {view === 'support' && <SupportView />}
                {view === 'chat' && <ConversationsView currentUser={user} />}
                {view === 'admin' && <AdminDashboard currentUser={user} />}
                {view === 'profile' && <ProfileView user={viewedProfile || user} currentUser={user} onProfileUpdate={() => {}} />}
                {view === 'settings' && <SettingsView isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />}
                {view === 'search' && (
                  <SearchView 
                    results={searchResults} 
                    isLoading={isSearching} 
                    onViewProfile={handleViewUserProfile}
                    onViewJob={handleViewJobDetail}
                    onItemClick={(item) => {
                      if (item.full_name) handleViewUserProfile(item.id);
                      else if (item.title) handleViewJobDetail(item);
                    }}
                  />
                )}
            </Suspense>
          </main>
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t flex justify-around p-2 pb-safe z-40">
            <NavButton icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
            <NavButton icon={Briefcase} label="Empleos" active={view === 'jobs'} onClick={() => setView('jobs')} />
            <NavButton icon={Users} label="Red" active={view === 'networking'} onClick={() => setView('networking')} />
            <NavButton icon={MessageCircle} label="Chat" active={view === 'chat'} onClick={() => setView('chat')} />
            <NavButton icon={User} label="Perfil" active={view === 'profile'} onClick={handleGoToMyProfile} />
          </div>
          <ChatWidget currentUser={user} />
          <ReportJobModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} onSubmit={handleSubmitReport} jobTitle={jobToReport?.title} />
        </div>
  );
}

// --- COMPONENTE RAÍZ (Configura los Providers y renderiza AppContent) ---
function App() {
  return (
    <NotificationProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </NotificationProvider>
  );
}

export default App;