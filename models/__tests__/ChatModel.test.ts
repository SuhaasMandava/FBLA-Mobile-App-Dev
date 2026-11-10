import { ChatMessage, ChatMessageRow, ChatModel } from '../ChatModel';
import { validateChatForm } from '../MessageForm';
import { Trip } from '../TripModel';

const trip: Trip = {
  id: 't',
  name: 'Beach week',
  destination: 'Maui',
  startDate: '2026-07-01',
  endDate: '2026-07-07',
  budgetCents: 0,
  inviteCode: null,
  members: [
    { userId: 'sam', role: 'organizer', displayName: 'Sam Lee' },
    { userId: 'alex', role: 'member', displayName: 'Alex Kim' },
  ],
};

/** Local time, so the day a message falls on doesn't depend on the machine's time zone. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 6, day, hour, minute).toISOString();

const message = (id: string, createdAt: string, createdBy: string | null = 'alex', itemId: string | null = null): ChatMessage => ({
  id,
  tripId: 't',
  body: `Message ${id}`,
  itemId,
  createdBy,
  createdAt,
});

describe('ChatModel.fromRow', () => {
  it('maps a database row', () => {
    const row: ChatMessageRow = { id: 'm1', trip_id: 't', body: 'Hi', item_id: 'i1', created_by: 'sam', created_at: at(1, 9) };
    expect(ChatModel.fromRow(row)).toEqual({ id: 'm1', tripId: 't', body: 'Hi', itemId: 'i1', createdBy: 'sam', createdAt: at(1, 9) });
  });
});

describe('ChatModel.sort and latest', () => {
  const a = message('a', at(1, 9));
  const b = message('b', at(1, 10));
  const c = message('c', at(1, 10)); // same instant as b: the id breaks the tie

  it('orders oldest first, stable on ties', () => {
    expect(ChatModel.sort([c, b, a]).map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('finds the newest message, or null in an empty chat', () => {
    expect(ChatModel.latest([b, a])?.id).toBe('b');
    expect(ChatModel.latest([])).toBeNull();
  });
});

describe('ChatModel.entries', () => {
  it('puts a divider at each new day and groups runs by sender', () => {
    const entries = ChatModel.entries([
      message('1', at(1, 9), 'alex'),
      message('2', at(1, 9, 5), 'alex'),
      message('3', at(1, 9, 6), 'sam'),
      message('4', at(2, 8), 'sam'),
    ]);
    expect(entries.map((e) => (e.kind === 'day' ? 'day' : e.message.id))).toEqual(['day', '1', '2', '3', 'day', '4']);
    const runs = entries.flatMap((e) => (e.kind === 'message' ? [[e.startsRun, e.endsRun]] : []));
    expect(runs).toEqual([
      [true, false], // alex starts
      [false, true], // alex ends
      [true, true], // sam, alone that day
      [true, true], // sam again, but a new day starts a new run
    ]);
  });

  it('is empty for an empty chat', () => {
    expect(ChatModel.entries([])).toEqual([]);
  });
});

describe('ChatModel.unreadCount', () => {
  const messages = [message('1', at(1, 9), 'sam'), message('2', at(1, 10), 'alex'), message('3', at(1, 11), 'sam')];

  it("counts other people's messages since the chat was last open", () => {
    expect(ChatModel.unreadCount(messages, at(1, 9, 30), 'alex')).toBe(1);
  });

  it('never counts your own messages', () => {
    expect(ChatModel.unreadCount(messages, at(1, 8), 'sam')).toBe(1);
  });

  it('counts everything from others if the chat was never opened', () => {
    expect(ChatModel.unreadCount(messages, null, 'alex')).toBe(2);
  });
});

describe('ChatModel rules', () => {
  it('lets the author or an organizer delete, nobody else', () => {
    const mine = message('1', at(1, 9), 'alex');
    expect(ChatModel.canDelete(mine, trip, 'alex')).toBe(true);
    expect(ChatModel.canDelete(mine, trip, 'sam')).toBe(true);
    expect(ChatModel.canDelete(message('2', at(1, 9), 'sam'), trip, 'alex')).toBe(false);
    expect(ChatModel.canDelete(mine, trip, null)).toBe(false);
  });

  it('lets only members send', () => {
    expect(ChatModel.canSend(trip, 'alex')).toBe(true);
    expect(ChatModel.canSend(trip, 'stranger')).toBe(false);
    expect(ChatModel.canSend(trip, null)).toBe(false);
  });
});

describe('ChatModel.preview', () => {
  it('flattens line breaks and cuts long text', () => {
    expect(ChatModel.preview('Meet at 8\n\nin the lobby')).toBe('Meet at 8 in the lobby');
    const long = ChatModel.preview('x'.repeat(200), 20);
    expect(long).toHaveLength(20);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('validateChatForm', () => {
  const ok = { isMember: true, activityExists: true };

  it('trims and returns the text', () => {
    expect(validateChatForm({ body: '  Who is driving?  ' }, ok)).toEqual({ ok: true, data: 'Who is driving?' });
  });

  it('refuses an empty message and one that is too long (syntax)', () => {
    expect(validateChatForm({ body: '   ' }, ok)).toMatchObject({ ok: false, errors: { body: 'Write a message first.' } });
    expect(validateChatForm({ body: 'x'.repeat(501) }, ok).ok).toBe(false);
  });

  it('refuses someone who is not on the trip (semantics)', () => {
    expect(validateChatForm({ body: 'Hi' }, { ...ok, isMember: false })).toMatchObject({
      ok: false,
      errors: { body: "You're not part of this trip anymore, so you can't send messages to it." },
    });
  });

  it('refuses a message about an activity that was removed (semantics)', () => {
    expect(validateChatForm({ body: 'Hi' }, { ...ok, activityExists: false })).toMatchObject({
      ok: false,
      errors: { body: 'That activity was removed. Take it off the message and send again.' },
    });
  });
});
