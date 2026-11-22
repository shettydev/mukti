/**
 * Returns the distinct hashtags in `post`, in the order they first appear.
 *
 * A hashtag is "#" followed by one or more letters a to z. Tags are compared
 * ignoring case and returned in lowercase without the "#".
 */
export function hashtags(post) {
  const seen = [];
  for (const [, tag] of post.matchAll(/#([a-z]+)/g)) {
    const lower = tag.toLowerCase();
    if (!seen.includes(lower)) {
      seen.push(lower);
    }
  }
  return seen;
}
