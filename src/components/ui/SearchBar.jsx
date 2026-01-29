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
        <Search size={16} className="text-gold-champagne group-focus-within:text-gold-champagne transition-colors" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar..."
        className="block w-full pl-10 pr-3 py-1.5 border-none rounded-full leading-5 bg-white text-blue-100 placeholder-gold-champagne focus:outline-none focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:text-gold-champagne sm:text-sm transition-all duration-200"
      />
    </div>
  );
};

export default SearchBar;