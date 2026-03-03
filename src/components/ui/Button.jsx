import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyle =
    'px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-gold-premium focus:ring-offset-2';

  const variants = {
    primary:
      'bg-gold-premium text-ivory hover:bg-gold-champagne shadow-md border border-transparent',
    secondary:
      'bg-emerald-medium text-ivory hover:bg-emerald-dark border border-emerald-dark',
    ghost:
      // 👇 AQUÍ ESTÁ TU NUEVO BOTÓN ROJO INTENSO 👇
      'bg-red-100 text-red-500 hover:bg-red-100 shadow-md border border-transparent',
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;