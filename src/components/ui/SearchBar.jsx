import React, { useState } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch(query);
    }
  };

  return (
    <div className="flex flex-1 max-w-md mx-2 md:mx-4 relative group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} className="text-blue-300 group-focus-within:text-yellow-400 transition-colors" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar..."
        className="block w-full pl-10 pr-3 py-1.5 border-none rounded-full leading-5 bg-blue-800 text-blue-100 placeholder-blue-300 focus:outline-none focus:bg-blue-700 focus:ring-2 focus:ring-yellow-400 focus:text-white sm:text-sm transition-all duration-200"
      />
    </div>
  );
};

export default SearchBar;