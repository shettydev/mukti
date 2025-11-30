/**
 * Unit tests for TagInput component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TagInput } from '../tag-input';

describe('TagInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render with placeholder when empty', () => {
    render(<TagInput onChange={mockOnChange} value={[]} />);

    expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument();
  });

  it('should render existing tags', () => {
    render(<TagInput onChange={mockOnChange} value={['react', 'typescript']} />);

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('should add tag when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<TagInput onChange={mockOnChange} value={[]} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'newtag{Enter}');

    expect(mockOnChange).toHaveBeenCalledWith(['newtag']);
  });

  it('should add tag when comma is pressed', async () => {
    const user = userEvent.setup();
    render(<TagInput onChange={mockOnChange} value={[]} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'newtag,');

    expect(mockOnChange).toHaveBeenCalledWith(['newtag']);
  });

  it('should remove tag when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<TagInput onChange={mockOnChange} value={['react', 'typescript']} />);

    const removeButton = screen.getByLabelText('Remove react tag');
    await user.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith(['typescript']);
  });

  it('should remove last tag when Backspace is pressed on empty input', async () => {
    const user = userEvent.setup();
    render(<TagInput onChange={mockOnChange} value={['react', 'typescript']} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Backspace}');

    expect(mockOnChange).toHaveBeenCalledWith(['react']);
  });

  it('should not add duplicate tags', async () => {
    const user = userEvent.setup();
    render(<TagInput onChange={mockOnChange} value={['react']} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'react{Enter}');

    // Should not call onChange for duplicate
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should not add empty tags', async () => {
    const user = userEvent.setup();
    render(<TagInput onChange={mockOnChange} value={[]} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '   {Enter}');

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should convert tags to lowercase', async () => {
    const user = userEvent.setup();
    render(<TagInput onChange={mockOnChange} value={[]} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'REACT{Enter}');

    expect(mockOnChange).toHaveBeenCalledWith(['react']);
  });

  it('should respect maxTags limit', () => {
    render(<TagInput maxTags={2} onChange={mockOnChange} value={['tag1', 'tag2']} />);

    // Input should not be visible when max tags reached
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<TagInput disabled onChange={mockOnChange} value={['react']} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
    // Remove buttons should not be visible
    expect(screen.queryByLabelText('Remove react tag')).not.toBeInTheDocument();
  });

  it('should add tag on blur if input has value', async () => {
    const user = userEvent.setup();
    render(<TagInput onChange={mockOnChange} value={[]} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'newtag');
    await user.tab(); // Blur the input

    expect(mockOnChange).toHaveBeenCalledWith(['newtag']);
  });

  it('should clear input after adding tag', async () => {
    const user = userEvent.setup();
    render(<TagInput onChange={mockOnChange} value={[]} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'newtag{Enter}');

    expect(input).toHaveValue('');
  });

  it('should use custom placeholder', () => {
    render(<TagInput onChange={mockOnChange} placeholder="Custom placeholder" value={[]} />);

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });
});
