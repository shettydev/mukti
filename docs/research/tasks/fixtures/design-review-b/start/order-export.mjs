// Proposed change: let users export their order history as a CSV download.
// Called by the web handler for GET /orders/export?userId=...&from=...

export async function exportOrders(db, query) {
  const rows = await db.query(
    `SELECT * FROM orders WHERE user_id = ${query.userId} AND created_at >= '${query.from}'`
  );
  let csv = 'id,item,price\n';
  for (const row of rows) {
    csv += `${row.id},${row.item},${row.price}\n`;
  }
  return csv;
}
