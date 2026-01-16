import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '' }) => {
  const baseStyle =
    'px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2';

  const variants = {
    primary:
      'bg-yellow-400 text-blue-900 hover:bg-yellow-300 shadow-md border border-transparent',
    secondary:
      'bg-blue-800 text-white hover:bg-blue-700 border border-blue-600',
    ghost:
      'text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700',
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
