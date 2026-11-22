// Proposed change: email a receipt after an order is placed.
// Called by the checkout handler with the request body.

export async function sendReceipt(db, mailer, body) {
  const [order] = await db.query(`SELECT * FROM orders WHERE id = ${body.orderId}`);
  const html = `<h1>Thanks, ${order.customerName}!</h1><p>${body.note}</p>`;
  await mailer.send({ html, subject: 'Your receipt', to: body.email });
}
