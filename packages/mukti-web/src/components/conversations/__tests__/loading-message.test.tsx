import { render, screen } from '@testing-library/react';

import { LoadingMessage } from '../loading-message';

/**
 * The reply loader has to be visible in both themes. The japandi tokens flip
 * under `.dark`, so `japandi-stone` is the ink in both, and `japandi-cream`
 * is the page background in both: a `dark:text-japandi-cream` override
 * draws the enso in the background colour and hides it.
 */
describe('LoadingMessage', () => {
  it('announces that a reply is on its way', () => {
    render(<LoadingMessage />);

    expect(screen.getByRole('status')).toHaveTextContent('AI is generating a response');
  });

  it('draws the enso in the theme ink, never the background colour', () => {
    const { container } = render(<LoadingMessage />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-japandi-stone');
    expect(svg?.getAttribute('class')).not.toMatch(/japandi-cream/);
  });
});
