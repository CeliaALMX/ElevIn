import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
// Ajusta estas rutas según donde guardes tus componentes UI y datos
import Button from './ui/Button';
import { MOCK_USER_PROFILE } from '../data/mockData';

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulamos el login pasando el perfil fijo
    onLogin(MOCK_USER_PROFILE);
  };

  return (
    <div
      className="flex flex-col items-center justify-center bg-blue-900 w-full"
      style={{ minHeight: '100vh' }}
    >
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-sm mx-4 border-t-8 border-yellow-400">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full mb-3">
            <ArrowUp className="w-8 h-8 text-blue-900" />
          </div>
          <h1 className="text-2xl font-bold text-blue-900 dark:text-white text-center">
            ElevatorConnect
          </h1>
          <p className="text-gray-500 text-sm">
            Comunidad de Transporte Vertical
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 outline-none dark:bg-slate-700 dark:text-white"
              placeholder="usuario@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 outline-none dark:bg-slate-700 dark:text-white"
              placeholder="••••••"
            />
          </div>
          <Button variant="primary" className="w-full mt-4">
            Ingresar
          </Button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-4">
          v1.0.2 - Acceso Técnico
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
