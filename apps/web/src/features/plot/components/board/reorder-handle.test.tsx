import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { useReorderSortable } from '@web/features/plot/components/board/reorder-handle';

const wrapper = ({ children }: { children: ReactNode }) => (
  <DndContext>{children}</DndContext>
);

function sortable(activator?: 'container' | 'handle') {
  return renderHook(
    () =>
      useReorderSortable({
        id: 'p1',
        type: 'plotline',
        editable: true,
        dragType: null,
        paused: false,
        activator,
      }),
    { wrapper }
  ).result.current;
}

describe('useReorderSortable', () => {
  it('starts a pointer drag from the whole container by default', () => {
    const { containerProps, handleProps } = sortable();

    expect(containerProps).toHaveProperty('onPointerDown');
    expect(handleProps).not.toHaveProperty('onPointerDown');
  });

  it('starts a pointer drag only from the handle when asked', () => {
    const { containerProps, handleProps } = sortable('handle');

    expect(containerProps).not.toHaveProperty('onPointerDown');
    expect(containerProps).toHaveProperty('ref');
    expect(handleProps).toHaveProperty('onPointerDown');
    expect(handleProps).toHaveProperty('onKeyDown');
  });
});
