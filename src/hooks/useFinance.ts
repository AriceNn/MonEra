import { useContext } from 'react';
import type { FinanceContextType } from '../context/FinanceContext';
import { FinanceContext } from '../context/FinanceContext';

/**
 * Custom hook to use FinanceContext
 * Must be used within FinanceProvider
 */
export function useFinance(): FinanceContextType {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
