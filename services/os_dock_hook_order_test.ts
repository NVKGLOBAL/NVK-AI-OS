/**
 * OS Dock hook-order regression test (fix round, 2026-11-27).
 *
 * Root cause of the two spontaneous crashes in the 2026-11-27 17:12 PT
 * desktop check (Minified React error #300 at ~17:13, #310 at ~17:17):
 * Dock.tsx called React.useMemo AFTER an early `if (isMobile) return`,
 * so a desktop render ran TWO hooks (useIsMobile + useMemo) and a
 * mobile render ran ONE. Any crossing of the 768px breakpoint
 * mid-session changed the hook count between renders and React threw —
 * #300 when the count dropped (desktop → mobile), #310 when it rose
 * (mobile → desktop). Decoded from the shipped React 19.2.4 bundle:
 * #300 is thrown by finishRenderingHooks when the previous hook list
 * has unconsumed entries; #310 by the hook dispatcher when it runs
 * out of previous hooks. The eslint react-hooks scan flags exactly
 * this one violation in the whole codebase (Dock.tsx:48).
 *
 * This test mounts the REAL Dock in jsdom, resizes across the 768px
 * breakpoint in BOTH directions (twice), and asserts no throw and the
 * correct branch each time. Run: npx tsx services/os_dock_hook_order_test.ts
 * (also wired into `npm test`).
 */
async function main(): Promise<void> {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  const g = globalThis as any;
  g.window = dom.window;
  g.document = dom.window.document;
  // Node 21+ ships a getter-only global `navigator` — define the
  // jsdom one over it instead of assigning.
  Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });
  g.HTMLElement = dom.window.HTMLElement;
  g.Node = dom.window.Node;
  g.Event = dom.window.Event;
  g.IS_REACT_ACT_ENVIRONMENT = true;

  const React = (await import('react')).default;
  const { createRoot } = await import('react-dom/client');
  const { act } = React as any;
  const { Dock } = await import('../components/Dock');

  const setWidth = (w: number) => {
    Object.defineProperty(dom.window, 'innerWidth', { writable: true, configurable: true, value: w });
  };

  const apps = [
    { id: 'SystemMonitorPanel', name: 'NVK System Monitor', icon: 'ri-cpu-line', description: 'Monitor OS resources.', category: 'Core Systems' },
    { id: 'TraitGatePanel', name: 'Trait Gates', icon: 'ri-key-2-fill', description: 'Trait gates.', category: 'Core Systems' },
  ];

  let failures = 0;
  const check = (name: string, ok: boolean, detail = '') => {
    if (ok) console.log(`  PASS ${name}`);
    else { failures++; console.error(`  FAIL ${name} ${detail}`); }
  };

  const container = document.getElementById('root')!;
  const root = createRoot(container);
  const render = () =>
    act(() => {
      root.render(
        React.createElement(Dock, {
          apps,
          openAppIds: [],
          onAppClick: () => {},
          onOpenSearch: () => {},
        })
      );
    });
  const resize = (w: number) =>
    act(() => {
      setWidth(w);
      dom.window.dispatchEvent(new dom.window.Event('resize'));
    });

  console.log('Dock hook order — breakpoint crossings (the 17:12 PT crash repro):');

  // 1. Desktop first load: full dock footer, no mobile button.
  setWidth(1920);
  render();
  check('desktop first load renders the dock footer', container.querySelector('.dock-container') !== null);
  check('desktop first load has no mobile Apps button', container.querySelector('[aria-label="Apps — open the panel picker"]') === null);

  // 2. Cross down (desktop → mobile): the #300 direction (fewer hooks).
  // Pre-fix this throw "Rendered fewer hooks than expected".
  let threwDown: unknown = null;
  try {
    await resize(700);
  } catch (e) {
    threwDown = e;
  }
  check('crossing down to mobile does not throw', threwDown === null, threwDown ? String(threwDown) : '');
  check('mobile renders the Apps button', container.querySelector('[aria-label="Apps — open the panel picker"]') !== null);
  check('mobile has no dock footer', container.querySelector('.dock-container') === null);

  // 3. Cross back up (mobile → desktop): the #310 direction (more hooks).
  // Pre-fix this threw "Rendered more hooks than during the previous render".
  let threwUp: unknown = null;
  try {
    await resize(1920);
  } catch (e) {
    threwUp = e;
  }
  check('crossing back up to desktop does not throw', threwUp === null, threwUp ? String(threwUp) : '');
  check('desktop again renders the dock footer', container.querySelector('.dock-container') !== null);

  // 4. Flap twice more — a settling viewport must never crash the app.
  let threwFlap: unknown = null;
  try {
    await resize(700);
    await resize(1920);
    await resize(700);
    await resize(1920);
  } catch (e) {
    threwFlap = e;
  }
  check('repeated crossings do not throw', threwFlap === null, threwFlap ? String(threwFlap) : '');
  check('final state is the desktop dock', container.querySelector('.dock-container') !== null);

  await act(async () => {
    root.unmount();
  });
  if (failures > 0) {
    console.error(`os_dock_hook_order_test: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('os_dock_hook_order_test: all checks passed');
}

main().catch((e) => {
  console.error('os_dock_hook_order_test crashed:', e);
  process.exit(1);
});
