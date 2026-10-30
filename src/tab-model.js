/** Tab metadata only. Closing a tab never removes a board from storage. */
export function restoreTabs(saved, available, active) {
  if (Array.isArray(saved) && saved.length === 0) return [];
  const known = new Set(available);
  const ids = Array.isArray(saved) ? [...new Set(saved.filter((id) => known.has(id)))] : [];
  if (known.has(active) && !ids.includes(active)) ids.push(active);
  return ids;
}

export function closeTab(ids, id, active) {
  const index = ids.indexOf(id);
  const remaining = ids.filter((item) => item !== id);
  return {
    ids: remaining,
    active: active !== id ? active : remaining[Math.min(index, remaining.length - 1)] || null,
  };
}
