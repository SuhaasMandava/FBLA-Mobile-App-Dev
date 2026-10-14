import { EmptyState } from '../components/EmptyState';

/** The checklist isn't built yet. The tab stays (tabs are never hidden) and says what's coming. */
export default function ChecklistScreen() {
  return (
    <EmptyState
      title="Checklist is coming soon"
      body="Shared packing lists and to-dos, so everyone knows who's bringing what."
    />
  );
}
