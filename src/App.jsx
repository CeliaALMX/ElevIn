import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Briefcase, Home, User, LogOut, Bell, ArrowUp, Users, LifeBuoy, Settings, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

// --- COMPONENTES UI (Carga estática porque son pequeños y necesarios siempre) ---
import LoginScreen from './components/LoginScreen';
import Avatar from './components/ui/Avatar';
import { DesktopNavLink, NavButton } from './components/ui/NavComponents';
import ReportJobModal from './components/modals/ReportJobModal';

// --- COMPONENTES MODULARIZADOS ---
import SearchBar from './components/ui/SearchBar';

// --- VISTAS CON LAZY LOADING (Optimización de Carga) ---
// Usamos React.lazy para importar dinámicamente solo cuando se necesiten
const FeedView = lazy(() => import('./components/views/FeedView'));
const JobsView = lazy(() => import('./components/views/JobsView'));
const NetworkingView = lazy(() => import('./components/views/NetworkingView'));
const SupportView = lazy(() => import('./components/views/SupportView'));
const ProfileView = lazy(() => import('./components/views/ProfileView'));
const SettingsView = lazy(() => import('./components/views/SettingsView'));
const JobDetailView = lazy(() => import('./components/views/JobDetailView'));
const CreateJobView = lazy(() => import('./components/views/CreateJobView'));
const SearchView = lazy(() => import('./components/views/SearchView'));

import { JOBS_DATA } from './data/mockData';

