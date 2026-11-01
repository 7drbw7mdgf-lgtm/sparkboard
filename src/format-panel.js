import { shapeNames } from './icons.js';
import { M, esc } from './core.js';

const textual = (n) => !['path', 'image', 'file', 'link', 'embed', 'line', 'connector'].includes(n.type);
const geometry = (n) => !['path', 'connector', 'line'].includes(n.type);
const line = (n) => ['line', 'connector'].includes(n.type);
const hex = (value, fallback) => /^#[a-f0-9]{6}$/i.test(value || '') ? value : fallback;
const numeric = (value, fallback) => Number.isFinite(value) ? value : fallback;

function field(label, control) {
  return '<label class="format-field"><span>' + label + '</span>' + control + '</label>';
}
function input(prop, type, value, attrs = '') {
  return '<input data-prop="' + prop + '" aria-label="' + prop + '" type="' + type + '" value="' + esc(value) + '" ' + attrs + '>';
}
function numericField(label, prop, value, min, max, disabled) {
  return field(label, input(prop, 'number', value, 'min="' + min + '" max="' + max + '" step="1" ' + disabled));
}
function colorField(label, prop, value, disabled) {
  return field(label, input(prop, 'color', value, disabled));
}
function choices(label, prop, value, options, disabled) {
  return field(label, '<select data-prop="' + prop + '" aria-label="' + label + '" ' + disabled + '>' +
    options.map(([key, name]) => '<option value="' + esc(key) + '"' + (value === key ? ' selected' : '') + '>' + esc(name) + '</option>').join('') + '</select>');
}
function section(name, icon, contents) {
  if (!contents) return '';
  return '<section class="format-card" aria-label="' + name + '"><h4><span aria-hidden="true">' + icon + '</span>' + name + '</h4><div class="format-card-content">' + contents + '</div></section>';
}
function action(label, command, disabled = '', css = '') {
  return '<button type="button" class="format-action ' + css + '" data-command="' + command + '" ' + disabled + '>' + label + '</button>';
}
function toggle(label, key, active, disabled) {
  return '<button type="button" aria-label="' + label + '" aria-pressed="' + String(active) +
    '" class="' + (active ? 'active' : '') + '" data-toggle-style="' + key + '" ' + disabled + '>' + label + '</button>';
}
function selectButton(label, attr, value, active, disabled) {
  return '<button type="button" data-' + attr + '="' + value + '" title="' + label + '" aria-label="' + label + '"' +
    (active ? ' class="active" aria-pressed="true"' : ' aria-pressed="false"') + ' ' + disabled + '>' + label + '</button>';
}

