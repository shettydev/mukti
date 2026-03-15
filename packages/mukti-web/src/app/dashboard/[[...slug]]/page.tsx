import { notFound, redirect } from 'next/navigation';

import { getDashboardRedirectPath } from '@/lib/utils/dashboard-routes';

interface DashboardCatchAllPageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function DashboardCatchAllPage({ params }: DashboardCatchAllPageProps) {
  const { slug = [] } = await params;
  const redirectPath = getDashboardRedirectPath(slug);

  if (redirectPath) {
    redirect(redirectPath);
  }

  notFound();
}
