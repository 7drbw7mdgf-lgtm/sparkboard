import { useEffect, useState } from 'react';
import { View } from './types';

/** Same compact rule as the Sparkboard phone editor. */
const COMPACT_QUERY = '(max-width: 650px), (max-height: 500px) and (pointer: coarse)';

const WORKSPACE_HREF = '/?workspace=1';

/**
 * Sparkboard's board accent is #4262ff on #fafaf8. Benchline had been mixing that blue
 * with a coral brand and pale grey type. These overrides keep status colours (green,
 * amber, red) and point every interactive accent at the same blue.
 */
const themeCss = `
html:not(.dark) body{background:#fafaf8;color:#292c31}
html:not(.dark) .text-gray-400{color:#5c6570!important}
html:not(.dark) .text-gray-500{color:#3f4650!important}
html:not(.dark) .text-gray-600{color:#292c31!important}
.bg-\\[\\#ef754e\\],.hover\\:bg-\\[\\#ef754e\\]:hover,.bg-\\[\\#d85f3b\\],.hover\\:bg-\\[\\#d85f3b\\]:hover,.bg-\\[\\#e97653\\],.bg-blue-500,.bg-blue-600,.bg-blue-700,.hover\\:bg-blue-600:hover,.hover\\:bg-blue-700:hover{background-color:#4262ff!important}
.bg-\\[\\#fdf2ee\\],.hover\\:bg-\\[\\#fbe4db\\]:hover,.hover\\:bg-\\[\\#fdf2ee\\]:hover{background-color:#e8edff!important}
.text-\\[\\#ef754e\\],.hover\\:text-\\[\\#ef754e\\]:hover,.text-blue-500,.text-blue-600,.text-blue-700,.hover\\:text-blue-600:hover{color:#4262ff!important}
.border-\\[\\#ef754e\\],.hover\\:border-\\[\\#ef754e\\]:hover,.focus\\:border-\\[\\#ef754e\\]:focus,.border-blue-500,.border-blue-600{border-color:#4262ff!important}
.focus\\:ring-\\[\\#ef754e\\]:focus,.focus\\:ring-blue-500:focus,.ring-blue-500{--tw-ring-color:#4262ff!important}
#feedback-trigger-btn{display:none!important}
#benchline-sparkboard{position:static!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;z-index:auto!important;display:inline-flex;align-items:center;width:auto!important;height:auto!important;min-height:32px;margin-right:12px;padding:0 2px!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#4262ff!important;font:750 13px/1 'DM Sans',system-ui,sans-serif!important;text-decoration:none;white-space:nowrap}
#benchline-sparkboard:hover{color:#2f4fe0!important}
`;

