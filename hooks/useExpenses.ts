import { useContext } from 'react';
import { ExpenseContext, ExpenseContextValue } from '../context/ExpenseContext';

export function useExpenses(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpenses must be used within an ExpenseProvider');
  return ctx;
}
