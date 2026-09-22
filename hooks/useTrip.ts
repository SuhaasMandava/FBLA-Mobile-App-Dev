import { useContext } from 'react';
import { TripContext, TripContextValue } from '../context/TripContext';

export function useTrip(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used within a TripProvider');
  return ctx;
}
