import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SectionHeading from '@/components/limit/SectionHeading';

const renderHeading = (props) =>
  render(
    <MemoryRouter>
      <SectionHeading {...props} />
    </MemoryRouter>,
  );

describe('SectionHeading', () => {
  it('renders the title and optional label', () => {
    renderHeading({ label: 'Today', title: 'Meals' });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Meals');
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders a link only when "to" is provided', () => {
    const { unmount } = renderHeading({ title: 'Workouts' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    unmount();

    renderHeading({ title: 'Workouts', to: '/WorkoutHistory', action: 'See all' });
    const link = screen.getByRole('link', { name: /see all/i });
    expect(link).toHaveAttribute('href', '/WorkoutHistory');
  });
});
