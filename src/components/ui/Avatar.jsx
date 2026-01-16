import React from 'react';

const Avatar = ({ initials, size = 'md' }) => {
  const sizeClass = size === 'lg' ?
    "w-24 h-24 text-2xl" : (size === 'sm' ? "w-8 h-8 text-xs" : "w-12 h-12 text-sm");

  return (
    <div className={`${sizeClass} rounded-full bg-blue-700 text-white flex items-center justify-center font-bold border-2 border-yellow-400 shrink-0`}>
      {initials}
    </div>
  );
};

export default Avatar;