import React, { useState, useEffect, useRef } from 'react';

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isLoading?: boolean;
  className?: string;
  id?: string;
  name?: string;
  onSearch?: (query: string) => Promise<void>;
  serverSearchEnabled?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  isLoading = false,
  className = '',
  id,
  name,
  onSearch,
  serverSearchEnabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Filter options based on search input - only used if serverSearchEnabled is false
  const filteredOptions = serverSearchEnabled 
    ? options 
    : options.filter(option => option.toLowerCase().includes(searchValue.toLowerCase()));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset search value when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchValue('');
    }
  }, [isOpen]);

  // Handle server-side search with debounce
  useEffect(() => {
    if (!serverSearchEnabled || !onSearch || !isOpen) return;
    
    // Debounce the search requests to avoid too many API calls
    const timeoutId = setTimeout(async () => {
      if (searchValue.trim()) {
        setIsSearching(true);
        try {
          await onSearch(searchValue);
        } finally {
          setIsSearching(false);
        }
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [searchValue, onSearch, serverSearchEnabled, isOpen]);
  
  // Handle selection of an option
  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-left flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value || placeholder}
        </span>
        <svg 
          className="w-5 h-5 text-gray-400" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 sticky top-0 bg-white border-b border-gray-300">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search..."
              className="w-full p-2 border border-gray-300 rounded-md"
              autoFocus
            />
          </div>
          
          {isLoading || isSearching ? (
            <div className="p-4 text-center text-gray-500">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No options found</div>
          ) : (
            <ul>
              {filteredOptions.map((option) => (
                <li 
                  key={option} 
                  className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                    option === value ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {/* Hidden input for form submission */}
      <input 
        type="hidden" 
        value={value}
        id={id}
        name={name}
      />
    </div>
  );
};

export default SearchableDropdown;
