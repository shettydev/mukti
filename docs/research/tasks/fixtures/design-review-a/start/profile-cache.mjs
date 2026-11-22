// Proposed change: cache user profiles in memory so the profile page loads faster.
// The cache is shared by every request the server handles.

const cache = {};

export async function getProfile(db, userId) {
  if (cache[userId]) {
    return cache[userId];
  }
  const profile = await db.query(`SELECT * FROM profiles WHERE user_id = '${userId}'`);
  cache[userId] = profile;
  return profile;
}

export async function updateProfile(db, userId, changes) {
  await db.update('profiles', { user_id: userId }, changes);
}
