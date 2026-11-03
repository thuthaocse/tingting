/** @param {import('../../../types').Group} group */
export function activityEntries(group, events = []) {
  const expenses = group.expenses.map((expense) => ({
    id: expense.id,
    date: expense.date,
    createdOrder: expense.createdOrder || '0',
    expense,
    settlement: undefined,
  }));
  const settlements = group.settlements.map((settlement) => ({
    id: settlement.id,
    date: settlement.date,
    createdOrder: settlement.createdOrder || '0',
    expense: undefined,
    settlement,
  }));
  const changes = [];
  for (const event of events) {
    const transaction = createdTransaction(expenses, settlements, event);
    if (transaction) {
      transaction.createdEvent = event;
      continue;
    }
    changes.push({
      id: `event:${event.id}`,
      date: activityDate(event.createdAt),
      createdAt: event.createdAt,
      event,
    });
  }
  return [...expenses, ...settlements, ...changes].sort((left, right) => {
    const day = right.date.localeCompare(left.date);
    if (day) return day;
    if (left.event || right.event) {
      if (!left.event) return 1;
      if (!right.event) return -1;
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }
    const a = BigInt(left.createdOrder),
      b = BigInt(right.createdOrder);
    return a === b ? 0 : a > b ? -1 : 1;
  });
}

function createdTransaction(expenses, settlements, event) {
  if (event.action === 'save_expense' && event.summary.startsWith('Thêm khoản chi')) {
    return expenses.find((entry) => entry.id === event.entityId);
  }
  if (event.action === 'save_settlement' && event.summary === 'Thêm thanh toán') {
    return settlements.find((entry) => entry.id === event.entityId);
  }
  return undefined;
}

function activityDate(timestamp) {
  return new Date(new Date(timestamp).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
