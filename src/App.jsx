import React, { useState, useEffect } from 'react';
import { Briefcase, Home, User, LogOut, Bell, ArrowUp, Users, LifeBuoy, Settings, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

// --- VISTAS ---
import LoginScreen from './components/LoginScreen';
import Avatar from './components/ui/Avatar';
import FeedView from './components/views/FeedView';
import SettingsView from './components/views/SettingsView';
import JobsView from './components/views/JobsView';
import SupportView from './components/views/SupportView';
import NetworkingView from './components/views/NetworkingView';
import ProfileView from './components/views/ProfileView';
import JobDetailView from './components/views/JobDetailView';
import CreateJobView from './components/views/CreateJobView';

// --- MODALES ---
import ReportJobModal from './components/modals/ReportJobModal';

import { DesktopNavLink, NavButton } from './components/ui/NavComponents';
import { JOBS_DATA } from './data/mockData';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('feed'); 
  const [sessionLoading, setSessionLoading] = useState(true);
  
  // --- ESTADOS DE DATOS ---
  const [jobs, setJobs] = useState(() => {
    const savedJobs = localStorage.getItem('elevin_jobs');
    return savedJobs ? JSON.parse(savedJobs) : JOBS_DATA;
  });

  // --- ESTADO DE POSTULACIONES ---
  const [appliedJobs, setAppliedJobs] = useState(() => {
    const saved = localStorage.getItem('elevin_applications');
    return saved ? JSON.parse(saved) : []; 
  });

  // --- ESTADO DE REPORTADOS (NUEVO) ---
  const [reportedJobs, setReportedJobs] = useState(() => {
    const saved = localStorage.getItem('elevin_reported');
    return saved ? JSON.parse(saved) : []; 
  });

  // --- ESTADO DE MODALES ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [jobToReport, setJobToReport] = useState(null);

  const [selectedJob, setSelectedJob] = useState(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'light' ? false : true;
  });

  // Persistencia
  useEffect(() => { localStorage.setItem('elevin_jobs', JSON.stringify(jobs)); }, [jobs]);
  useEffect(() => { localStorage.setItem('elevin_applications', JSON.stringify(appliedJobs)); }, [appliedJobs]);
  
  // Guardamos los reportados
  useEffect(() => { localStorage.setItem('elevin_reported', JSON.stringify(reportedJobs)); }, [reportedJobs]);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const { data: authData } = await supabase.auth.getUser();
      
      const displayEmail = data?.email || authData?.user?.email || 'No definido';
      const displayPhone = data?.phone || 'Sin teléfono';

      if (data) {
        setUser({ 
          id: data.id, 
          name: data.full_name, 
          role: data.role, 
          avatar: data.avatar_initials, 
          avatar_url: data.avatar_url, 
          cover_url: data.cover_url, 
          bio: data.bio, 
          company: data.company || 'Independiente', 
          location: data.location,
          email: displayEmail,
          phone: displayPhone,
          certifications: data.certifications || '',
          projects: data.projects || ''
        });
      }
    } catch (error) { console.error(error); } finally { setSessionLoading(false); }
  };

  useEffect(() => {
    const init = async () => { const { data: { session } } = await supabase.auth.getSession(); if (session) await fetchProfile(session.user.id); else setSessionLoading(false); };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => { if (session) await fetchProfile(session.user.id); else { setUser(null); setSessionLoading(false); } });
    return () => subscription.unsubscribe();
  }, []);

  const handleProfileRefresh = () => { if (user?.id) fetchProfile(user.id); };

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

  // --- LOGICA DE EMPLEOS ---
  const handleGoToCreateJob = () => { setView('create-job'); window.scrollTo(0,0); };

  const handleCreateJob = (newJobData) => {
    const newJob = {
      id: Date.now(), 
      ...newJobData,
      companyAvatar: user.avatar_url,
      companyInitials: user.avatar, 
      postedAt: new Date(),
      postedAtRelative: 'Hace un momento'
    };
    setJobs([newJob, ...jobs]);
    alert('¡Empleo publicado exitosamente!');
    setView('jobs'); 
    window.scrollTo(0,0);
  };

  const handleViewJobDetail = (job) => { setSelectedJob(job); setView('job-detail'); window.scrollTo(0,0); };

  // --- LOGICA DE POSTULACIÓN ---
  const handleApplyJob = (jobId, jobTitle) => {
    if (!appliedJobs.includes(jobId)) {
      setAppliedJobs([...appliedJobs, jobId]);
    }
  };

  // --- LOGICA DE REPORTE (ACTUALIZADA) ---
  const handleOpenReport = (job) => {
    setJobToReport(job);
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = (reportData) => {
    if (jobToReport) {
      // 1. Agregar ID a la lista negra
      setReportedJobs([...reportedJobs, jobToReport.id]);
      
      console.log("Reporte enviado:", reportData, "ID:", jobToReport.id);
      alert("Gracias. Hemos recibido tu reporte. El empleo ha sido ocultado de tu feed.");
      
      // 2. Cerrar modal y limpiar
      setIsReportModalOpen(false);
      setJobToReport(null);

      // 3. Si estábamos viendo el detalle de ese empleo, regresar a la lista
      if (view === 'job-detail' && selectedJob?.id === jobToReport.id) {
          setView('jobs');
          window.scrollTo(0,0);
      }
    }
  };

  // --- FILTRADO DE EMPLEOS VISIBLES ---
  // Creamos una variable derivada que excluye los reportados
  const visibleJobs = jobs.filter(job => !reportedJobs.includes(job.id));


  if (sessionLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans min-h-screen transition-colors duration-300">
      
      {/* Navbar Superior */}
      <nav className="sticky top-0 z-30 bg-blue-900 text-white shadow-md border-b-4 border-yellow-500">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-yellow-400 shrink-0">
            <ArrowUp className="bg-yellow-400 text-blue-900 p-0.5 rounded" size={28} />
            <span className="hidden xs:inline">ElevatorConnect</span>
            <span className="xs:hidden">ElevIn</span>
          </div>

          <div className="hidden md:flex h-full items-center gap-1">
             <DesktopNavLink icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
             <DesktopNavLink icon={Briefcase} label="Empleos" active={view === 'jobs' || view === 'job-detail' || view === 'create-job'} onClick={() => setView('jobs')} />
             <DesktopNavLink icon={Users} label="Red" active={view === 'networking'} onClick={() => setView('networking')} />
             <DesktopNavLink icon={LifeBuoy} label="Soporte" active={view === 'support'} onClick={() => setView('support')} />
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
             <button onClick={() => setView('profile')} className={`hidden md:flex items-center gap-2 p-1 pr-3 rounded-full transition-colors group ${view === 'profile' ? 'bg-blue-800' : 'hover:bg-blue-800'}`}>
               <div className="w-8 h-8 rounded-full bg-blue-700 border border-blue-400 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                  <Avatar initials={user.avatar} src={user.avatar_url} size="sm" className="border-none" />
               </div>
               <span className="text-xs text-blue-200 font-bold group-hover:text-white">{user.name}</span>
             </button>
             <div className="hidden md:block h-6 w-px bg-blue-700 mx-1"></div>
             <button onClick={() => setView('settings')} className={`hidden md:block p-1.5 rounded-full ${view === 'settings' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800'}`}>
               <Settings size={20} />
             </button>
             <Bell size={20} className="text-blue-200 cursor-pointer hover:text-white" />
             <button onClick={handleLogout} className="text-blue-200 hover:text-red-300 transition-colors p-1"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      <main className={`min-h-[calc(100vh-4rem)] ${(view === 'job-detail' || view === 'create-job') ? 'w-full' : 'max-w-7xl mx-auto p-4'}`}>
        
        {view === 'feed' && <FeedView user={user} />}
        
        {view === 'jobs' && (
          <JobsView 
            jobs={visibleJobs} // <--- PASAMOS LA LISTA FILTRADA
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
          />
        )}

        {view === 'create-job' && (
          <CreateJobView
             onCreate={handleCreateJob}
             onCancel={() => setView('jobs')}
             currentUser={user}
          />
        )}

        {view === 'networking' && <NetworkingView />}
        {view === 'support' && <SupportView />}
        {view === 'profile' && <ProfileView user={user} onProfileUpdate={handleProfileRefresh} />}
        {view === 'settings' && <SettingsView isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-around p-2 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <NavButton icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
        <NavButton icon={Briefcase} label="Empleos" active={view === 'jobs' || view === 'job-detail' || view === 'create-job'} onClick={() => setView('jobs')} />
        <NavButton icon={Users} label="Red" active={view === 'networking'} onClick={() => setView('networking')} />
        <NavButton icon={Settings} label="Ajustes" active={view === 'settings'} onClick={() => setView('settings')} />
        <NavButton icon={User} label="Perfil" active={view === 'profile'} onClick={() => setView('profile')} />
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