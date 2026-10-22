import { useContext } from 'react';
import { ChecklistContext, ChecklistContextValue } from '../context/ChecklistContext';

export function useChecklist(): ChecklistContextValue {
  const ctx = useContext(ChecklistContext);
  if (!ctx) throw new Error('useChecklist must be used within a ChecklistProvider');
  return ctx;
}
