import { useState, useEffect } from 'react';

/**
 * Single mobile-breakpoint source (nav/UX fix spec S5, 2026-11-22).
 * One hook, <768px, shared by App, Workspace2D, PinnedPanel and the
 * CommandLayer — no more per-component breakpoint islands.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < breakpoint || /Mobi|Android/i.test(navigator.userAgent);
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint || /Mobi|Android/i.test(navigator.userAgent));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}
