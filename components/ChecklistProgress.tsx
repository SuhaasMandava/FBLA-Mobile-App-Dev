import { ChecklistProgress as Progress } from '../models/ChecklistModel';
import { HeroStat } from './HeroStat';

/** How much of the trip's checklist is done. The count is always written out; the bar only repeats it. */
export function ChecklistProgress({ progress }: { progress: Progress }) {
  const complete = progress.total > 0 && progress.done === progress.total;
  return (
    <HeroStat
      eyebrow="Trip checklist"
      figure={progress.total === 0 ? 'No items' : `${progress.done}/${progress.total}`}
      figureNote={progress.total === 0 ? undefined : 'done'}
      fraction={progress.fraction}
      status={complete ? 'All done. Ready to go!' : progress.label}
      statusIcon={complete ? 'checkmark-circle' : 'checkbox-outline'}
      accessibilityLabel={progress.label}
    />
  );
}
