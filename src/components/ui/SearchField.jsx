import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * Campo de búsqueda.
 *
 * Filtra mientras se escribe, sin botón de buscar ni espera: cualquier
 * retardo artificial en la ruta del input rompe la sensación de inmediatez.
 */
const SearchField = ({ value, onChange, placeholder = 'Buscar…', className = '' }) => (
  <div className={`relative ${className}`}>
    <Search
      size={16}
      strokeWidth={2}
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary"
    />
    <input
      type="search"
      role="searchbox"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-control border border-separator/70 bg-surface pl-9 pr-9
                 text-subhead text-label outline-none transition-[border-color,box-shadow] duration-[var(--t-fast)]
                 placeholder:text-label-quaternary focus:border-accent focus:shadow-focus
                 [&::-webkit-search-cancel-button]:appearance-none"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="tappable absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1
                   text-label-tertiary transition-colors hover:bg-fill/12 hover:text-label"
      >
        <span className="sr-only">Limpiar búsqueda</span>
        <X size={14} strokeWidth={2.4} />
      </button>
    )}
  </div>
);

export default SearchField;
