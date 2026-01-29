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
      className={`${currentSize} rounded-full overflow-hidden flex items-center justify-center bg-emerald-dark text-gold-premium font-bold border-2 border-gold-champagne ${className}`}
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