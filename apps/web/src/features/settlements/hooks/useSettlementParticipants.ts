import { useState } from 'react';
import { selectParticipant } from '../utils/participants.mjs';

export function useSettlementParticipants(initialFrom: string, initialTo: string) {
  const [participants, setParticipants] = useState({ from: initialFrom, to: initialTo });
  return {
    ...participants,
    selectFrom: (id: string) => setParticipants((current) => selectParticipant(current, 'from', id)),
    selectTo: (id: string) => setParticipants((current) => selectParticipant(current, 'to', id)),
  };
}