// Componente de carga para las transiciones entre vistas
const PageLoader = () => (
  <div className="flex justify-center items-center h-64">
    <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('feed'); 
  const [sessionLoading, setSessionLoading] = useState(true);
  const [viewedProfile, setViewedProfile] = useState(null);

  // --- ESTADOS DE DATOS ---
  const [jobs, setJobs] = useState(() => {
    // Optimización: Try-catch por si el JSON en localStorage está corrupto
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

  // Persistencia
  useEffect(() => { localStorage.setItem('elevin_jobs', JSON.stringify(jobs)); }, [jobs]);
  useEffect(() => { localStorage.setItem('elevin_applications', JSON.stringify(appliedJobs)); }, [appliedJobs]);
  useEffect(() => { localStorage.setItem('elevin_reported', JSON.stringify(reportedJobs)); }, [reportedJobs]);

  // --- LÓGICA DE USUARIO ---
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error; // Lanzar error para que lo capture el catch

      if (data) {
        // Obtenemos el email solo si es necesario, auth.getUser() es una llamada extra
        let email = data.email;
        if (!email) {
            const { data: authData } = await supabase.auth.getUser();
            email = authData?.user?.email || 'No definido';
        }

        return { 
          id: data.id, 
          name: data.full_name, 
          role: data.role, 
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
        };
      }
      return null;
    } catch (error) { 
        console.error("Error fetching profile:", error); 
        return null; 
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => { 
        const { data: { session } } = await supabase.auth.getSession(); 
        if (session && mounted) {
            const profile = await fetchProfile(session.user.id);
            if (mounted) setUser(profile);
        }
        if (mounted) setSessionLoading(false); 
    };
    init();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => { 
        if (session) {
            const profile = await fetchProfile(session.user.id);
            if (mounted) setUser(profile);
        } else { 
            if (mounted) setUser(null); 
        }
        if (mounted) setSessionLoading(false);
    });
    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  const handleProfileRefresh = async () => { 
      if (user?.id) {
          const updated = await fetchProfile(user.id);
          setUser(updated);
      }
  };

  useEffect(() => { 
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } 
  }, [isDarkMode]);

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setView('feed'); };
  const handleGoToCreateJob = () => { setView('create-job'); window.scrollTo(0,0); };

  const handleCreateJob = (newJobData) => {
    const newJob = {
      id: Date.now(), 
      ...newJobData,
      user_id: user.id, 
      companyAvatar: user.avatar_url,
      companyInitials: user.avatar, 
      postedAt: new Date(),
      postedAtRelative: 'Hace un momento'
    };
    setJobs(prev => [newJob, ...prev]);
    alert('¡Empleo publicado exitosamente!');
    setView('jobs'); 
    window.scrollTo(0,0);
  };

  const handleViewJobDetail = (job) => { setSelectedJob(job); setView('job-detail'); window.scrollTo(0,0); };
  
  const handleViewCompanyProfile = async (job) => {
    if (job.user_id) {
        // Evitamos loading global si es posible, pero aquí está bien
        const profile = await fetchProfile(job.user_id);
        if (profile) {
            setViewedProfile(profile);
            setView('profile');
            window.scrollTo(0,0);
        } else {
            alert("No se pudo cargar el perfil.");
        }
    } else {
        // MOCK fallback
        const mockProfile = {
            id: 'mock-' + job.id,
            name: job.company,
            role: 'Empresa Verificada',
            avatar: job.companyInitials,
            avatar_url: job.companyAvatar,
            company: job.company,
            location: job.location,
            bio: `Perfil corporativo de ${job.company}.`,
            email: 'contacto@empresa.com',
            phone: '55 1234 5678',
            projects: 'Mantenimiento General',
            certifications: 'ISO 9001'
        };
        setViewedProfile(mockProfile);
        setView('profile');
        window.scrollTo(0,0);
    }
  };

  const handleViewUserProfile = async (userId) => {
    if (userId === user.id) {
        handleGoToMyProfile();
        return;
    }
    const profile = await fetchProfile(userId);
    if (profile) {
        setViewedProfile(profile);
        setView('profile');
        window.scrollTo(0,0);
    } else {
        alert("Usuario no encontrado.");
    }
  };

  const handleGoToMyProfile = () => {
      setViewedProfile(null);
      setView('profile');
  };

  const handlePerformSearch = async (query) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setView('search');
    window.scrollTo(0,0);

    try {
        const { data: usersFound } = await supabase
            .from('profiles')
            .select('*')
            .ilike('full_name', `%${query}%`)
            .limit(10);
        
        const jobsFound = jobs.filter(job => 
            job.title.toLowerCase().includes(query.toLowerCase()) || 
            job.company.toLowerCase().includes(query.toLowerCase())
        );

        setSearchResults({
            users: usersFound || [],
            jobs: jobsFound || []
        });
    } catch (err) {
        console.error("Search error:", err);
    } finally {
        setIsSearching(false);
    }
  };

  const handleSearchResultClick = (type, item) => {
      if (type === 'profile') handleViewUserProfile(item.id);
      else if (type === 'job') handleViewJobDetail(item);
  };

  const handleApplyJob = (jobId) => {
    if (!appliedJobs.includes(jobId)) setAppliedJobs(prev => [...prev, jobId]);
  };

  const handleOpenReport = (job) => { setJobToReport(job); setIsReportModalOpen(true); };

  const handleSubmitReport = () => {
    if (jobToReport) {
      setReportedJobs(prev => [...prev, jobToReport.id]);
      alert("Reporte recibido.");
      setIsReportModalOpen(false);
      setJobToReport(null);
      if (view === 'job-detail' && selectedJob?.id === jobToReport.id) {
          setView('jobs');
          window.scrollTo(0,0);
      }
    }
  };

  const visibleJobs = jobs.filter(job => !reportedJobs.includes(job.id));

  // Render condicional temprano
  if (sessionLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans min-h-screen transition-colors duration-300">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-30 bg-blue-900 text-white shadow-md border-b-4 border-yellow-500">
        <div className="max-w-7xl mx-auto px-2 md:px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2 font-bold text-lg text-yellow-400 shrink-0 cursor-pointer" onClick={() => setView('feed')}>
            <ArrowUp className="bg-yellow-400 text-blue-900 p-0.5 rounded" size={28} />
            <span className="hidden md:inline">AscenLin</span>
          </div>

          <div className="hidden md:flex h-full items-center gap-1 ml-4">
             <DesktopNavLink icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
             <DesktopNavLink icon={Briefcase} label="Empleos" active={view === 'jobs' || view === 'job-detail' || view === 'create-job'} onClick={() => setView('jobs')} />
             <DesktopNavLink icon={Users} label="Red" active={view === 'networking'} onClick={() => setView('networking')} />
             <DesktopNavLink icon={LifeBuoy} label="Soporte" active={view === 'support'} onClick={() => setView('support')} />
          </div>

          <SearchBar onSearch={handlePerformSearch} />

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
             <button onClick={handleGoToMyProfile} className={`hidden md:flex items-center gap-2 p-1 pr-3 rounded-full transition-colors group ${view === 'profile' && !viewedProfile ? 'bg-blue-800' : 'hover:bg-blue-800'}`}>
               <div className="w-8 h-8 rounded-full bg-blue-700 border border-blue-400 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                  <Avatar initials={user.avatar} src={user.avatar_url} size="sm" className="border-none" />
               </div>
               <span className="text-xs text-blue-200 font-bold group-hover:text-white max-w-[100px] truncate">{user.name}</span>
             </button>
             <div className="hidden md:block h-6 w-px bg-blue-700 mx-1"></div>
             <button onClick={() => setView('settings')} className={`hidden md:block p-1.5 rounded-full ${view === 'settings' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800'}`}>
               <Settings size={20} />
             </button>
             <Bell size={20} className="text-blue-200 cursor-pointer hover:text-white" />
             <button onClick={handleLogout} className="hidden sm:block text-blue-200 hover:text-red-300 transition-colors p-1"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      <main className={`min-h-[calc(100vh-4rem)] ${(view === 'job-detail' || view === 'create-job') ? 'w-full' : 'max-w-7xl mx-auto p-4'}`}>
        {/* SUSPENSE: Muestra el PageLoader mientras se descarga el código de la vista */}
        <Suspense fallback={<PageLoader />}>
            {view === 'feed' && <FeedView user={user} onViewProfile={handleViewUserProfile} />}
            
            {view === 'jobs' && (
              <JobsView 
                jobs={visibleJobs} 
                userRole={user.role}
                onCreateJobClick={handleGoToCreateJob} 
                onViewDetail={handleViewJobDetail} 
                appliedJobs={appliedJobs} 
              />
            )}

            {view === 'job-detail' && (
              <JobDetailView 
                job={selectedJob} 
                onBack={() => setView('jobs')} 
                onApply={handleApplyJob} 
                userRole={user.role}
                isApplied={appliedJobs.includes(selectedJob?.id)} 
                onReport={handleOpenReport}
                onViewCompany={handleViewCompanyProfile} 
              />
            )}

            {view === 'create-job' && (
              <CreateJobView
                 onCreate={handleCreateJob}
                 onCancel={() => setView('jobs')}
                 currentUser={user}
              />
            )}

            {view === 'search' && (
                <SearchView 
                    results={searchResults} 
                    loading={isSearching} 
                    onItemClick={handleSearchResultClick} 
                />
            )}

            {view === 'networking' && <NetworkingView />}
            {view === 'support' && <SupportView />}
            
            {view === 'profile' && (
                <ProfileView 
                    user={viewedProfile || user} 
                    currentUser={user}          
                    onProfileUpdate={handleProfileRefresh} 
                />
            )}
            
            {view === 'settings' && <SettingsView isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />}
        </Suspense>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-around p-2 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <NavButton icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
        <NavButton icon={Briefcase} label="Empleos" active={view === 'jobs' || view === 'job-detail' || view === 'create-job'} onClick={() => setView('jobs')} />
        <NavButton icon={Users} label="Red" active={view === 'networking'} onClick={() => setView('networking')} />
        <NavButton icon={Settings} label="Ajustes" active={view === 'settings'} onClick={() => setView('settings')} />
        <NavButton icon={User} label="Perfil" active={view === 'profile'} onClick={handleGoToMyProfile} />
      </div>

      <ReportJobModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleSubmitReport}
        jobTitle={jobToReport?.title}
      />

    </div>
  );
}

export default App;