export function formatPanel(ns, reshapeId = null) {
  if (!ns.length) return '';
  const n = ns[0], multi = ns.length > 1;
  const locked = ns.every((item) => item.locked);
  const disabled = locked ? 'disabled' : '';
  const allLine = ns.every(line), allPaths = ns.every((item) => item.type === 'path');
  const allGeometry = ns.every(geometry);
  const canText = ns.every(textual);
  const hasFill = ns.every((item) => item.type === 'sticky' || M.shapes.includes(item.type));
  const hasBorder = ns.every((item) => M.shapes.includes(item.type));
  const stroke = allLine || allPaths;
  const canRadius = !multi && (n.type === 'sticky' || n.type === 'shape');
  const canReshape = !multi && (M.shapes.includes(n.type) || n.type === 'path');
  const lineStyleOptions = [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']];
  const arrowOptions = [['none', 'None'], ['arrow', 'Open arrow'], ['filled', 'Filled arrow'],
    ['circle', 'Circle'], ['diamond', 'Diamond']];
  let appearance = '';
  if (hasFill) appearance += colorField('Fill', 'color', hex(n.color, '#dce7cc'), disabled);
  if (hasBorder) appearance += colorField('Border', 'stroke', hex(n.stroke, '#a8b39c'), disabled);
  if (stroke) appearance += colorField('Stroke', 'stroke', hex(n.color, '#626e56'), disabled);
  if (hasBorder || stroke) appearance += numericField('Border width (px)', 'strokeWidth',
    numeric(n.strokeWidth, stroke ? 2 : 1), 0, 16, disabled);
  if (hasBorder || stroke) appearance += choices('Line style', 'lineStyle',
    n.lineStyle || 'solid', lineStyleOptions, disabled);
  if (!allLine && !allPaths) appearance += field('Opacity (' +
    Math.round(numeric(n.opacity, 1) * 100) + '%)', input('opacity', 'range',
    Math.round(numeric(n.opacity, 1) * 100), 'min="0" max="100" step="1" ' + disabled));
  appearance = section('Appearance', '◉', '<div class="format-grid">' + appearance + '</div>');

  let text = '';
  if (canText) {
    text += '<div class="format-grid">' + choices('Font', 'fontFamily', n.fontFamily || 'DM Sans',
      [['DM Sans', 'DM Sans'], ['Manrope', 'Manrope'], ['Georgia', 'Georgia'],
       ['Arial', 'Arial'], ['monospace', 'Monospace']], disabled) +
      numericField('Size (px)', 'fontSize', numeric(n.fontSize, n.type === 'text' ? 22 : 17), 8, 144, disabled) +
      colorField('Text colour', 'textColor', hex(n.textColor, '#3c4234'), disabled) + '</div>';
    text += '<div class="format-button-row" role="group" aria-label="Text formatting">' +
      toggle('B', 'bold', n.fontWeight === 700, disabled) +
      toggle('I', 'italic', n.fontStyle === 'italic', disabled) +
      toggle('U', 'underline', n.textDecoration === 'underline', disabled) + '</div>';
    text += '<div class="format-button-row" role="group" aria-label="Text alignment">' +
      ['left', 'center', 'right'].map((a) => selectButton('Text ' + a, 'align-text', a,
        (n.align || (n.type === 'text' ? 'left' : 'center')) === a, disabled)).join('') + '</div>';
    if (!multi) text += action('✎ Edit text', 'edit', disabled);
  } else if (allLine && !multi) {
    text += field('Label', input('text', 'text', n.text || '', 'maxlength="160" placeholder="Add a label" ' + disabled));
  }
  text = section('Text', 'T', text);

  let layout = '';
  if (allGeometry && !multi) {
    layout += '<div class="format-grid">' +
      numericField('Width (px)', 'w', Math.round(n.w), 30, 10000, disabled) +
      numericField('Height (px)', 'h', Math.round(n.h), 30, 10000, disabled) +
      numericField('Rotation (°)', 'rotation', numeric(n.rotation, 0), -360, 360, disabled) +
      (canRadius ? numericField('Corner radius (px)', 'cornerRadius', numeric(n.cornerRadius, n.type === 'sticky' ? 12 : 6), 0, 80, disabled) : '') + '</div>';
    if (M.shapes.includes(n.type)) layout += choices('Shape', 'type', n.type,
      M.shapes.map((k) => [k, shapeNames[k]]), disabled);
  }
  if (allLine) {
    layout += '<div class="format-grid">' +
      choices('Route', 'route', n.route || 'straight',
        [['straight', 'Straight'], ['curved', 'Curved'], ['elbow', 'Elbow']], disabled) +
      choices('Start cap', 'startArrow', n.startArrow || 'none', arrowOptions, disabled) +
      choices('End cap', 'endArrow', n.endArrow || (n.type === 'connector' ? 'arrow' : 'none'),
        arrowOptions, disabled) +
      (ns.every((item) => item.type === 'connector') ?
        choices('Routing', 'avoidObstacles', n.avoidObstacles === false ? 'false' : 'true',
          [['true', 'Avoid shapes'], ['false', 'Direct route']], disabled) : '') + '</div>';
  }
  if (canReshape) {
    layout += action(reshapeId === n.id ? '✓ Finish reshaping' : '◇ Reshape points', 'reshape', disabled,
      reshapeId === n.id ? 'active' : '');
    if (M.shapes.includes(n.type) && Array.isArray(n.vertices)) {
      layout += action('Reset shape', 'reset-vertices', disabled);
    }
  }
  layout = section('Layout', '□', layout);

  let arrange = '<div class="format-grid two">' +
    action('↑ Bring forward', 'front', disabled) +
    action('↓ Send backward', 'back', disabled) + '</div>';
  if (multi && allGeometry) {
    arrange += '<div class="format-grid thirds" role="group" aria-label="Align selection">' +
      ['left', 'center', 'right', 'top', 'middle', 'bottom'].map((a) =>
        selectButton('Align ' + a, 'align', a, false, disabled)).join('') + '</div>';
    if (ns.length >= 3) arrange += '<div class="format-grid two">' +
      selectButton('Space horizontally', 'distribute', 'x', false, disabled) +
      selectButton('Space vertically', 'distribute', 'y', false, disabled) + '</div>';
  }
  arrange = section('Arrange', '▤', arrange);

  let behavior = '<div class="format-grid two">' +
    action(locked ? '▣ Unlock' : '▢ Lock', 'lock') +
    action('⧉ Duplicate', 'duplicate', disabled) +
    (!multi && n.type === 'link' ? action('↗ Edit link', 'edit-link', disabled) : '') +
    (multi ? action('Group', 'group', disabled) : '') +
    (ns.some((item) => item.group) ? action('Ungroup', 'ungroup', disabled) : '') +
    action('⌫ Delete', 'delete', disabled, 'danger') + '</div>';
  behavior = section('Actions', '⚡', behavior);

  return '<div class="format-panels">' + appearance + text + layout + arrange + behavior + '</div>';
}
