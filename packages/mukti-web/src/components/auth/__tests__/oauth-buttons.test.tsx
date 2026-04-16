import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OAuthButtons } from '../oauth-buttons';

describe('OAuthButtons', () => {
  it('renders Google OAuth button', () => {
    render(<OAuthButtons />);

    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('renders divider with text', () => {
    render(<OAuthButtons />);

    expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
  });

  it('calls onGoogleClick when Google button is clicked', async () => {
    const user = userEvent.setup();
    const onGoogleClick = jest.fn();

    render(<OAuthButtons onGoogleClick={onGoogleClick} />);

    const googleButton = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(googleButton);

    expect(onGoogleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state for Google button when clicked', async () => {
    const user = userEvent.setup();
    const onGoogleClick = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<OAuthButtons onGoogleClick={onGoogleClick} />);

    const googleButton = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(googleButton);

    // Button should show loading spinner
    expect(googleButton).toBeDisabled();
  });

  it('applies custom className', () => {
    const { container } = render(<OAuthButtons className="custom-class" />);

    const oauthContainer = container.querySelector('.custom-class');
    expect(oauthContainer).toBeInTheDocument();
  });

  it('prevents multiple clicks while loading', async () => {
    const user = userEvent.setup();
    const onGoogleClick = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<OAuthButtons onGoogleClick={onGoogleClick} />);

    const googleButton = screen.getByRole('button', { name: /sign in with google/i });

    // Click multiple times rapidly
    await user.click(googleButton);
    await user.click(googleButton);
    await user.click(googleButton);

    // Should only be called once
    expect(onGoogleClick).toHaveBeenCalledTimes(1);
  });
});
