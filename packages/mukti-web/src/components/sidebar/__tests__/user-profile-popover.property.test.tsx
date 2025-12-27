/**
 * Property-based tests for UserProfilePopover component
 *
 * ** Profile popover shows all options**
 *
 * Tests that:
 * - When the profile popover opens, it displays Security, Settings, Help & Support, and Logout options
 * - Security link navigates to /security
 * - Settings link navigates to /settings
 * - Help & Support link navigates to /help
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';

import { UserProfilePopover } from '../user-profile-popover';

// Required menu options as per Requirements 10.2
const REQUIRED_MENU_OPTIONS = ['Security', 'Settings', 'Help & Support', 'Log out'] as const;

// Valid user roles
const VALID_ROLES: Array<'admin' | 'moderator' | 'user'> = ['admin', 'moderator', 'user'];

// Arbitrary for generating user first names
const firstNameArbitrary = fc
  .string({ maxLength: 20, minLength: 1 })
  .filter((s) => s.trim().length > 0 && /^[a-zA-Z]+$/.test(s.trim()))
  .map((s) => s.trim());

// Arbitrary for generating user last names
const lastNameArbitrary = fc
  .string({ maxLength: 20, minLength: 1 })
  .filter((s) => s.trim().length > 0 && /^[a-zA-Z]+$/.test(s.trim()))
  .map((s) => s.trim());

// Arbitrary for generating email addresses
const emailArbitrary = fc.emailAddress();

// Arbitrary for generating user IDs
const userIdArbitrary = fc.uuid();

// Arbitrary for generating a complete User object
const userArbitrary = fc.record({
  createdAt: fc.date(),
  email: emailArbitrary,
  emailVerified: fc.boolean(),
  firstName: firstNameArbitrary,
  id: userIdArbitrary,
  isActive: fc.boolean(),
  lastLoginAt: fc.option(fc.date(), { nil: undefined }),
  lastName: lastNameArbitrary,
  phone: fc.option(fc.string(), { nil: undefined }),
  role: fc.constantFrom(...VALID_ROLES),
  updatedAt: fc.date(),
});

describe('UserProfilePopover - Property Tests', () => {
  /**
   *  Profile popover shows all options
   *
   * For any click on the user profile, the popover should display
   * Security, Settings, Help & Support, and Logout options.
   *
   */
  describe(' Profile popover shows all options', () => {
    afterEach(() => {
      cleanup();
    });

    it('should display all required menu options when popover is opened', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.boolean(), // collapsed state
          async (userData, collapsed) => {
            cleanup();

            const mockOnLogout = jest.fn();

            render(
              <UserProfilePopover collapsed={collapsed} onLogout={mockOnLogout} user={userData} />
            );

            // Find and click the trigger button to open the popover
            const triggerButton = screen.getByRole('button');
            expect(triggerButton).toBeInTheDocument();

            await user.click(triggerButton);

            // Wait for the popover to open and verify all required options are present
            await waitFor(() => {
              REQUIRED_MENU_OPTIONS.forEach((option) => {
                expect(screen.getByText(option)).toBeInTheDocument();
              });
            });
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should display exactly the required menu options regardless of user data', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(userArbitrary, async (userData) => {
          cleanup();

          const mockOnLogout = jest.fn();

          render(<UserProfilePopover collapsed={false} onLogout={mockOnLogout} user={userData} />);

          // Open the popover
          const triggerButton = screen.getByRole('button');
          await user.click(triggerButton);

          // Wait for the popover to open
          await waitFor(() => {
            expect(screen.getByText('Security')).toBeInTheDocument();
          });

          // Verify all required options are present
          const securityOption = screen.getByText('Security');
          const settingsOption = screen.getByText('Settings');
          const helpOption = screen.getByText('Help & Support');
          const logoutOption = screen.getByText('Log out');

          expect(securityOption).toBeInTheDocument();
          expect(settingsOption).toBeInTheDocument();
          expect(helpOption).toBeInTheDocument();
          expect(logoutOption).toBeInTheDocument();
        }),
        { numRuns: 20 }
      );
    }, 60000);

    it('should display menu options in correct order with separator before logout', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(userArbitrary, async (userData) => {
          cleanup();

          const mockOnLogout = jest.fn();

          render(<UserProfilePopover collapsed={false} onLogout={mockOnLogout} user={userData} />);

          // Open the popover
          const triggerButton = screen.getByRole('button');
          await user.click(triggerButton);

          // Wait for the popover to open
          await waitFor(() => {
            expect(screen.getByText('Security')).toBeInTheDocument();
          });

          // Get all menu items
          const menuItems = screen.getAllByRole('menuitem');

          // Verify we have exactly 4 menu items (Security, Settings, Help & Support, Log out)
          expect(menuItems.length).toBe(4);

          // Verify the order of menu items
          expect(menuItems[0]).toHaveTextContent('Security');
          expect(menuItems[1]).toHaveTextContent('Settings');
          expect(menuItems[2]).toHaveTextContent('Help & Support');
          expect(menuItems[3]).toHaveTextContent('Log out');
        }),
        { numRuns: 20 }
      );
    }, 60000);

    it('should display all options regardless of collapsed state', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.boolean(), // collapsed state
          async (userData, collapsed) => {
            cleanup();

            const mockOnLogout = jest.fn();

            render(
              <UserProfilePopover collapsed={collapsed} onLogout={mockOnLogout} user={userData} />
            );

            // Open the popover
            const triggerButton = screen.getByRole('button');
            await user.click(triggerButton);

            // Wait for the popover to open and verify all options are present
            await waitFor(() => {
              REQUIRED_MENU_OPTIONS.forEach((option) => {
                expect(screen.getByText(option)).toBeInTheDocument();
              });
            });

            // The collapsed state should not affect the menu options
            const menuItems = screen.getAllByRole('menuitem');
            expect(menuItems.length).toBe(4);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should display all options regardless of user role', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(userArbitrary, fc.constantFrom(...VALID_ROLES), async (userData, role) => {
          cleanup();

          const mockOnLogout = jest.fn();
          const userWithRole = { ...userData, role };

          render(
            <UserProfilePopover collapsed={false} onLogout={mockOnLogout} user={userWithRole} />
          );

          // Open the popover
          const triggerButton = screen.getByRole('button');
          await user.click(triggerButton);

          // Wait for the popover to open and verify all options are present
          await waitFor(() => {
            REQUIRED_MENU_OPTIONS.forEach((option) => {
              expect(screen.getByText(option)).toBeInTheDocument();
            });
          });

          // User role should not affect the menu options
          const menuItems = screen.getAllByRole('menuitem');
          expect(menuItems.length).toBe(4);
        }),
        { numRuns: 15 }
      );
    }, 60000);
  });

  /**
   * Profile popover navigation works
   *
   * For any click on a navigation item in the profile popover,
   * the system should navigate to the correct route.
   *
   * - Security link navigates to /security
   * - Settings link navigates to /settings
   * - Help & Support link navigates to /help
   *
   */
  describe('Profile popover navigation works', () => {
    // Navigation routes mapping as per Requirements 10.3, 10.4, 10.5
    const NAVIGATION_ROUTES = [
      { href: '/security', label: 'Security', requirement: '10.3' },
      { href: '/settings', label: 'Settings', requirement: '10.4' },
      { href: '/help', label: 'Help & Support', requirement: '10.5' },
    ] as const;

    afterEach(() => {
      cleanup();
    });

    it('should have correct href for Security link (Requirement 10.3)', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.boolean(), // collapsed state
          async (userData, collapsed) => {
            cleanup();

            const mockOnLogout = jest.fn();

            render(
              <UserProfilePopover collapsed={collapsed} onLogout={mockOnLogout} user={userData} />
            );

            // Open the popover
            const triggerButton = screen.getByRole('button');
            await user.click(triggerButton);

            // Wait for the popover to open
            await waitFor(() => {
              expect(screen.getByText('Security')).toBeInTheDocument();
            });

            // Find the Security link and verify its href
            const securityLink = screen.getByRole('menuitem', { name: /security/i });
            expect(securityLink).toHaveAttribute('href', '/security');
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should have correct href for Settings link (Requirement 10.4)', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.boolean(), // collapsed state
          async (userData, collapsed) => {
            cleanup();

            const mockOnLogout = jest.fn();

            render(
              <UserProfilePopover collapsed={collapsed} onLogout={mockOnLogout} user={userData} />
            );

            // Open the popover
            const triggerButton = screen.getByRole('button');
            await user.click(triggerButton);

            // Wait for the popover to open
            await waitFor(() => {
              expect(screen.getByText('Settings')).toBeInTheDocument();
            });

            // Find the Settings link and verify its href
            const settingsLink = screen.getByRole('menuitem', { name: /settings/i });
            expect(settingsLink).toHaveAttribute('href', '/settings');
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should have correct href for Help & Support link (Requirement 10.5)', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.boolean(), // collapsed state
          async (userData, collapsed) => {
            cleanup();

            const mockOnLogout = jest.fn();

            render(
              <UserProfilePopover collapsed={collapsed} onLogout={mockOnLogout} user={userData} />
            );

            // Open the popover
            const triggerButton = screen.getByRole('button');
            await user.click(triggerButton);

            // Wait for the popover to open
            await waitFor(() => {
              expect(screen.getByText('Help & Support')).toBeInTheDocument();
            });

            // Find the Help & Support link and verify its href
            const helpLink = screen.getByRole('menuitem', { name: /help & support/i });
            expect(helpLink).toHaveAttribute('href', '/help');
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should have correct hrefs for all navigation links regardless of user data', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(userArbitrary, async (userData) => {
          cleanup();

          const mockOnLogout = jest.fn();

          render(<UserProfilePopover collapsed={false} onLogout={mockOnLogout} user={userData} />);

          // Open the popover
          const triggerButton = screen.getByRole('button');
          await user.click(triggerButton);

          // Wait for the popover to open
          await waitFor(() => {
            expect(screen.getByText('Security')).toBeInTheDocument();
          });

          // Verify all navigation routes have correct hrefs
          NAVIGATION_ROUTES.forEach(({ href, label }) => {
            const link = screen.getByRole('menuitem', { name: new RegExp(label, 'i') });
            expect(link).toHaveAttribute('href', href);
          });
        }),
        { numRuns: 20 }
      );
    }, 60000);

    it('should have correct hrefs regardless of collapsed state', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.boolean(), // collapsed state
          async (userData, collapsed) => {
            cleanup();

            const mockOnLogout = jest.fn();

            render(
              <UserProfilePopover collapsed={collapsed} onLogout={mockOnLogout} user={userData} />
            );

            // Open the popover
            const triggerButton = screen.getByRole('button');
            await user.click(triggerButton);

            // Wait for the popover to open
            await waitFor(() => {
              expect(screen.getByText('Security')).toBeInTheDocument();
            });

            // Verify all navigation routes have correct hrefs regardless of collapsed state
            NAVIGATION_ROUTES.forEach(({ href, label }) => {
              const link = screen.getByRole('menuitem', { name: new RegExp(label, 'i') });
              expect(link).toHaveAttribute('href', href);
            });
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should have correct hrefs regardless of user role', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(userArbitrary, fc.constantFrom(...VALID_ROLES), async (userData, role) => {
          cleanup();

          const mockOnLogout = jest.fn();
          const userWithRole = { ...userData, role };

          render(
            <UserProfilePopover collapsed={false} onLogout={mockOnLogout} user={userWithRole} />
          );

          // Open the popover
          const triggerButton = screen.getByRole('button');
          await user.click(triggerButton);

          // Wait for the popover to open
          await waitFor(() => {
            expect(screen.getByText('Security')).toBeInTheDocument();
          });

          // Verify all navigation routes have correct hrefs regardless of user role
          NAVIGATION_ROUTES.forEach(({ href, label }) => {
            const link = screen.getByRole('menuitem', { name: new RegExp(label, 'i') });
            expect(link).toHaveAttribute('href', href);
          });
        }),
        { numRuns: 15 }
      );
    }, 60000);
  });
});
