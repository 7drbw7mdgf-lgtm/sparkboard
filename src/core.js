import * as M from '../board-model.js';
export { M };
export const $ = (s) => document.querySelector(s);
export const $$ = (s) => [...document.querySelectorAll(s)];
export const uid = () => crypto.randomUUID();
export const colors = ['#f8df87', '#dce7cc', '#edcbbd', '#e8ddf1', '#cde4e7', '#ffffff'];
export const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );
export const node = (type, x, y, w, h, text, color, extra = {}) => ({
  id: uid(),
  type,
  x,
  y,
  w,
  h,
  text,
  color,
  ...extra,
});
