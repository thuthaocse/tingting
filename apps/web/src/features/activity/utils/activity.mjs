/** @param {import('../../../types').Group} group */
export function activityEntries(group) {
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
  return [...expenses, ...settlements].sort((left, right) => {
    const day = right.date.localeCompare(left.date);
    if (day) return day;
    const a = BigInt(left.createdOrder),
      b = BigInt(right.createdOrder);
    return a === b ? 0 : a > b ? -1 : 1;
  });
}
