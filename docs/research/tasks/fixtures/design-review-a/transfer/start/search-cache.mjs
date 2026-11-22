// Proposed change: remember each user's last search results so "back" is instant.
// The store is shared by every request the server handles.

const recent = {};

export async function search(db, userId, term) {
  if (recent[userId]) {
    return recent[userId];
  }
  const results = await db.query(`SELECT * FROM products WHERE name LIKE '%${term}%'`);
  recent[userId] = results;
  return results;
}
