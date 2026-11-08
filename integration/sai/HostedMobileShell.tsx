import { useEffect, useState } from 'react';
import { View } from './types';
import { hostedThemeCss } from './HostedTheme';
import HostedIcon from './HostedIcon';

/** Same compact rule as the Sparkboard phone editor. */
const COMPACT_QUERY = '(max-width: 650px), (max-height: 500px) and (pointer: coarse)';

const WORKSPACE_HREF = '/?workspace=1';

/**
 * Sparkboard's board accent is #4262ff on #fafaf8. Benchline had been mixing that blue
 * with a coral brand and pale grey type. These overrides keep status colours (green,
 * amber, red) and point every interactive accent at the same blue.
 */
const themeCss = `
/* Sparkboard base typography + UI materials, also used by hosted task panels. */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Manrope:wght@400;500;600;650;700;750;800&display=swap');
html:not(.dark) body,html:not(.dark) #root{font-family:'DM Sans',sans-serif!important;color:#292c31}
html:not(.dark) h1,html:not(.dark) h2,html:not(.dark) h3,html:not(.dark) .benchline-app-header [aria-label="Benchline"]{font-family:'Manrope',sans-serif}
html:not(.dark) main{background:#fafaf8}
html:not(.dark) .benchline-overview>div>div>section,html:not(.dark) .benchline-overview>div>div>div>section{border-color:#e6e6e2}
html:not(.dark) .benchline-sidebar,html:not(.dark) .benchline-app-header{border-color:#e6e6e2!important}
html:not(.dark) input:not([type=checkbox]):not([type=radio]),html:not(.dark) textarea,html:not(.dark) select{font-family:'DM Sans',sans-serif}
html:not(.dark) :is(button,input,textarea,select,[tabindex]):focus-visible{outline:2px solid #4262ff;outline-offset:2px}
html:not(.dark) input[type=checkbox],html:not(.dark) input[type=radio],html:not(.dark) input[type=range]{accent-color:#4262ff}
.benchline-top-actions{display:flex;align-items:center;gap:5px}
.benchline-top-actions button{display:inline-flex;align-items:center;justify-content:center;min-width:36px;min-height:36px;padding:0 9px;border:1px solid #e6e6e2;background:#fff;border-radius:8px;color:#3c4656;font:700 19px/1 'DM Sans',sans-serif}
.benchline-top-actions button:hover:not(:disabled){background:#f0efeb}
.benchline-top-actions button:disabled{opacity:.35;cursor:not-allowed}
.benchline-top-actions .benchline-top-new{font:700 12px/1 'DM Sans',sans-serif;background:#4262ff!important;color:white!important;border-color:#4262ff}
.benchline-top-actions .benchline-top-new:hover{background:#2f4fe0!important}
/* Task list: immediate, reversible row actions accessible to mouse, touch and keyboard. */
.benchline-task-actions-cell{width:115px;min-width:115px;white-space:nowrap}
.benchline-task-row-actions{display:flex;align-items:center;gap:5px;justify-content:flex-end}
.benchline-task-row-actions button{min-width:36px;min-height:36px;border:1px solid #e6e6e2;border-radius:8px;background:white;color:#45546c;font:700 12px/1 'DM Sans',sans-serif;padding:0 9px}
.benchline-task-row-actions button:hover{background:#e8edff;border-color:#a5b4fc;color:#304bdc}
.benchline-kanban-edit-action{min-height:35px;margin:0 0 8px;padding:0 10px;border:1px solid #dfe4ef;border-radius:8px;background:#f5f7ff;color:#3555d8;font:700 12px/1 'DM Sans',sans-serif}
.benchline-kanban-edit-action:hover{background:#e8edff;border-color:#a5b4fc}
.dark .benchline-kanban-edit-action{background:#2b344d;color:#ccd6ff;border-color:#566286}
@media(pointer:coarse){.benchline-kanban-edit-action{min-height:42px}}

.dark .benchline-task-row-actions button{background:#293344;border-color:#4b5566;color:#dee7ff}
@media(pointer:coarse){.benchline-task-row-actions button{min-width:44px;min-height:44px}}

@media(max-width:650px),(max-height:500px) and (pointer:coarse){.benchline-top-actions{display:none}}

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

/* Gantt: real time units at the top, and explicit drag grips for date editing. */
.benchline-gantt-scale-controls{display:flex;align-items:center;gap:7px;flex-shrink:0}
.benchline-gantt-scale-label{color:#506079;font:650 12px/1 'DM Sans',system-ui,sans-serif;white-space:nowrap}
.benchline-gantt-scale-select{appearance:auto;border:1px solid #aebddb;border-radius:9px;background:#f7f9ff;color:#253d65;min-height:36px;padding:0 9px;font:700 13px/1 'DM Sans',system-ui,sans-serif;min-width:112px;cursor:pointer}
.benchline-gantt-scale-select:focus-visible{outline:2px solid #4262ff;outline-offset:2px}
.benchline-gantt-zoom{display:flex;align-items:center;gap:0;margin-left:4px;border:1px solid #dfe5ef;border-radius:9px;background:#fff;overflow:hidden}
.benchline-gantt-zoom button{min-width:32px;min-height:34px;border:0;background:transparent;color:#304563;font:700 19px/1 system-ui,sans-serif;cursor:pointer}
.benchline-gantt-zoom button:hover:not(:disabled){background:#edf1ff}
.benchline-gantt-zoom button:disabled{opacity:.3;cursor:not-allowed}
.benchline-gantt-zoom span{font:650 11px/1 'DM Sans',system-ui,sans-serif;color:#64738a;padding:0 4px}
.benchline-gantt-date-row{background:#fff;box-shadow:inset 0 -1px 0 #dde3ee;user-select:none}
.benchline-gantt-date-row:first-child{background:#eef3ff}
.benchline-gantt-date-row:first-child>div{color:#354f80!important}
.benchline-gantt-date-row:last-child>div{color:#3d4b63!important}
.benchline-gantt-task-bar{touch-action:none;-webkit-user-select:none;user-select:none;outline-offset:3px}
.benchline-gantt-task-bar:focus-visible{outline:3px solid #4262ff}
.benchline-gantt-task-bar .benchline-gantt-resize-handle{touch-action:none;background:#5472d42b;opacity:.65;border-left:1px solid #5472d4;border-right:1px solid #5472d4}
.benchline-gantt-task-bar .benchline-gantt-resize-handle:hover{background:#4262ff55;opacity:1}
.benchline-gantt-task-bar .benchline-gantt-resize-left{border-radius:8px 1px 1px 8px}
.benchline-gantt-task-bar .benchline-gantt-resize-right{border-radius:1px 8px 8px 1px}
.dark .benchline-gantt-scale-select,.dark .benchline-gantt-zoom,.dark .benchline-gantt-toggle,.dark .benchline-gantt-fit{background:#2c3545;color:#e3eaff;border-color:#53617b}
.dark .benchline-gantt-date-row{background:#242b38}
.dark .benchline-gantt-date-row:first-child{background:#2e3c5e}
.dark .benchline-gantt-date-row:first-child>div,.dark .benchline-gantt-date-row:last-child>div{color:#d9e5ff!important}
@media(pointer:coarse){
  .benchline-gantt-task-bar .benchline-gantt-resize-handle{width:22px!important;opacity:.85}
  .benchline-gantt-task-bar .benchline-gantt-resize-left{left:-5px!important}
  .benchline-gantt-task-bar .benchline-gantt-resize-right{right:-5px!important}
}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){
  .benchline-gantt>div.flex-1>div:first-child{height:60px!important;min-height:60px!important;flex-wrap:nowrap!important;overflow-x:auto;overflow-y:hidden;padding:6px 8px!important;scrollbar-width:none}
  .benchline-gantt>div.flex-1>div:first-child::-webkit-scrollbar{display:none}
  .benchline-gantt>div.flex-1>div:first-child>div:first-child{display:none!important}
  .benchline-gantt-actions{width:max-content!important;min-width:max-content!important;flex:1;flex-wrap:nowrap!important;gap:6px!important}
  .benchline-gantt-scale-label{display:none}
  .benchline-gantt-scale-select{min-height:40px;min-width:105px;font-size:13px}
  .benchline-gantt-zoom button{min-height:40px;min-width:38px}
  .benchline-gantt-zoom span{display:none}
  .benchline-gantt-actions button{min-height:40px!important}
  .benchline-gantt-date-row{font-size:12px}
}

/* Same Sparkboard colour system: violet-blue actions, warm white canvases, neutral outlines. */
:root{--benchline-primary:#4262ff;--benchline-primary-hover:#304bdc;--benchline-primary-tint:#e8edff;--benchline-canvas:#fafaf8;--benchline-ink:#292c31;--benchline-border:#e6e6e2}
html:not(.dark) body{background:var(--benchline-canvas);color:var(--benchline-ink)}
html:not(.dark) .benchline-sidebar{background:#fff!important;border-color:var(--benchline-border)}
html:not(.dark) .benchline-calendar,html:not(.dark) .benchline-gantt,html:not(.dark) .benchline-kanban{background:var(--benchline-canvas)}
html:not(.dark) .benchline-calendar button:focus-visible,html:not(.dark) .benchline-calendar input:focus-visible,html:not(.dark) .benchline-calendar select:focus-visible{outline:2px solid var(--benchline-primary);outline-offset:2px}
/* The calendar has one accessible date jump and source menu in its toolbar.
   Hide its former 256px sidebar and duplicate mini-calendar. */
.benchline-calendar>div:first-child{display:none!important}
.benchline-calendar>div:nth-child(2){min-width:0}
.benchline-calendar-toolbar{display:flex;flex:none;align-items:center;justify-content:space-between;gap:12px;min-height:66px;padding:10px 16px;border-bottom:1px solid var(--benchline-border);background:#fff;color:var(--benchline-ink)}
.benchline-calendar-title-row{display:flex;align-items:center;gap:12px;min-width:0;flex:1}
.benchline-calendar-title{font:750 18px/1.25 'Manrope','DM Sans',system-ui,sans-serif;white-space:normal;color:#292c31;min-width:0}
.benchline-calendar-nav{display:flex;gap:3px;align-items:center;flex:none;border:1px solid #e5e8ef;background:#f8f9fb;padding:2px;border-radius:10px}
.benchline-calendar-nav button{display:inline-flex;align-items:center;justify-content:center;min-height:34px;min-width:34px;border:0;border-radius:8px;color:#3d4b63;cursor:pointer}
.benchline-calendar-nav button:hover{background:#e8edff;color:#304bdc}
.benchline-calendar-nav button.benchline-calendar-today{padding:0 10px;color:#4262ff;font:700 12px/1 'DM Sans',system-ui,sans-serif}
.benchline-calendar-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.benchline-calendar-actions>label{font:650 12px/1 'DM Sans',system-ui,sans-serif;color:#536078}
.benchline-calendar-actions>select,.benchline-calendar-actions>input[type=date],.benchline-calendar-settings,.benchline-calendar-sources>summary{min-height:36px;border:1px solid #dfe5ef;border-radius:9px;background:#fff;padding:6px 10px;color:#334666;font:650 12px/1.2 'DM Sans',system-ui,sans-serif}
.benchline-calendar-actions>select{min-width:105px;background:#eff2ff;color:#273faa;border-color:#c7d1ff;cursor:pointer}
.benchline-calendar-actions>input[type=date]{max-width:147px;cursor:pointer}
.benchline-calendar-actions button,.benchline-calendar-actions summary{cursor:pointer}
.benchline-calendar-settings{white-space:nowrap}
.benchline-calendar-settings:hover,.benchline-calendar-sources>summary:hover{border-color:#8296fa;background:#f5f6ff}
.benchline-calendar-sources{position:relative;z-index:50}
.benchline-calendar-sources>summary{list-style:none;display:flex;align-items:center;min-height:36px}
.benchline-calendar-sources>summary::-webkit-details-marker{display:none}
.benchline-calendar-sources>summary::after{content:'⌄';margin-left:7px;color:#4262ff}
.benchline-calendar-source-popover{position:absolute;top:calc(100% + 7px);right:0;z-index:60;display:grid;gap:6px;min-width:170px;padding:10px;border:1px solid #dfe5ef;border-radius:11px;background:#fff;box-shadow:0 12px 24px #1b2d4528}
.benchline-calendar-source-option{display:flex;gap:10px;align-items:center;min-height:36px;padding:3px 7px;border-radius:7px;color:#3b4557;font:650 12px/1.2 'DM Sans',system-ui,sans-serif;cursor:pointer}
.benchline-calendar-source-option:hover{background:#f1f3ff}
.benchline-calendar-source-option input{accent-color:#4262ff;width:16px;height:16px}
.benchline-calendar-sync-message{font-size:11px;color:#4c5c72}
.benchline-calendar-month-view>div:first-child{background:#eef2ff;border-color:#dce3ff}
.benchline-calendar-month-view>div:first-child>div{color:#3d4e72}
.benchline-calendar-month-view .bg-red-500{background:#4262ff!important}
.benchline-calendar-timegrid>div:first-child{background:#eef2ff}
.benchline-calendar-day-heading{background:#eef2ff;color:#435574}
.benchline-calendar-day-heading .text-red-500,.benchline-calendar-timegrid .bg-red-500{color:#4262ff!important}
.benchline-calendar-day-heading .bg-red-500{background:#4262ff!important;color:#fff!important}
.benchline-calendar-timed-event{border-left-color:var(--benchline-primary);transition:box-shadow .12s}
.benchline-calendar-timed-event:hover{box-shadow:0 4px 12px #4262ff29}
.benchline-calendar-week-scroll{height:100%;min-width:0;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
.benchline-calendar-week-scroll>.benchline-calendar-timegrid{min-height:0}
.benchline-calendar-overview{height:100%;overflow:auto;background:#fafaf8;padding:18px;overscroll-behavior:contain}
.benchline-calendar-overview-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;max-width:1440px;margin:auto}
.benchline-calendar-overview-quarter .benchline-calendar-overview-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.benchline-calendar-month-panel{min-width:0;border:1px solid #e0e4ec;border-radius:12px;background:#fff;padding:13px;box-shadow:0 2px 12px #2337550a}
.benchline-calendar-month-title{display:flex;gap:6px;justify-content:space-between;align-items:baseline;width:100%;min-height:32px;background:transparent;border:0;text-align:left;color:#253b65;font:750 14px/1.2 'Manrope',system-ui,sans-serif;cursor:pointer}
.benchline-calendar-month-title:hover{color:#4262ff}
.benchline-calendar-month-year{font:650 11px/1 system-ui,sans-serif;color:#6b7790}
.benchline-calendar-month-labels,.benchline-calendar-month-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;text-align:center}
.benchline-calendar-month-labels{margin:8px 0 4px;color:#66748b;font:700 10px/1.5 system-ui,sans-serif}
.benchline-calendar-month-day{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:30px;border:0;border-radius:7px;background:transparent;color:#39465a;font:650 11px/1.1 system-ui,sans-serif;cursor:pointer}
.benchline-calendar-month-day:hover{background:#e8edff;color:#304bdc}
.benchline-calendar-month-day.is-today{background:#4262ff;color:white}
.benchline-calendar-day-dots{display:flex;gap:2px;height:4px;margin-top:2px}
.benchline-calendar-day-dots i{width:4px;height:4px;border-radius:50%;display:block}
.benchline-calendar-dot-task{background:#4262ff}
.benchline-calendar-dot-meeting{background:#25a69a}
.benchline-calendar-month-day.is-today .benchline-calendar-day-dots i{background:#fff}
.benchline-calendar-month-summary{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-top:11px;padding-top:9px;border-top:1px solid #edf0f5;color:#67748a;font:600 11px/1.3 system-ui,sans-serif}
.dark .benchline-calendar-toolbar,.dark .benchline-calendar-month-panel,.dark .benchline-calendar-source-popover{background:#242a34;border-color:#414957;color:#e6edff}
.dark .benchline-calendar-title,.dark .benchline-calendar-month-title{color:#e6edff}
.dark .benchline-calendar-actions>select,.dark .benchline-calendar-actions>input[type=date],.dark .benchline-calendar-settings,.dark .benchline-calendar-sources>summary{background:#303849;color:#ecf0ff;border-color:#536079}
.dark .benchline-calendar-nav{background:#303849;border-color:#536079}
.dark .benchline-calendar-overview{background:#1c2027}
.dark .benchline-calendar-month-day{color:#cbd6eb}
.dark .benchline-calendar-day-heading,.dark .benchline-calendar-timegrid>div:first-child{background:#303a56}
@media(max-width:1050px){
 .benchline-calendar-toolbar{flex-wrap:wrap}
 .benchline-calendar-actions{width:100%;justify-content:flex-start;flex-wrap:wrap}
 .benchline-calendar-overview-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){
 .benchline-calendar-toolbar{min-height:0;align-items:stretch;padding:8px 10px;gap:8px}
 .benchline-calendar-title-row{width:100%;justify-content:space-between;gap:8px}
 .benchline-calendar-title{font-size:15px}
 .benchline-calendar-nav button{min-width:40px;min-height:38px}
 .benchline-calendar-actions{gap:6px;flex-wrap:nowrap;min-width:0;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
 .benchline-calendar-actions::-webkit-scrollbar{display:none}
 .benchline-calendar-actions>label,.benchline-calendar-jump-label{display:none}
 .benchline-calendar-actions>select,.benchline-calendar-actions>input[type=date],.benchline-calendar-settings,.benchline-calendar-sources>summary{min-height:40px;flex:none}
 .benchline-calendar-actions>select{min-width:102px}
 .benchline-calendar-actions>input[type=date]{max-width:133px}
 .benchline-calendar-week-scroll>.benchline-calendar-timegrid[data-days="7"]{min-width:785px}
 .benchline-calendar-week-scroll>.benchline-calendar-timegrid[data-days="3"]{min-width:450px}
 .benchline-calendar-month-view{overflow-y:auto}
 .benchline-calendar-month-view>div:nth-child(2){min-height:680px;grid-auto-rows:minmax(90px,1fr);flex:none}
 .benchline-calendar-month-view>div:nth-child(2)>div{min-height:90px}
 .benchline-calendar-overview{padding:10px}
 .benchline-calendar-overview-grid,.benchline-calendar-overview-quarter .benchline-calendar-overview-grid{grid-template-columns:repeat(1,minmax(0,1fr));gap:10px}
 .benchline-calendar-month-day{min-height:37px;font-size:12px}
 .benchline-calendar-month-panel{padding:12px}
}
`;

