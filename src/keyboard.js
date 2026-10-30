/** Let native controls consume their own arrow/space keys instead of nudging art. */
export function isNativeControl(target) {
  if (!target?.matches) return false;
  return (
    target.matches(
      'select,input[type="range"],input[type="color"],input[type="checkbox"],input[type="radio"]',
    ) ||
    (target.matches('button') && !!target.closest('#inspector,#line-options,#drawing-options'))
  );
}
