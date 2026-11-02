import { useEffect, useState, type ReactNode } from 'react';
import { View } from './types';

/** Same compact rule as the Sparkboard phone editor. */
const COMPACT_QUERY = '(max-width: 650px), (max-height: 500px) and (pointer: coarse)';

const phoneCss = `
body.benchline-phone .benchline-sidebar{display:none!important}
body.benchline-phone{overflow:hidden}
body.benchline-phone header{height:52px!important;padding:0 112px 0 12px!important;gap:8px}
body.benchline-phone header .h-5.w-px{display:none!important}
body.benchline-phone header .text-xl{font-size:17px!important}
body.benchline-phone header .relative:has(#global-search-bar),
body.benchline-phone header [title="User Profile"]{display:none!important}
body.benchline-phone #feedback-trigger-btn{display:none!important}
body.benchline-phone main{padding-bottom:calc(88px + env(safe-area-inset-bottom))}
body.benchline-phone .w-\\[480px\\]{width:100%!important;max-width:100%!important;left:0!important}
body.benchline-phone .min-w-\\[300px\\]{min-width:168px!important}
body.benchline-phone .overflow-x-auto.overflow-y-hidden{scroll-snap-type:x mandatory;padding-left:12px!important;padding-right:28px!important}
body.benchline-phone .min-w-\\[1080px\\]{min-width:max-content!important}
body.benchline-phone .w-80{scroll-snap-align:start}
body.benchline-phone .flex-shrink-0.select-none.h-full[style*="width"]{width:min(168px,46vw)!important}
body.benchline-phone .no-x-scrollbar.overflow-x-auto.border-t{display:none!important}
body.benchline-phone .fixed.inset-0{padding:8px!important}
body.benchline-phone .fixed.inset-0>div{max-width:100%!important;width:100%!important;max-height:100%!important;overflow:auto}
#benchline-sparkboard{position:fixed;bottom:15px;right:15px;z-index:60}
body.benchline-phone #benchline-sparkboard{top:calc(8px + env(safe-area-inset-top))!important;right:10px!important;bottom:auto!important;left:auto!important;width:auto!important;height:36px!important;z-index:32!important;display:inline-flex;align-items:center;min-height:0;padding:0 12px;border-radius:999px;background:#243f30;color:#fff;font:750 12px/1 'DM Sans',system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 14px #18274b22}
#benchline-mobile-dock{position:fixed;left:0;right:0;bottom:calc(8px + env(safe-area-inset-bottom));z-index:40;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}
#benchline-mobile-dock .bmd-circles,#benchline-mobile-dock .bmd-fan{pointer-events:auto}
#benchline-mobile-dock .bmd-circles{display:flex;align-items:flex-end;justify-content:center;gap:10px}
#benchline-mobile-dock .bmd-circle{width:40px;height:40px;padding:0;border:1px solid #e4e7ee;border-radius:50%;background:#fff;color:#1f2430;box-shadow:0 6px 16px #18274b22;display:grid;place-items:center;touch-action:manipulation}
#benchline-mobile-dock .bmd-circle.bmd-main{width:56px;height:56px}
#benchline-mobile-dock .bmd-circle[aria-pressed="true"],#benchline-mobile-dock .bmd-circle[aria-expanded="true"]{background:#ef754e;color:#fff;border-color:#ef754e}
#benchline-mobile-dock .bmd-circle svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#benchline-mobile-dock .bmd-circle.bmd-main svg{width:24px;height:24px}
#benchline-mobile-dock .bmd-fan{display:flex;flex-wrap:nowrap;justify-content:safe center;gap:6px;max-width:calc(100vw - 16px);overflow-x:auto;scrollbar-width:none;padding:0 4px}
#benchline-mobile-dock .bmd-fan[hidden]{display:none}
#benchline-mobile-dock .bmd-fan .bmd-circle{flex:0 0 40px}
#benchline-mobile-dock button:focus-visible{outline:2px solid #ef754e;outline-offset:2px}
`;

type Fan = 'views' | 'more' | null;

