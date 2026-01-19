import React from 'react';

const Card = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-100 dark:border-slate-700 p-4 ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;