import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  debounceTime?: number; // Added debounce time prop with default in component
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
  debounceTime = 500, // Increased default debounce time from 300ms to 500ms
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousSearchRef = useRef<string>('');

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

  // Memoized search function with debounce
  const debouncedSearch = useCallback((query: string) => {
    // Skip duplicate searches
    if (query === previousSearchRef.current) return;

    // Update the previous search reference
    previousSearchRef.current = query;

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(async () => {
      if (!query.trim()) {
        // Skip empty searches or make a special empty search call if needed
        if (onSearch && serverSearchEnabled && isOpen) {
          setIsSearching(true);
          try {
            await onSearch('');
          } finally {
            setIsSearching(false);
          }
        }
        return;
      }

      if (onSearch && serverSearchEnabled && isOpen) {
        setIsSearching(true);
        try {
          await onSearch(query);
        } finally {
          setIsSearching(false);
        }
      }
    }, debounceTime);
  }, [onSearch, serverSearchEnabled, isOpen, debounceTime]);

  // Clean up the timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    // If the input is empty, don't trigger a search immediately
    if (!value.trim() && serverSearchEnabled) {
      return;
    }

    // Only search if there are at least 2 characters or it's empty (for reset)
    if (serverSearchEnabled && (value.trim().length >= 2 || !value.trim())) {
      debouncedSearch(value);
    }
  };

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
        {/* Improved contrast for the selected value or placeholder */}
        <span className={value ? 'text-gray-900 font-medium' : 'text-gray-500 font-medium'}>
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
              onChange={handleSearchChange}
              placeholder="Search..."
              className="w-full p-2 border border-gray-300 rounded-md text-gray-900 font-medium"
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
            <div className="p-4 text-center text-gray-700 font-medium">No options found</div>
          ) : (
            <ul>
              {filteredOptions.map((option) => (
                <li
                  key={option}
                  className={`px-4 py-2 cursor-pointer hover:bg-blue-50 text-gray-900 font-medium ${
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
        value={value || ''}
        id={id}
        name={name}
      />
    </div>
  );
};

export default SearchableDropdown;
