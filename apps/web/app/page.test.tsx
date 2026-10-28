import { redirect } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import Home from './page';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

describe('web bootstrap page', () => {
  it('routes the app entry point to the frozen login route', () => {
    Home();
    expect(redirect).toHaveBeenCalledWith('/dang-nhap');
  });
});
