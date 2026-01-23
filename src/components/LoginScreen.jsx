import React, { useState } from 'react';
import { ArrowUp, Loader2, Eye, EyeOff, Building2, User } from 'lucide-react';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';

// Dominios bloqueados para empresas
const PUBLIC_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com'];

const LoginScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // false = Profesional, true = Empresa
  const [isCompany, setIsCompany] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    // Campos Empresa
    legalName: '',
    employeeCount: '',
    companyPhone: '',
    address: '',
    website: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isCorporateEmail = (email) => {
    if (!email) return false;
    const domain = email.split('@')[1];
    if (!domain) return false;
    return !PUBLIC_DOMAINS.includes(domain.toLowerCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
      } else {
        // --- REGISTRO ---
        const role = isCompany ? 'Empresa' : 'Técnico'; 

        // Validaciones Empresa
        if (isCompany) {
            if (!isCorporateEmail(formData.email)) throw new Error("Empresas requieren correo corporativo.");
            if (!formData.legalName || !formData.address) throw new Error("Completa los datos de la empresa.");
        }

        const initials = formData.name ? formData.name.substring(0, 2).toUpperCase() : 'US';
        
        const metaData = {
            full_name: formData.name,
            role: role,
            avatar_initials: initials,
            // Datos Empresa
            ...(isCompany && {
                legal_name: formData.legalName,
                employee_count: formData.employeeCount,
                phone: formData.companyPhone,
                address: formData.address,
                website: formData.website
            }),
            // NOTA: Ya no pedimos datos laborales aquí para profesionales
        };

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: metaData, emailRedirectTo: window.location.origin }
        });

        if (error) throw error;
        alert('Registro exitoso. Revisa tu correo.');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- CAMPOS DE EMPRESA ---
  const renderCompanyFields = () => (
    <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-1 bg-gray-50 dark:bg-slate-700/30 p-4 rounded-lg border border-gray-100 dark:border-slate-600">
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Datos Fiscales</label>ß
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select name="employeeCount" value={formData.employeeCount} onChange={handleChange}
            className="w-full p-2 text-sm bg-white border border-gray-200 rounded outline-none">
            <option value="">Empleados</option>
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="50+">50+</option>
        </select>
        <input name="companyPhone" type="tel" placeholder="Teléfono" value={formData.companyPhone} onChange={handleChange} required={isCompany}
          className="w-full p-2 text-sm bg-white border border-gray-200 rounded outline-none focus:border-blue-500 transition-all" />
      </div>
      <input name="address" type="text" placeholder="Dirección Fiscal" value={formData.address} onChange={handleChange} required={isCompany}
          className="w-full p-2 text-sm bg-white border border-gray-200 rounded outline-none focus:border-blue-500 transition-all" />
      <input name="website" type="url" placeholder="Sitio Web (https://)" value={formData.website} onChange={handleChange}
          className="w-full p-2 text-sm bg-white border border-gray-200 rounded outline-none focus:border-blue-500 transition-all" />
    </div>
  );

  return (
    <div className="min-h-screen w-full flex bg-gray-50 dark:bg-slate-900 font-sans">
      
      {/* PANEL IZQUIERDO */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>
        <div className="flex items-center gap-3 z-10">
          <div className="bg-yellow-400 p-2 rounded-lg"><ArrowUp className="w-6 h-6 text-blue-900" strokeWidth={3} /></div>
          <span className="text-2xl font-bold tracking-tight">ElevatorConnect</span>
        </div>
        <div className="z-10 max-w-lg">
          <h2 className="text-4xl font-extrabold mb-6 leading-tight">La comunidad oficial para el <span className="text-yellow-400">Transporte Vertical</span>.</h2>
          <p className="text-blue-100 text-lg mb-8">Conecta con técnicos, ingenieros y empresas.</p>
        </div>
        <div className="z-10 text-xs text-blue-300">© 2024 ElevatorConnect. v1.1.0</div>
      </div>

      {/* PANEL DERECHO */}
      <div className="w-full lg:w-1/2 h-screen overflow-y-auto flex items-center justify-center p-6 bg-gray-50 dark:bg-slate-900">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 my-8">
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{isLogin ? '¡Hola de nuevo!' : 'Crea tu Cuenta'}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{isLogin ? 'Ingresa tus credenciales.' : 'Únete a la red profesional más grande del gremio.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {!isLogin && (
              <div className="space-y-4">
                  {/* SELECTOR DE ROL */}
                  <div className="flex p-1 bg-gray-100 dark:bg-slate-700 rounded-lg">
                      <button type="button" onClick={() => setIsCompany(false)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${!isCompany ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                          <User size={16} /> Profesional
                      </button>
                      <button type="button" onClick={() => setIsCompany(true)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${isCompany ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                          <Building2 size={16} /> Empresa
                      </button>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre</label>
                      <input name="name" type="text" required value={formData.name} onChange={handleChange}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white dark:border-slate-600 transition-all"
                          placeholder={isCompany ? "Ej. Elevadores MX" : "Tu nombre completo"} />
                  </div>

                  {isCompany && renderCompanyFields()}
              </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        {isCompany && !isLogin ? 'Correo Admin' : 'Correo'}
                    </label>
                    <input name="email" type="email" required value={formData.email} onChange={handleChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white dark:border-slate-600 transition-all"
                        placeholder="correo@ejemplo.com" />
                </div>
                
                <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contraseña</label>
                    <input name="password" type={showPassword ? "text" : "password"} required value={formData.password} onChange={handleChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white dark:border-slate-600 pr-10 transition-all"
                        placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-[32px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            <Button type="submit" variant="primary" disabled={loading}
              className="w-full py-3.5 text-base font-semibold shadow-lg shadow-blue-900/10 flex justify-center items-center mt-2">
              {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-gray-100 dark:border-slate-700 pt-6">
             <button type="button" onClick={() => { setIsLogin(!isLogin); setIsCompany(false); }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium dark:text-blue-400 transition-colors">
                {isLogin ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;