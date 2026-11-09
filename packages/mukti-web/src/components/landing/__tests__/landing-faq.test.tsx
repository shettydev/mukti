import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LandingFaq from '../landing-faq';

jest.mock('motion/react', () => {
  const React = jest.requireActual('react');
  const passthrough = ({ children, ...rest }: { children?: React.ReactNode }) => {
    const props = Object.fromEntries(
      Object.entries(rest).filter(
        ([key]) => !['animate', 'initial', 'transition', 'viewport', 'whileInView'].includes(key)
      )
    );
    return React.createElement('div', props, children);
  };
  return { motion: new Proxy({}, { get: () => passthrough }) };
});

describe('LandingFaq', () => {
  it('describes the help controls in the direct-answer answer, without promising the solution', async () => {
    render(<LandingFaq />);

    await userEvent.click(screen.getByRole('button', { name: 'Will I ever get a direct answer?' }));

    const answer = screen.getByText(/Not the full solution\./);
    expect(answer).toHaveTextContent('every dialogue shows the level');
    expect(answer).toHaveTextContent('More help raises the level for your next reply');
    expect(answer).toHaveTextContent("Explain asks it to explain the one piece you're missing");
    expect(answer).toHaveTextContent(
      "Wrap up ends with a summary of what's settled, what's still open and your next step"
    );
    expect(answer).toHaveTextContent("Mukti still won't write the solution for you.");
  });
});
