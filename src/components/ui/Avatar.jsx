import React from 'react';

const Avatar = ({ initials, src, size = 'md', className = '' }) => {
  // Definimos tamaños
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-24 h-24 text-2xl",
    xl: "w-32 h-32 text-3xl" // Nuevo tamaño para el perfil grande
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div 
      className={`${currentSize} rounded-full bg-blue-700 text-white flex items-center justify-center font-bold border-4 border-white dark:border-slate-800 shrink-0 overflow-hidden shadow-sm ${className}`}
    >
      {src ? (
        <img 
          src={src} 
          alt="Avatar" 
          className="w-full h-full object-cover" 
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;