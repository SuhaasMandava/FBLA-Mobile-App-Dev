import { useContext } from 'react';
import { InviteLinkContext, InviteLinkContextValue } from '../context/InviteLinkContext';

export function useInviteLink(): InviteLinkContextValue {
  const ctx = useContext(InviteLinkContext);
  if (!ctx) throw new Error('useInviteLink must be used within an InviteLinkProvider');
  return ctx;
}