const phoneCss = `
body.benchline-phone .benchline-sidebar{display:none!important}
body.benchline-phone header{height:48px!important;padding:0 12px!important}
body.benchline-phone header .h-5.w-px{display:none!important}
body.benchline-phone header .text-xl{font-size:16px!important}
body.benchline-phone header .relative:has(#global-search-bar),
body.benchline-phone header [title="User Profile"]{display:none!important}
body.benchline-phone main{padding-top:46px}
body.benchline-phone .w-\\[480px\\]{width:100%!important;max-width:100%!important;left:0!important}
body.benchline-phone .min-w-\\[300px\\]{min-width:168px!important}
body.benchline-phone .overflow-x-auto.overflow-y-hidden{scroll-snap-type:x mandatory;padding-left:12px!important;padding-right:28px!important}
body.benchline-phone .min-w-\\[1080px\\]{min-width:max-content!important}
body.benchline-phone .w-80{scroll-snap-align:start}
body.benchline-phone .flex-shrink-0.select-none.h-full[style*="width"]{width:min(168px,46vw)!important}
body.benchline-phone .no-x-scrollbar.overflow-x-auto.border-t{display:none!important}
body.benchline-phone .fixed.inset-0{padding:8px!important}
body.benchline-phone .fixed.inset-0>div{max-width:100%!important;width:100%!important;max-height:100%!important;overflow:auto}
#benchline-phone-chrome{position:fixed;top:48px;left:0;right:0;z-index:35;background:#fff;border-bottom:1px solid #e6e6e2;color:#292c31}
#benchline-phone-chrome .bpc-row{display:flex;align-items:stretch;height:46px;gap:2px;padding:0 6px 0 2px}
#benchline-phone-chrome .bpc-pivot{display:flex;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
#benchline-phone-chrome .bpc-pivot button{flex:0 0 auto;border:0;border-bottom:2px solid transparent;background:transparent;color:#5c6570;font:650 13px/1 'DM Sans',system-ui,sans-serif;padding:0 8px;touch-action:manipulation}
#benchline-phone-chrome .bpc-pivot button[aria-pressed="true"]{color:#4262ff;border-bottom-color:#4262ff}
#benchline-phone-chrome .bpc-new,#benchline-phone-chrome .bpc-menu-btn{flex:0 0 auto;border:0;background:transparent;color:#4262ff;font:750 14px/1 'DM Sans',system-ui,sans-serif;padding:0 10px;touch-action:manipulation}
#benchline-phone-chrome .bpc-menu{position:absolute;top:46px;right:8px;min-width:180px;background:#fff;border:1px solid #e6e6e2;border-radius:10px;box-shadow:0 8px 24px #18274b1f;padding:6px}
#benchline-phone-chrome .bpc-menu button{display:flex;width:100%;min-height:44px;align-items:center;padding:0 12px;border:0;border-radius:8px;background:transparent;color:#292c31;font:600 15px/1 'DM Sans',system-ui,sans-serif;text-align:left}
#benchline-phone-chrome .bpc-menu button:active{background:#f0efeb}
#benchline-phone-chrome button:focus-visible{outline:2px solid #4262ff;outline-offset:2px}
`;

const VIEWS: { id: View; label: string }[] = [
  { id: View.HOME, label: 'Home' },
  { id: View.TASKS, label: 'Tasks' },
  { id: View.CALENDAR, label: 'Calendar' },
  { id: View.KANBAN, label: 'Kanban' },
  { id: View.GANTT, label: 'Gantt' },
];

interface HostedMobileShellProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onAddTask: () => void;
  onSettings: () => void;
  onHelp: () => void;
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
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('benchline-phone', compact);
    if (!compact) setMenu(false);
    return () => document.body.classList.remove('benchline-phone');
  }, [compact]);

  useEffect(() => {
    const link = document.getElementById('benchline-sparkboard');
    const header = document.querySelector('header');
    if (!link) return;
    link.setAttribute('href', WORKSPACE_HREF);
    if (header && link.parentElement !== header) header.prepend(link);
  }, [compact]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (event: Event) => {
      const chrome = document.getElementById('benchline-phone-chrome');
      if (chrome && event.target instanceof Node && chrome.contains(event.target)) return;
      setMenu(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  return (
    <>
      <style>{themeCss + (compact ? phoneCss : '')}</style>
      {compact ? (
        <div id="benchline-phone-chrome">
          <div className="bpc-row">
            <nav className="bpc-pivot" aria-label="Planner views">
              {VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  aria-pressed={currentView === view.id}
                  onClick={() => {
                    setMenu(false);
                    onViewChange(view.id);
                  }}
                >
                  {view.label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              className="bpc-new"
              onClick={() => {
                setMenu(false);
                onAddTask();
              }}
            >
              New
            </button>
            <button
              type="button"
              className="bpc-menu-btn"
              aria-label="Menu"
              aria-expanded={menu}
              onClick={() => setMenu((open) => !open)}
            >
              ···
            </button>
          </div>
          {menu ? (
            <div className="bpc-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onSettings();
                }}
              >
                Settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onHelp();
                }}
              >
                Help
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
