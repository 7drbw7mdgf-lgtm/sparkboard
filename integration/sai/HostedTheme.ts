/** Shared Sparkboard-aligned palette for every hosted Benchline view. */
export const hostedThemeCss = `
:root{
--benchline-brand:#4262ff;--benchline-brand-hover:#2f4fe0;--benchline-brand-soft:#e8edff;--benchline-brand-ink:#304bdc;
--benchline-page:#ffffff;--benchline-surface:#fff;--benchline-subtle:#f5f6f8;--benchline-hover:#f0efeb;
--benchline-border:#e6e6e2;--benchline-ink:#292c31;--benchline-secondary:#5c6570;--benchline-radius:9px
}
html.dark,body.dark{
--benchline-brand:#8ea3ff;--benchline-brand-hover:#afbdff;--benchline-brand-soft:#293655;--benchline-brand-ink:#cbd5ff;
--benchline-page:#1c2027;--benchline-surface:#252b35;--benchline-subtle:#2b3340;--benchline-hover:#344050;
--benchline-border:#414957;--benchline-ink:#edf0f7;--benchline-secondary:#b2bdcf
}
/* Sparkboard typography throughout the hosted planner */
#root{font-family:'DM Sans',sans-serif;color:var(--benchline-ink)}
#root h1,#root h2,#root h3,#root h4,#root .benchline-app-header [aria-label="Benchline"]{font-family:Manrope,'DM Sans',sans-serif;letter-spacing:-.02em}
#root :is(button,input,textarea,select,summary){font-family:'DM Sans',sans-serif}
#root :is(button,input,textarea,select,[role="button"],[tabindex]):focus-visible{outline:2px solid var(--benchline-brand);outline-offset:2px}
#root input[type=checkbox],#root input[type=radio],#root input[type=range]{accent-color:var(--benchline-brand)}
/* Harmonise neutral Tailwind backgrounds, borders and text, without hiding semantic colours. */
html:not(.dark) #root>div.h-screen{background:var(--benchline-page)!important;color:var(--benchline-ink)}
html:not(.dark) #root .benchline-app-header,html:not(.dark) #root .benchline-sidebar{background:var(--benchline-surface)!important;border-color:var(--benchline-border)!important}
html:not(.dark) #root .bg-gray-100,html:not(.dark) #root .bg-gray-50{background-color:var(--benchline-subtle)}
html:not(.dark) #root .bg-white{background-color:var(--benchline-surface)}
html:not(.dark) #root .border-gray-100,html:not(.dark) #root .border-gray-200,html:not(.dark) #root .border-gray-300{border-color:var(--benchline-border)!important}
html:not(.dark) #root .text-gray-700,html:not(.dark) #root .text-gray-800,html:not(.dark) #root .text-gray-900{color:var(--benchline-ink)}
html:not(.dark) #root .text-gray-400,html:not(.dark) #root .text-gray-500,html:not(.dark) #root .text-gray-600{color:var(--benchline-secondary)}
/* Replace residual legacy orange buttons and accent labels with Sparkboard blue. */
#root [class*="bg-[#ef754e]"],#root [class*="bg-[#d85f3b]"],#root [class*="bg-[#e97653]"]{background-color:#4262ff!important}
#root [class*="hover:bg-[#ef754e]"]:hover,#root [class*="hover:bg-[#d85f3b]"]:hover{background-color:#2f4fe0!important}
#root [class*="text-[#ef754e]"]{color:var(--benchline-brand-ink)!important}
#root [class*="border-[#ef754e]"]{border-color:var(--benchline-brand)!important}
#root [class*="ring-[#ef754e]"]{--tw-ring-color:var(--benchline-brand)!important}
/* All major planner areas use the same neutral cards and separation rules. */
#root .benchline-overview section,#root .benchline-kanban-card,#root .benchline-kanban-column,
#root .benchline-calendar-month-panel,#root .benchline-calendar-toolbar,#root .benchline-gantt-date-row,
#root .benchline-task-row-actions button,#root .benchline-kanban-edit-action{border-color:var(--benchline-border)}
html:not(.dark) #root .benchline-overview section,html:not(.dark) #root .benchline-kanban-card,
html:not(.dark) #root .benchline-kanban-column,html:not(.dark) #root .benchline-calendar-month-panel{background:var(--benchline-surface)!important}
#root .benchline-overview section,#root .benchline-kanban-card,#root .benchline-kanban-column,#root .benchline-calendar-month-panel{border-radius:11px}
#root .benchline-gantt-date-row:first-child,#root .benchline-calendar-timegrid>div:first-child,
#root .benchline-calendar-month-view>div:first-child,#root .benchline-calendar-day-heading{background-color:var(--benchline-brand-soft)}
#root .benchline-gantt-scale-select,#root #benchline-calendar-view{background:var(--benchline-brand-soft);border-color:var(--benchline-border);color:var(--benchline-brand-ink)}
#root .benchline-gantt-toggle[aria-pressed=true],#root .benchline-sidebar [aria-current=page]{background:var(--benchline-brand-soft)!important;color:var(--benchline-brand-ink)!important}
/* Editors and modal controls match Sparkboard's field and corner treatment. */
#root .animate-slide-in-right{background:var(--benchline-surface)!important;color:var(--benchline-ink);border-left:1px solid var(--benchline-border)!important;border-radius:12px 0 0 12px!important;backdrop-filter:none;-webkit-backdrop-filter:none}
#root .animate-slide-in-right :is(input:not([type=checkbox]):not([type=radio]),textarea,select),
#root [role=dialog] :is(input:not([type=checkbox]):not([type=radio]),textarea,select){border-color:var(--benchline-border);color:var(--benchline-ink);border-radius:var(--benchline-radius)}
#root .animate-slide-in-right :is(input,textarea,select):focus,#root [role=dialog] :is(input,textarea,select):focus{border-color:var(--benchline-brand)}
#root .animate-slide-in-right .rounded-lg,#root .animate-slide-in-right .rounded-md,
#root .animate-slide-in-right .rounded-xl,#root .animate-slide-in-right button.rounded-full{border-radius:var(--benchline-radius)!important}
#root .benchline-edit-group,#root .benchline-edit-group>summary{border-radius:var(--benchline-radius)}
#root .benchline-edit-group>summary{color:var(--benchline-ink);border-color:var(--benchline-border);background:var(--benchline-subtle)}
/* Preserve task state and external calendar sources as distinct indicators. */
#root .benchline-calendar-dot-task{background-color:#4262ff}
#root .benchline-calendar-dot-meeting{background-color:#25a69a}
#root .benchline-calendar-month-day.is-today{background:#4262ff;color:#fff}
#root .benchline-calendar-month-day.is-today .benchline-calendar-day-dots i{background:#fff}
/* Dark mode surfaces must not inherit forced white planner backgrounds. */
.dark #root .benchline-app-header,.dark #root .benchline-sidebar,.dark #root .benchline-calendar-toolbar,
.dark #root .benchline-calendar-month-panel,.dark #root .benchline-kanban-card,.dark #root .benchline-kanban-column,
.dark #root .benchline-gantt .gantt-timeline,.dark #root .benchline-gantt .gantt-task-list{background:var(--benchline-surface)!important;color:var(--benchline-ink);border-color:var(--benchline-border)!important}
.dark #root .benchline-gantt-scale-select,.dark #root #benchline-calendar-view,
.dark #root .benchline-calendar-actions>input[type=date],.dark #root .benchline-calendar-settings,
.dark #root .benchline-calendar-sources>summary,.dark #root .benchline-task-row-actions button,
.dark #root .benchline-kanban-edit-action{background:var(--benchline-subtle)!important;color:var(--benchline-ink);border-color:var(--benchline-border)!important}
.dark #root .benchline-gantt-date-row:first-child,.dark #root .benchline-calendar-day-heading{background:var(--benchline-brand-soft)!important}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){#root .animate-slide-in-right{border-radius:0!important}}

/* White-first layout matching Sparkboard: white workspace and chrome, subtle borders. */
html:not(.dark) body,html:not(.dark) #root,html:not(.dark) #root main,
html:not(.dark) #root .benchline-overview,
html:not(.dark) #root .benchline-calendar,
html:not(.dark) #root .benchline-gantt,
html:not(.dark) #root .benchline-kanban,
html:not(.dark) #root .benchline-gantt .gantt-timeline,
html:not(.dark) #root .benchline-gantt .gantt-task-list,
html:not(.dark) #root .benchline-calendar-overview{
  background:#fff!important;
  color:#292c31;
}
html:not(.dark) #root .benchline-gantt-date-row,
html:not(.dark) #root .benchline-calendar-toolbar,
html:not(.dark) #root .benchline-gantt-toolbar,
html:not(.dark) #root .benchline-calendar-timegrid,
html:not(.dark) #root .benchline-calendar-month-view{
  background:#fff!important;
}
html:not(.dark) #root .benchline-gantt-date-row:first-child,
html:not(.dark) #root .benchline-calendar-day-heading{
  background:#f8f9fc!important;
}
html:not(.dark) #root .benchline-gantt-scale-select,
html:not(.dark) #root #benchline-calendar-view{
  background:#fff!important;
  color:#292c31;
  border-color:#e6e6e2;
}
html:not(.dark) #root .benchline-app-header,
html:not(.dark) #root .benchline-sidebar,
html:not(.dark) #root .benchline-calendar-toolbar,
html:not(.dark) #root .benchline-gantt-toolbar{
  box-shadow:none;
  border-color:#e6e6e2!important;
}
#root .benchline-gantt-task-wrapper{pointer-events:auto;touch-action:none}
#root .benchline-gantt-task-bar{
  touch-action:none!important;
  cursor:grab;
  user-select:none;
  -webkit-user-select:none;
}
#root .benchline-gantt-task-bar:active{cursor:grabbing}
#root .benchline-gantt-resize-handle{touch-action:none!important;cursor:ew-resize}
#root .benchline-gantt-toolbar{gap:10px;padding:0 12px!important;min-height:52px;height:52px!important}
#root .benchline-gantt-toolbar-title{color:var(--benchline-ink);font-weight:700;white-space:nowrap}
#root .benchline-gantt-more,#root .benchline-calendar-more{position:relative;flex:none}
#root .benchline-gantt-more>summary,#root .benchline-calendar-more>summary{
  display:flex;align-items:center;justify-content:center;min-height:36px;min-width:38px;
  border:1px solid var(--benchline-border);border-radius:8px;
  background:var(--benchline-surface);color:var(--benchline-secondary);
  cursor:pointer;list-style:none;padding:0 9px;font-weight:700;
}
#root .benchline-gantt-more>summary::-webkit-details-marker,
#root .benchline-calendar-more>summary::-webkit-details-marker{display:none}
#root .benchline-gantt-more[open]>summary,#root .benchline-calendar-more[open]>summary{
  color:var(--benchline-brand-ink);border-color:var(--benchline-brand);background:var(--benchline-brand-soft);
}
#root .benchline-gantt-more-panel,#root .benchline-calendar-more-panel{
  position:absolute;z-index:90;top:calc(100% + 8px);right:0;
  display:flex;flex-direction:column;align-items:stretch;gap:9px;
  min-width:220px;padding:12px;background:var(--benchline-surface);
  border:1px solid var(--benchline-border);border-radius:11px;
  box-shadow:0 14px 32px #17294a26;
}
#root .benchline-gantt-more-panel>button,#root .benchline-calendar-more-panel>button{
  min-height:38px;padding:8px 10px;text-align:left;border:1px solid var(--benchline-border);
  border-radius:8px;color:var(--benchline-ink);background:var(--benchline-surface);
}
#root .benchline-calendar-more-panel>label{
  display:grid;gap:5px;font-size:12px;color:var(--benchline-secondary);font-weight:650;
}
#root .benchline-calendar-more-panel input[type=date]{
  min-height:38px;padding:7px;border:1px solid var(--benchline-border);
  border-radius:8px;background:var(--benchline-surface);color:var(--benchline-ink);
}
#root .benchline-calendar-more-panel .benchline-calendar-sources>summary{
  width:100%;min-height:38px;padding:8px 10px;background:var(--benchline-subtle);
  border:1px solid var(--benchline-border);border-radius:8px;
}
#root .benchline-calendar-more-panel .benchline-calendar-source-popover{
  position:static;box-shadow:none;padding:8px;margin-top:5px;
}
#root .benchline-gantt-scale-controls{gap:5px}
#root .benchline-gantt-scale-label,#root .benchline-gantt-zoom span{display:none}
#root .benchline-gantt-scale-select{min-width:98px;min-height:36px}
#root .benchline-gantt-zoom{margin-left:0}
#root .benchline-gantt-actions{gap:7px!important}
#root .benchline-calendar-toolbar{min-height:52px;padding:8px 12px}
#root .benchline-calendar-actions{gap:6px}
#root .benchline-calendar-actions>label{display:none}
#root .benchline-calendar-actions>select{min-width:104px}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){
  #root .benchline-gantt-toolbar{padding:6px 9px!important;min-height:52px}
  #root .benchline-gantt-toolbar-title{display:none}
  #root .benchline-gantt-actions{width:100%!important;min-width:0!important;justify-content:flex-end}
  #root .benchline-gantt-scale-controls{flex:1;min-width:0}
  #root .benchline-gantt-scale-select{min-width:0;width:100%}
  #root .benchline-calendar-toolbar{flex-wrap:wrap;gap:7px}
  #root .benchline-calendar-title-row{flex:1;min-width:0}
  #root .benchline-calendar-actions{width:auto!important;min-width:0;flex:none;overflow:visible}
  #root .benchline-calendar-more-panel{right:0;min-width:205px}
}
.dark #root .benchline-gantt-more-panel,.dark #root .benchline-calendar-more-panel{background:var(--benchline-surface);border-color:var(--benchline-border)}

/* Unified icon geometry and control alignment across all Benchline views. */
#root .benchline-icon{
  display:block!important;
  width:18px;
  height:18px;
  min-width:18px;
  min-height:18px;
  flex:none;
  vertical-align:middle;
  stroke-width:1.8;
}
#root .benchline-sidebar .benchline-nav-icon{
  display:inline-flex;
  flex:0 0 20px;
  width:20px;height:20px;
  align-items:center;justify-content:center;
}
#root .benchline-sidebar button,
#root .benchline-sidebar summary{
  display:flex;
  align-items:center;
  column-gap:10px;
  min-height:42px;
  line-height:1.2;
}
#root .benchline-sidebar button>span:last-child{min-width:0}
#root .benchline-sidebar .group>summary .benchline-icon{margin-left:auto}
#root .benchline-app-header .benchline-top-actions,
#root .benchline-app-header .benchline-top-actions button,
#root .benchline-app-header>div>button[aria-label="Search project"],
#root .benchline-app-header details>summary{
  display:inline-flex;
  align-items:center;
  justify-content:center;
}
#root .benchline-app-header .benchline-top-actions button{
  box-sizing:border-box;
  height:36px;min-height:36px;min-width:36px;
  gap:6px;line-height:1.2;
}
#root .benchline-app-header .benchline-top-actions button.benchline-top-new{padding-inline:10px}
#root .benchline-app-header>div>button[aria-label="Search project"]{
  width:36px;height:36px;min-width:36px;padding:0;
}
#root .benchline-app-header details>summary{min-height:36px;gap:6px;line-height:1.2}
#root .benchline-gantt-toolbar,
#root .benchline-gantt-actions,
#root .benchline-gantt-scale-controls,
#root .benchline-calendar-toolbar,
#root .benchline-calendar-title-row,
#root .benchline-calendar-nav,
#root .benchline-calendar-actions{
  align-items:center;
}
#root .benchline-gantt-toolbar :is(button,select,summary),
#root .benchline-calendar-toolbar :is(button,select,summary){
  box-sizing:border-box;
  line-height:1.2;
}
#root .benchline-gantt-zoom,
#root .benchline-calendar-nav{align-self:center}
#root .benchline-gantt-zoom>button,
#root .benchline-calendar-nav>button{
  display:inline-flex;
  align-items:center;
  justify-content:center;
}
#root .benchline-gantt-more>summary,
#root .benchline-calendar-more>summary{
  flex:none;
  align-items:center;
  justify-content:center;
}
#root .benchline-task-row-actions button,
#root .benchline-kanban-edit-action{
  display:inline-flex;align-items:center;justify-content:center;
  line-height:1.2;
}
#root .benchline-overview :is(h1,h2,p){margin-block-start:0}
`;