interface HostedMobileShellProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onAddTask: () => void;
  onSettings: () => void;
  onHelp: () => void;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function HostedMobileShell({
  currentView,
  onViewChange,
  onAddTask,
  onSettings,
  onHelp,
}: HostedMobileShellProps) {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches,
  );
  const [fan, setFan] = useState<Fan>(null);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('benchline-phone', compact);
    if (!compact) setFan(null);
    return () => document.body.classList.remove('benchline-phone');
  }, [compact]);

  useEffect(() => {
    if (!fan) return undefined;
    const close = (event: Event) => {
      const dock = document.getElementById('benchline-mobile-dock');
      if (dock && event.target instanceof Node && dock.contains(event.target)) return;
      setFan(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFan(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [fan]);

  if (!compact) return null;

  const open = (view: View) => {
    setFan(null);
    onViewChange(view);
  };
  const viewActive = [View.KANBAN, View.GANTT, View.CALENDAR].includes(currentView);

  return (
    <>
      <style>{phoneCss}</style>
      <nav id="benchline-mobile-dock" aria-label="Benchline">
        <div className="bmd-fan" hidden={fan === null}>
          {fan === 'views' ? (
            <>
              <button
                type="button"
                className="bmd-circle"
                aria-label="Kanban"
                aria-pressed={currentView === View.KANBAN}
                onClick={() => open(View.KANBAN)}
              >
                <Icon>
                  <rect x="3.5" y="4.5" width="5" height="15" rx="1.5" />
                  <rect x="10.5" y="4.5" width="5" height="10" rx="1.5" />
                  <rect x="17.5" y="4.5" width="5" height="7" rx="1.5" />
                </Icon>
              </button>
              <button
                type="button"
                className="bmd-circle"
                aria-label="Gantt"
                aria-pressed={currentView === View.GANTT}
                onClick={() => open(View.GANTT)}
              >
                <Icon>
                  <path d="M4 7h16M4 12h16M4 17h16M7 5v4M13 10v4M17 15v4" />
                </Icon>
              </button>
              <button
                type="button"
                className="bmd-circle"
                aria-label="Calendar"
                aria-pressed={currentView === View.CALENDAR}
                onClick={() => open(View.CALENDAR)}
              >
                <Icon>
                  <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
                  <path d="M8 3.5v4M16 3.5v4M4 10h16" />
                </Icon>
              </button>
            </>
          ) : null}
          {fan === 'more' ? (
            <>
              <button
                type="button"
                className="bmd-circle"
                aria-label="Settings"
                onClick={() => {
                  setFan(null);
                  onSettings();
                }}
              >
                <Icon>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
                </Icon>
              </button>
              <button
                type="button"
                className="bmd-circle"
                aria-label="Help"
                onClick={() => {
                  setFan(null);
                  onHelp();
                }}
              >
                <Icon>
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.4-1.1.9-1.1 1.8" />
                  <path d="M12 17h.01" />
                </Icon>
              </button>
            </>
          ) : null}
        </div>
        <div className="bmd-circles">
          <button
            type="button"
            className="bmd-circle bmd-main"
            aria-label="Home"
            aria-pressed={currentView === View.HOME}
            onClick={() => open(View.HOME)}
          >
            <Icon>
              <path d="M4 11.2 12 4l8 7.2" />
              <path d="M6 10.5V19h12v-8.5" />
            </Icon>
          </button>
          <button
            type="button"
            className="bmd-circle bmd-main"
            aria-label="Tasks"
            aria-pressed={currentView === View.TASKS}
            onClick={() => open(View.TASKS)}
          >
            <Icon>
              <rect x="5" y="4" width="14" height="16" rx="3" />
              <path d="m8 9 1.4 1.4L12.2 7.6M14 9.2h2M8 14l1.4 1.4 2.8-2.8M14 14.2h2" />
            </Icon>
          </button>
          <button
            type="button"
            className="bmd-circle bmd-main"
            aria-label="New task"
            onClick={() => {
              setFan(null);
              onAddTask();
            }}
          >
            <Icon>
              <rect x="5" y="5" width="14" height="14" rx="3" />
              <path d="M12 8.5v7M8.5 12h7" />
            </Icon>
          </button>
          <button
            type="button"
            className="bmd-circle"
            aria-label="Views"
            aria-expanded={fan === 'views'}
            aria-pressed={viewActive}
            onClick={() => setFan((current) => (current === 'views' ? null : 'views'))}
          >
            <Icon>
              <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
              <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
              <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
              <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
            </Icon>
          </button>
          <button
            type="button"
            className="bmd-circle"
            aria-label="More"
            aria-expanded={fan === 'more'}
            onClick={() => setFan((current) => (current === 'more' ? null : 'more'))}
          >
            <Icon>
              <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
            </Icon>
          </button>
        </div>
      </nav>
    </>
  );
}
