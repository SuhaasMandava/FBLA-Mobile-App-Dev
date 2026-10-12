import { ReactNode } from 'react';
import { TripProvider } from '../context/TripContext';
import { useAuth } from '../hooks/useAuth';

/**
 * Everything that holds a signed-in user's data lives under here. Keying on the
 * user id throws that state away on sign-out or when someone else signs in, so
 * one person's trips can never show up for another.
 */
export function SessionProviders({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  return <TripProvider key={userId ?? 'signed-out'}>{children}</TripProvider>;
}
