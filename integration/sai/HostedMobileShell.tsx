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
.gantt-timeline{overflow:auto!important;min-width:0;min-height:0;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;overscroll-behavior:contain}
.gantt-task-list{touch-action:none}
.animate-slide-in-right{background:rgba(250,250,248,.72)!important;backdrop-filter:blur(28px) saturate(1.4);-webkit-backdrop-filter:blur(28px) saturate(1.4);border-radius:32px 0 0 32px!important;border-left:1px solid rgba(255,255,255,.7)!important;box-shadow:-16px 0 36px rgba(24,39,75,.14)}
.dark .animate-slide-in-right{background:rgba(28,32,36,.78)!important;border-left-color:rgba(255,255,255,.14)!important}
@media (max-width:650px){.animate-slide-in-right{border-radius:0!important}}
.benchline-group,.animate-slide-in-right button.rounded-full{border-radius:999px!important}
.animate-slide-in-right .rounded-lg,.animate-slide-in-right .rounded-md,.animate-slide-in-right .rounded-xl{border-radius:999px!important}
.animate-slide-in-right textarea{border-radius:18px!important}
.animate-slide-in-right img{border-radius:999px!important}
.benchline-edit-group{margin:0 0 8px;border:0;background:transparent;border-radius:999px}
.benchline-edit-group>summary{display:flex;align-items:center;gap:8px;min-height:36px;padding:0 14px;list-style:none;cursor:pointer;color:#292c31;font:750 13px/1 'DM Sans',system-ui,sans-serif;border-radius:999px;background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.9)}
.benchline-edit-group>summary::-webkit-details-marker,.benchline-edit-group>summary::marker{display:none;content:''}
.benchline-edit-group>summary::before{content:'';width:8px;height:8px;border-radius:999px;background:#4262ff;flex:none}
.benchline-edit-group>summary::after{content:'';margin-left:auto;width:7px;height:7px;border-right:1.5px solid #3f4650;border-bottom:1.5px solid #3f4650;transform:translateY(-2px) rotate(45deg)}
.benchline-edit-group[open]{border-radius:22px;background:rgba(255,255,255,.45);border:1px solid rgba(255,255,255,.75)}
.benchline-edit-group[open]>summary{background:transparent;border-color:transparent}
.benchline-edit-group[open]>summary::after{transform:translateY(2px) rotate(225deg)}
.benchline-edit-group>summary+*{padding:2px 8px 10px}
/* Planner views: prioritise legibility over decorative density. */
.benchline-kanban .benchline-kanban-column{width:clamp(252px,calc((100vw - 280px)/4),345px);height:100%;min-height:0}
.benchline-kanban-columns{width:max-content;min-width:100%}
.benchline-kanban-column>div:first-child{flex:none;background:#fff}
.benchline-kanban-column>div:nth-child(2){overscroll-behavior:contain}
.benchline-kanban-card{background:#fff!important;border-color:#e3e7ef!important;box-shadow:0 2px 9px #1e304012!important}
.dark .benchline-kanban-card{background:#252930!important;border-color:#384052!important}
.benchline-kanban-card:hover{border-color:#a9b8e4!important;box-shadow:0 5px 18px #20354d15!important}
.benchline-kanban-move{flex-shrink:0;border:0;background:transparent}
.benchline-kanban-bottom-add{display:none!important}
.benchline-kanban-hint{display:none}
.benchline-kanban-filters{position:relative;z-index:30}
.benchline-kanban-filters>summary{display:flex;align-items:center;justify-content:center;min-height:36px;padding:0 15px;list-style:none;cursor:pointer;border:1px solid #dfe5ef;border-radius:9px;background:#f8f9fb;color:#506079;font:600 12px/1.2 'DM Sans',system-ui,sans-serif}
.benchline-kanban-filters>summary::after{content:'⌄';margin-left:8px}
.benchline-kanban-filters>summary::-webkit-details-marker{display:none}
.benchline-kanban-filters[open]>summary{border-color:#4262ff;color:#4262ff}
.benchline-kanban-filter-fields{position:absolute;z-index:50;top:calc(100% + 8px);right:0;width:min(250px,85vw);display:grid;gap:10px;border:1px solid #e0e5ee;border-radius:12px;background:#fff;padding:14px;box-shadow:0 12px 30px #17294a26}
.dark .benchline-kanban-filter-fields{background:#242a35;border-color:#465167}
.benchline-kanban-filter-fields select{width:100%;min-height:42px}
.benchline-gantt{--timeline-accent:#4262ff}
.benchline-gantt-toggle,.benchline-gantt-fit{display:inline-flex;align-items:center;justify-content:center;min-height:34px;border:1px solid #dfe5ef;border-radius:9px;padding:0 11px;background:#fff;color:#3d506b;font:650 12px/1 'DM Sans',system-ui,sans-serif;white-space:nowrap}
.benchline-gantt-toggle:hover,.benchline-gantt-fit:hover{border-color:#8ba0ee;background:#f3f6ff}
.benchline-gantt-toggle[aria-pressed=true]{background:#edf1ff;border-color:#9eace7;color:#2b4ad0}
.benchline-gantt .gantt-timeline{background:#fff!important;scrollbar-width:thin}
.benchline-gantt .gantt-task-list{background:#fff}
@media(max-width:800px){
  .benchline-kanban .benchline-kanban-column{width:280px}
  .benchline-gantt-actions{gap:5px!important}
}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){
  .benchline-kanban>div:first-child{padding:10px 12px!important}
  .benchline-kanban>div:first-child>div{gap:8px!important}
  .benchline-kanban>div:first-child h2{font-size:20px}
  .benchline-kanban .benchline-kanban-hint{display:block;flex:none;margin:6px 14px;color:#6b7787;font:500 11px/1.5 'DM Sans',system-ui,sans-serif}
  .benchline-kanban-track{padding:8px 12px 16px!important;scroll-snap-type:x mandatory;scroll-padding-inline:12px;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y}
  .benchline-kanban-columns{gap:12px!important;min-width:0!important}
  .benchline-kanban .benchline-kanban-column{width:calc(100vw - 28px)!important;max-width:none;scroll-snap-align:start;scroll-snap-stop:always}
  .benchline-kanban .benchline-kanban-column>div:nth-child(2){min-height:0}
  .benchline-kanban .benchline-kanban-move button{min-height:40px;min-width:40px}
  .benchline-kanban-filters>summary{min-height:40px}
  .benchline-kanban .benchline-kanban-filter-fields{left:auto;right:0}
  .benchline-gantt{min-height:0}
  .benchline-gantt>div.flex-1>div:first-child{height:auto!important;min-height:60px;flex-wrap:wrap;gap:8px;padding:8px!important;align-content:center}
  .benchline-gantt>div.flex-1>div:first-child>div:first-child{gap:5px!important}
  .benchline-gantt-actions{width:100%;flex-wrap:wrap;gap:5px!important}
  .benchline-gantt-actions>div{gap:5px!important}
  .benchline-gantt-actions>div>div:first-child{margin-right:2px}
  .benchline-gantt-actions>div input[type=range],.benchline-gantt-actions>div>.h-5.w-px{display:none}
  .benchline-gantt-actions button{min-height:35px;min-width:37px}
  .benchline-gantt .gantt-timeline{min-height:0!important;touch-action:pan-x pan-y;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
  .benchline-gantt .gantt-x-scroll{display:none!important}
  .benchline-gantt .gantt-task-list{touch-action:pan-y}
}
`;

const phoneCss = `
body.benchline-phone .benchline-sidebar{display:none!important}
body.benchline-phone header{height:48px!important;padding:0 10px!important;gap:6px!important}
body.benchline-phone header>div{gap:5px!important}
body.benchline-phone #benchline-sparkboard{max-width:86px;margin-right:0!important;font-size:11px!important}
body.benchline-phone header>div>span[aria-label="Benchline"]{font-size:15px!important}
body.benchline-phone header details summary{min-height:34px;padding:0 8px;font-size:12px}
body.benchline-phone header .h-5.w-px{display:none!important}
body.benchline-phone header .text-xl{font-size:16px!important}
body.benchline-phone header .relative:has(#global-search-bar):not(.benchline-search-open),
body.benchline-phone header [title="User Profile"]{display:none!important}
body.benchline-phone header .benchline-search-open{display:block!important;position:fixed!important;left:10px;right:10px;top:52px;z-index:85;padding:8px;border:1px solid #d9e0ed;border-radius:12px;background:white;box-shadow:0 8px 25px #16254a26}
body.benchline-phone header .benchline-search-open input{width:100%!important}
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
body.benchline-phone .gantt-x-scroll{display:none!important}
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
  { id: View.GANTT, label: 'Timeline' /* Gantt */ },
  { id: View.CALENDAR, label: 'Calendar' },
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
                  onViewChange(View.KANBAN);
                }}
              >
                Kanban board
              </button>
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
