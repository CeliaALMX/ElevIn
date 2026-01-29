import React from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white dark:bg-emerald-medium rounded-xl shadow-lg border border-softgray dark:border-emerald-dark p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;