export function selectParticipant(participants, role, memberId) {
  const otherRole = role === 'from' ? 'to' : 'from';
  return {
    ...participants,
    [role]: memberId,
    [otherRole]: memberId === participants[otherRole] ? participants[role] : participants[otherRole],
  };
}

export function debtBetween(debts, from, to) {
  return debts.find((debt) => debt.fromId === from && debt.toId === to)?.amount || 0;
}
