import React from 'react';
import { Mail, CheckCircle, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

export const CheckEmailView = ({ onBackToLogin }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-6 text-center">
      <div className="bg-white dark:bg-emerald-deep p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 dark:border-emerald-dark">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-ivory mb-3">Revisa tu correo</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Hemos enviado un enlace de confirmación a tu dirección de email. Por favor, haz clic en él para activar tu cuenta.
        </p>
        <div className="space-y-3">
          <Button onClick={onBackToLogin} variant="secondary" className="w-full">
            Volver al inicio de sesión
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            ¿No lo recibes? Revisa tu carpeta de Spam.
          </p>
        </div>
      </div>
    </div>
  );
};
//Probabkemente esto lo quite, no le encuentro una función buenta >TODAVÍA<
export const VerifiedView = ({ onContinue }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-6 text-center">
      <div className="bg-white dark:bg-emerald-deep p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 dark:border-emerald-dark animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-ivory mb-3">¡Cuenta verificada!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Tu correo ha sido confirmado exitosamente. Ya eres parte de la comunidad AscenLin.
        </p>
        <Button onClick={onContinue} variant="primary" className="w-full flex items-center justify-center gap-2">
          Iniciar Sesión / Continuar <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
};