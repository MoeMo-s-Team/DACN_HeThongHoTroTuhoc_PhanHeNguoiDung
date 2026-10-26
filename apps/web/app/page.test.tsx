import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('web bootstrap page', () => {
  it('renders the application title', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1, name: 'Hệ thống hỗ trợ tự học' })).toBeInTheDocument();
  });
});