const phoneCss = `
body.benchline-phone .benchline-sidebar{display:none!important}
body.benchline-phone header.benchline-app-header{height:48px!important;padding:0 10px!important;gap:6px!important}
body.benchline-phone header.benchline-app-header>div{gap:5px!important}
body.benchline-phone #benchline-sparkboard{max-width:86px;margin-right:0!important;font-size:11px!important}
body.benchline-phone header.benchline-app-header>div>span[aria-label="Benchline"]{font-size:15px!important}
body.benchline-phone header.benchline-app-header details summary{min-height:34px;padding:0 8px;font-size:12px}
body.benchline-phone header.benchline-app-header .h-5.w-px{display:none!important}
body.benchline-phone header.benchline-app-header .text-xl{font-size:16px!important}
body.benchline-phone header.benchline-app-header .relative:has(#global-search-bar):not(.benchline-search-open),
body.benchline-phone header.benchline-app-header [title="User Profile"]{display:none!important}
body.benchline-phone header.benchline-app-header .benchline-search-open{display:block!important;position:fixed!important;left:10px;right:10px;top:52px;z-index:85;padding:8px;border:1px solid #d9e0ed;border-radius:12px;background:white;box-shadow:0 8px 25px #16254a26}
body.benchline-phone header.benchline-app-header .benchline-search-open input{width:100%!important}
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
#benchline-phone-chrome .bpc-command-row{display:flex;gap:6px;padding:5px;border-bottom:1px solid #e6e6e2;margin-bottom:5px}
#benchline-phone-chrome .bpc-command-row button{flex:1;justify-content:center;background:#f3f5ff;color:#304bdc;font-weight:750}
#benchline-phone-chrome .bpc-command-row button:disabled{opacity:.35;cursor:not-allowed}

#benchline-phone-chrome button:focus-visible{outline:2px solid #4262ff;outline-offset:2px}

/* Compact navigation: one view selector instead of four scrolling tabs. */
body.benchline-phone header.benchline-app-header{height:42px!important;min-height:42px!important}
body.benchline-phone header.benchline-app-header>div>span[aria-label="Benchline"]{font-size:14px!important}
body.benchline-phone header.benchline-app-header details summary{min-height:32px!important;padding:0 7px!important}
body.benchline-phone main{padding-top:42px!important}
body.benchline-phone header.benchline-app-header .benchline-search-open{top:46px!important}
#benchline-phone-chrome{top:42px}
#benchline-phone-chrome .bpc-row{height:42px;align-items:center;padding:0 8px;gap:5px}
#benchline-phone-chrome .bpc-view{display:flex;align-items:center;flex:1;min-width:0;gap:7px;margin:0}
#benchline-phone-chrome .bpc-view-label{font:650 11px/1 'DM Sans',sans-serif;color:#757f8e}
#benchline-phone-chrome .bpc-view select{
  width:100%;max-width:170px;min-width:0;min-height:34px;padding:0 26px 0 10px;
  border:1px solid #e6e6e2;border-radius:8px;background:#fff;
  color:#292c31;font:700 13px/1 'DM Sans',sans-serif;
}
#benchline-phone-chrome .bpc-new{background:#4262ff;color:white;border-radius:8px;min-height:34px;padding:0 11px;font-size:13px}
#benchline-phone-chrome .bpc-menu-btn{min-width:38px;min-height:36px;padding:0 8px;border-radius:8px;color:#485466;font-size:17px}
#benchline-phone-chrome .bpc-menu{top:42px;right:8px}
@media(max-width:360px){
  body.benchline-phone #benchline-sparkboard{font-size:10px!important}
  #benchline-phone-chrome .bpc-view-label{display:none}
  #benchline-phone-chrome .bpc-view select{max-width:none}
}

/* Single-line mobile planner controls. Only primary actions stay in sight. */
body.benchline-phone #root .benchline-gantt-toolbar{
  height:43px!important;min-height:43px!important;padding:4px 8px!important;
  flex-wrap:nowrap!important;overflow:visible!important;gap:4px!important;
}
body.benchline-phone #root .benchline-gantt-actions{
  display:flex;align-items:center;justify-content:flex-end;
  width:100%!important;min-width:0!important;gap:6px!important;
}
body.benchline-phone #root .benchline-gantt-scale-controls{flex:1;min-width:0;max-width:none}
body.benchline-phone #root .benchline-gantt-scale-select{
  max-width:180px;min-width:0;width:100%;min-height:34px;
}
body.benchline-phone #root .benchline-gantt-new,
body.benchline-phone #root .benchline-gantt-zoom{display:none!important}
body.benchline-phone #root .benchline-gantt-more>summary{min-height:34px;min-width:38px}
body.benchline-phone #root .benchline-gantt-more-panel{min-width:220px;max-width:calc(100vw - 20px)}
#root .benchline-gantt-mobile-zoom{display:none}
body.benchline-phone #root .benchline-gantt-mobile-zoom{
  display:flex;align-items:center;gap:8px;min-height:40px;
  color:var(--benchline-ink);
}
body.benchline-phone #root .benchline-gantt-mobile-zoom>span{flex:1;font-weight:650;font-size:13px}
body.benchline-phone #root .benchline-gantt-mobile-zoom>button{
  min-width:40px;min-height:38px;border:1px solid var(--benchline-border);
  background:var(--benchline-subtle);border-radius:8px;font-size:18px;
}
body.benchline-phone #root .benchline-calendar-toolbar{
  display:flex;align-items:center;flex-wrap:nowrap!important;
  min-height:44px!important;height:44px!important;
  padding:4px 7px!important;gap:4px!important;overflow:visible!important;
}
body.benchline-phone #root .benchline-calendar-title-row{
  display:flex;align-items:center;flex:1;min-width:0;gap:4px!important;
}
body.benchline-phone #root .benchline-calendar-title{
  min-width:0;max-width:clamp(76px,26vw,154px);
  overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
  font-size:12px!important;line-height:1.25;
}
body.benchline-phone #root .benchline-calendar-nav{
  display:flex;flex:none;gap:1px!important;align-items:center;
}
body.benchline-phone #root .benchline-calendar-nav>button{
  min-height:34px;min-width:30px;padding:0 4px!important;
}
body.benchline-phone #root .benchline-calendar-nav>.benchline-calendar-today{display:none!important}
body.benchline-phone #root .benchline-calendar-actions{
  display:flex;align-items:center;flex:none;width:auto!important;
  min-width:0!important;gap:4px!important;overflow:visible!important;
  flex-wrap:nowrap!important;padding:0!important;
}
body.benchline-phone #root .benchline-calendar-actions>select{
  width:82px;min-width:82px!important;max-width:82px;
  min-height:34px!important;padding:0 3px!important;font-size:12px;
}
body.benchline-phone #root .benchline-calendar-more>summary{
  min-height:34px!important;min-width:37px;padding:0 7px!important;
  font-size:12px;
}
body.benchline-phone #root .benchline-calendar-more-panel{
  right:0;min-width:210px;max-width:calc(100vw - 20px);
  max-height:calc(100dvh - 155px);overflow-y:auto;
}
@media(max-width:370px){
  body.benchline-phone #root .benchline-calendar-title{max-width:83px}
  body.benchline-phone #root .benchline-calendar-actions>select{width:72px;min-width:72px!important;max-width:72px}
  body.benchline-phone #root .benchline-calendar-nav>button{min-width:26px}
}
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
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function HostedMobileShell({
  currentView,
  onViewChange,
  onAddTask,
  onSettings,
  onHelp,
  undo,
  redo,
  canUndo = false,
  canRedo = false,
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
    const header = document.querySelector('header.benchline-app-header');
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
      <style>{themeCss + hostedThemeCss + (compact ? phoneCss : '')}</style>
      {compact ? (
        <div id="benchline-phone-chrome">
          <div className="bpc-row">
            <label className="bpc-view">
              <span className="bpc-view-label">View</span>
              <select
                aria-label="Planner view"
                value={currentView}
                onChange={(event) => {
                  setMenu(false);
                  onViewChange(event.target.value as View);
                }}
              >
                {[...VIEWS, { id: View.KANBAN, label: 'Kanban' }].map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="bpc-new"
              onClick={() => {
                setMenu(false);
                onAddTask();
              }}
            >
              <HostedIcon name="plus" size={17} /> New
            </button>
            <button
              type="button"
              className="bpc-menu-btn"
              aria-label="Menu"
              aria-expanded={menu}
              onClick={() => setMenu((open) => !open)}
            >
              <HostedIcon name="menu" />
            </button>
          </div>
          {menu ? (
            <div className="bpc-menu" role="menu">
              <div className="bpc-command-row" aria-label="Project edit commands">
                <button
                  type="button"
                  role="menuitem"
                  disabled={!canUndo}
                  onClick={() => {
                    setMenu(false);
                    undo?.();
                  }}
                >
                  <HostedIcon name="undo" size={17} /> Undo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!canRedo}
                  onClick={() => {
                    setMenu(false);
                    redo?.();
                  }}
                >
                  <HostedIcon name="redo" size={17} /> Redo
                </button>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onViewChange(View.KANBAN);
                }}
              >
                <HostedIcon name="kanban" size={17} /> Kanban board
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onSettings();
                }}
              >
                <HostedIcon name="settings" size={17} /> Settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onHelp();
                }}
              >
                <HostedIcon name="help" size={17} /> Help
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
