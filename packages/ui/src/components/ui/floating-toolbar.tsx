'use client';

import {
  type FloatingToolbarState,
  type Placement,
  flip,
  offset,
  useFloatingToolbar,
  useFloatingToolbarState,
} from '@platejs/floating';
import { useComposedRef } from '@udecode/cn';
import { KEYS } from 'platejs';
import {
  useEditorId,
  useEventEditorValue,
  usePluginOption,
} from 'platejs/react';

import { cn } from '@ui/lib/utils';

import { Toolbar } from './toolbar';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react';

export function FloatingToolbar({
  children,
  className,
  state,
  placement = 'top',
  ...props
}: ComponentProps<typeof Toolbar> & {
  state?: FloatingToolbarState & { isDialogOpen?: boolean };
  placement?: Placement;
}) {
  const { isDialogOpen } = state || {};
  const editorId = useEditorId();
  const focusedEditorId = useEventEditorValue('focus');
  const isFloatingLinkOpen = !!usePluginOption({ key: KEYS.link }, 'mode');
  const isAIChatOpen = usePluginOption({ key: KEYS.aiChat }, 'open');

  // Track when dialog was recently closed to prevent toolbar from hiding
  // during the selection collapse/restore cycle in onCloseAutoFocus
  const [dialogJustClosed, setDialogJustClosed] = useState(false);
  const prevDialogOpenRef = useRef(isDialogOpen);

  useLayoutEffect(() => {
    if (prevDialogOpenRef.current && !isDialogOpen) {
      setDialogJustClosed(true);
    }
    prevDialogOpenRef.current = isDialogOpen;
  }, [isDialogOpen]);

  useEffect(() => {
    if (dialogJustClosed) {
      const timer = setTimeout(() => {
        setDialogJustClosed(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [dialogJustClosed]);

  const floatingToolbarState = useFloatingToolbarState({
    editorId,
    focusedEditorId,
    hideToolbar: isFloatingLinkOpen || isAIChatOpen,
    ...state,
    floatingOptions: {
      middleware: [
        offset(12),
        flip({
          fallbackPlacements: [
            'top-start',
            'top-end',
            'bottom-start',
            'bottom-end',
          ],
          padding: 12,
        }),
      ],
      placement,
      ...state?.floatingOptions,
    },
  });

  const {
    clickOutsideRef,
    hidden,
    props: rootProps,
    ref: floatingRef,
  } = useFloatingToolbar(floatingToolbarState);

  const ref = useComposedRef<HTMLDivElement>(props.ref, floatingRef);

  // Save last known position so we can keep the toolbar visible during
  // the dialog close => selection restore cycle
  const lastRootPropsRef = useRef(rootProps);
  if (!hidden) {
    lastRootPropsRef.current = rootProps;
  }

  const shouldPreventHide = isDialogOpen || dialogJustClosed;

  if (hidden && !shouldPreventHide) return null;

  // When preventing hide, save the last known position
  const activeRootProps = hidden ? lastRootPropsRef.current : rootProps;

  return (
    <div ref={shouldPreventHide ? undefined : clickOutsideRef}>
      <Toolbar
        {...props}
        {...activeRootProps}
        ref={ref}
        className={cn(
          'scrollbar-hide absolute z-50 overflow-x-auto whitespace-nowrap rounded-md border bg-popover p-1 opacity-100 shadow-md print:hidden',
          'max-w-[80vw]',
          className
        )}
      >
        {children}
      </Toolbar>
    </div>
  );
}
