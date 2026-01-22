import React from 'react';

// MODIFICADO: Agregamos ...props para permitir eventos como onClick
const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-100 dark:border-slate-700 p-4 ${className}`}
      {...props} // <--- ESTO ES LA CLAVE: Pasa el onClick y otras props al div
    >
      {children}
    </div>
  );
};

export default Card;