import { useState } from 'react';

/**
 * Custom hook for managing state with localStorage persistence
 * @template T - The type of data to store
 * @param key - The localStorage key
 * @param initialValue - Initial value if no localStorage data exists
 * @returns [state, setState] tuple
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      
      const parsed = JSON.parse(item);
      
      // Handle Set deserialization
      if (initialValue instanceof Set && Array.isArray(parsed)) {
        return new Set(parsed) as T;
      }
      
      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      // Handle Set serialization
      const serializable = valueToStore instanceof Set 
        ? Array.from(valueToStore) 
        : valueToStore;
      
      window.localStorage.setItem(key, JSON.stringify(serializable));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
