import React, { useState } from 'react';
import { ArrowUp, Users, Wrench, Briefcase, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';

const LoginScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Estado para ver contraseña
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Técnico'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
        const initials = formData.name ? formData.name.substring(0, 2).toUpperCase() : 'US';
        
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              role: formData.role,
              avatar_initials: initials
            },
            // Redirige al localhost después de confirmar (configura esto también en Supabase)
            emailRedirectTo: window.location.origin 
          }
        });
        if (error) throw error;
        alert('Registro exitoso. Si no entras automáticamente, por favor revisa tu correo para confirmar la cuenta.');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50 dark:bg-slate-900">
      
      {/* --- PANEL IZQUIERDO --- */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>

        <div className="flex items-center gap-3 z-10">
          <div className="bg-yellow-400 p-2 rounded-lg">
            <ArrowUp className="w-6 h-6 text-blue-900" strokeWidth={3} />
          </div>
          <span className="text-2xl font-bold tracking-tight">ElevatorConnect</span>
        </div>

        <div className="z-10 max-w-lg">
          <h2 className="text-4xl font-extrabold mb-6 leading-tight">
            La comunidad oficial para profesionales del <span className="text-yellow-400">Transporte Vertical</span>.
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Conecta con técnicos, ingenieros y empresas. La herramienta definitiva para el gremio.
          </p>

          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="bg-blue-800 p-3 rounded-full shadow-lg">
                <Wrench className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Soporte Técnico</h3>
                <p className="text-sm text-blue-200">Resuelve fallas con ayuda de expertos.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-blue-800 p-3 rounded-full shadow-lg">
                <Briefcase className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Bolsa de Trabajo</h3>
                <p className="text-sm text-blue-200">Ofertas exclusivas del sector.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-blue-800 p-3 rounded-full shadow-lg">
                <Users className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Networking Real</h3>
                <p className="text-sm text-blue-200">Conecta con colegas y proveedores.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="z-10 text-xs text-blue-300">
          © 2024 ElevatorConnect. v1.0.5
        </div>
      </div>

      {/* --- PANEL DERECHO --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700">
          
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full mb-3">
              <ArrowUp className="w-8 h-8 text-blue-900" />
            </div>
            <h1 className="text-2xl font-bold text-blue-900 dark:text-white">ElevatorConnect</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isLogin ? '¡Hola de nuevo!' : 'Únete al Gremio'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {isLogin ? 'Ingresa tus credenciales.' : 'Crea tu perfil profesional.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Tu nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="Técnico">Técnico</option>
                    <option value="Ingeniero">Ingeniero</option>
                    <option value="Ventas">Ventas</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo</label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                placeholder="correo@ejemplo.com"
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
              <input
                name="password"
                type={showPassword ? "text" : "password"} // Cambia el tipo dinámicamente
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white pr-10" // pr-10 para espacio del icono
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              disabled={loading}
              className="w-full py-3 text-base mt-2 shadow-lg shadow-blue-900/20 flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </Button>
          </form>

          <div className="mt-6 text-center border-t border-gray-100 dark:border-slate-700 pt-4">
             <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium dark:text-blue-400"
              >
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
              </button>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <CheckCircle size={12} className="text-green-500" /> Conexión segura con Supabase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;