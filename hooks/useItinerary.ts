import { useContext } from 'react';
import { ItineraryContext, ItineraryContextValue } from '../context/ItineraryContext';

export function useItinerary(): ItineraryContextValue {
  const ctx = useContext(ItineraryContext);
  if (!ctx) throw new Error('useItinerary must be used within an ItineraryProvider');
  return ctx;
}
