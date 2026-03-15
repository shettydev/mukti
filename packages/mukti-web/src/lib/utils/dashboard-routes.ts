export function getDashboardRedirectPath(slug: string[]): null | string {
  if (slug.length === 0) {
    return '/chat';
  }

  const [section, ...rest] = slug;

  if (section === 'conversations') {
    if (rest.length === 0 || (rest.length === 1 && rest[0] === 'new')) {
      return '/chat';
    }

    if (rest.length === 1) {
      return `/chat/${rest[0]}`;
    }

    return null;
  }

  if (section === 'canvas') {
    if (rest.length === 0) {
      return '/canvas';
    }

    if (rest.length === 1) {
      return `/canvas/${rest[0]}`;
    }

    return null;
  }

  if (section === 'map') {
    if (rest.length === 0) {
      return '/maps';
    }

    if (rest.length === 1) {
      return `/maps/${rest[0]}`;
    }

    return null;
  }

  if (section === 'settings' && rest.length === 0) {
    return '/settings';
  }

  return null;
}
