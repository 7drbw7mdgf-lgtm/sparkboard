/** Shared Sparkboard-aligned palette for every hosted Benchline view. */
export const hostedThemeCss = `
:root{
--benchline-brand:#4262ff;--benchline-brand-hover:#2f4fe0;--benchline-brand-soft:#e8edff;--benchline-brand-ink:#304bdc;
--benchline-page:#fafaf8;--benchline-surface:#fff;--benchline-subtle:#f5f6f8;--benchline-hover:#f0efeb;
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
`;
