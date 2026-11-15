import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SettingsPage from '@/app/settings/page';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { LocalOnboardingTour } from '@/components/onboarding/local-onboarding-tour';
import { UserProfilePopover } from '@/components/sidebar/user-profile-popover';
import { isLocalMode } from '@/lib/config';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

jest.mock('@/components/auth/oauth-buttons', () => ({ OAuthButtons: () => null }));
jest.mock('@/lib/config', () => ({
  config: { api: { baseUrl: 'http://localhost:3000/api/v1' } },
  isLocalMode: jest.fn(() => true),
}));
jest.mock('@/components/data-disclosure/data-flow-panel', () => ({
  DataFlowLink: ({ publicView }: { publicView?: boolean }) => (
    <button data-public={publicView}>Your data and costs</button>
  ),
  DataFlowPanel: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Your data and costs</div> : null,
}));
jest.mock('@/components/data-disclosure/data-danger-zone', () => ({
  DataDangerZone: () => <div>Danger zone</div>,
}));
jest.mock('@/components/auth/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/layouts/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/ai/model-selector', () => ({ ModelSelector: () => null }));
jest.mock('@/components/settings/default-turn-budget-section', () => ({
  DefaultTurnBudgetSection: () => null,
}));
jest.mock('@/components/settings/local-provider-section', () => ({
  LocalProviderSection: () => null,
}));
jest.mock('@/lib/stores/ai-store', () => ({
  useAiStore: () => ({ hydrate: jest.fn(), isHydrated: true, models: [] }),
}));
jest.mock('@/lib/hooks/use-auth', () => ({
  useRegister: () => ({ isPending: false, mutate: jest.fn() }),
}));
jest.mock('next-themes', () => ({ useTheme: () => ({ setTheme: jest.fn(), theme: 'light' }) }));

it.each([true, false])('Settings exposes disclosure and deletion in local=%s', (local) => {
  (isLocalMode as jest.Mock).mockReturnValue(local);
  render(<SettingsPage />);
  expect(screen.getByRole('button', { name: 'Your data and costs' })).toBeVisible();
  expect(screen.getByText('Danger zone')).toBeVisible();
});

it('signup exposes the public hosted view before registration', () => {
  (isLocalMode as jest.Mock).mockReturnValue(false);
  render(<SignUpForm />);
  expect(screen.getByRole('button', { name: 'Your data and costs' })).toHaveAttribute(
    'data-public',
    'true'
  );
});

it('the local tour links to the disclosure instead of duplicating facts', () => {
  (isLocalMode as jest.Mock).mockReturnValue(true);
  useOnboardingStore.setState({ isOpen: true });
  render(<LocalOnboardingTour />);
  expect(screen.getByRole('button', { name: 'Your data and costs' })).toBeVisible();
});

it.each([true, false])('profile opens disclosure in local=%s', async (local) => {
  (isLocalMode as jest.Mock).mockReturnValue(local);
  render(
    <UserProfilePopover
      collapsed={false}
      onLogout={jest.fn()}
      user={{ email: 'ada@example.test', firstName: 'Ada', lastName: 'Lovelace' } as never}
    />
  );
  await userEvent.click(screen.getByRole('button', { name: /Ada Lovelace/ }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Your data and costs' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Your data and costs');
});
