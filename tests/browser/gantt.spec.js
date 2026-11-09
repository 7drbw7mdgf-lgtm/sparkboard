import { test, expect } from '@playwright/test';

const project = {
  projectStartDate: '2026-01-01T12:00:00',
  projectEndDate: '2026-12-31T12:00:00',
  tasks: [
    {
      id: 'a',
      name: 'Research',
      startDate: '2026-01-05T12:00:00',
      endDate: '2026-01-09T12:00:00',
      dependencies: [],
    },
    {
      id: 'b',
      name: 'Build',
      startDate: '2026-01-14T12:00:00',
      endDate: '2026-01-18T12:00:00',
      dependencies: ['a'],
    },
    {
      id: 'c',
      name: 'Review overlapping work',
      startDate: '2026-01-01T12:00:00',
      endDate: '2026-01-01T12:00:00',
      dependencies: ['b', 'b', 'missing', 'c'],
    },
  ].map((task) => ({ ...task, completion: 0, assignedTo: [], color: '#e8edff' })),
  groups: [
    { id: 'work', name: 'Work', color: '#4262ff' },
    { id: 'extra', name: 'Later work', color: '#4262ff' },
  ],
  people: [],
  notes: [],
  assignments: [],
  meetings: [],
  jobs: [],
};

project.tasks.forEach((task) => {
  task.groupId = 'work';
});
project.tasks.push(
  ...Array.from({ length: 20 }, (_, i) => ({
    id: 'extra-' + i,
    groupId: 'extra',
    name: 'Later task ' + i,
    startDate: '2026-02-01T12:00:00',
    endDate: '2026-02-05T12:00:00',
    completion: 0,
    assignedTo: [],
    color: '#e8edff',
  })),
);

async function alignment(page) {
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const errors = await page.evaluate(() =>
    [...document.querySelectorAll('[data-dependency-path]')].flatMap((path) => {
      const group = path.parentElement;
      const source = document.querySelector(
        `.benchline-gantt-task-bar[aria-label^="Select ${group.dataset.dependencySource === 'a' ? 'Research' : 'Build'}"]`,
      );
      const target = [...document.querySelectorAll('.benchline-gantt-task-bar')].find((bar) =>
        bar
          .getAttribute('aria-label')
          .includes(group.dataset.dependencyTarget === 'b' ? 'Build' : 'Review'),
      );
      if (!source || !target) return ['missing bar'];
      const matrix = path.getScreenCTM();
      const point = (position) => {
        const p = path.getPointAtLength(position);
        return new DOMPoint(p.x, p.y).matrixTransform(matrix);
      };
      const start = point(0),
        end = point(path.getTotalLength());
      const s = source.getBoundingClientRect(),
        t = target.getBoundingClientRect();
      const numbers = path
        .getAttribute('d')
        .match(/-?\d+(?:\.\d+)?/g)
        .map(Number);
      const result = [];
      for (let i = 2; i < numbers.length; i += 2)
        if (numbers[i] !== numbers[i - 2] && numbers[i + 1] !== numbers[i - 1])
          result.push('diagonal');
      if (Math.abs(start.x - s.right) > 1 || Math.abs(start.y - (s.top + s.height / 2)) > 1)
        result.push('source detached');
      if (Math.abs(end.x - t.left) > 1 || Math.abs(end.y - (t.top + t.height / 2)) > 1)
        result.push('target detached');
      const marker = document.getElementById(path.getAttribute('marker-end').slice(5, -1));
      if (
        marker?.getAttribute('refX') !== '8' ||
        marker?.getAttribute('markerUnits') !== 'userSpaceOnUse'
      )
        result.push('arrow tip offset');
      return result;
    }),
  );
  expect(errors).toEqual([]);
}

for (const mobile of [false, true]) {
  test(`real Gantt links follow scroll, zoom, drag and cancellation (${mobile ? 'phone' : 'desktop'})`, async ({
    page,
  }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
    await page.addInitScript(
      (data) => localStorage.setItem('sai.hosted.project.v1', JSON.stringify(data)),
      project,
    );
    await page.goto('/sai/');
    if (mobile)
      await page
        .getByRole('combobox', { name: 'Planner view' })
        .selectOption({ label: 'Timeline' });
    else await page.getByRole('button', { name: 'Timeline', exact: true }).click();
    await expect(page.locator('[data-dependency-path]')).toHaveCount(2);
    // The production app loads its utility CSS from Tailwind CDN.
    await expect(page.locator('.gantt-timeline')).toHaveCSS('position', 'relative');
    const timeline = page.locator('.gantt-timeline');
    await timeline.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await alignment(page);
    await page.screenshot({ path: test.info().outputPath('gantt.png') });
    await timeline.evaluate((el) => {
      el.scrollLeft = 180;
      el.scrollTop = 40;
    });
    await alignment(page);
    if (mobile) await page.locator('.benchline-gantt-more summary').click();
    const zoomOut = page.getByRole('button', {
      name: mobile ? 'Zoom out' : 'Zoom timeline out',
      exact: true,
    });
    const zoomIn = page.getByRole('button', {
      name: mobile ? 'Zoom in' : 'Zoom timeline in',
      exact: true,
    });
    await zoomOut.click();
    await alignment(page);
    await zoomIn.click();
    if (mobile) await page.locator('.benchline-gantt-more summary').click();
    await timeline.evaluate((el) => {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    });
    const bar = page.locator('.benchline-gantt-task-bar').filter({ hasText: 'Research' });
    const box = await bar.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 9);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 48, box.y + 9, { steps: 4 });
    await alignment(page);
    await timeline.evaluate((el) => {
      el.scrollLeft += 24;
    });
    await alignment(page);
    await page.mouse.up();
    await alignment(page);
    const after = await page.evaluate(
      () => JSON.parse(localStorage.getItem('sai.hosted.project.v1')).tasks[0].startDate,
    );
    expect(after).not.toEqual(project.tasks[0].startDate);
    await bar.press('ArrowRight');
    await alignment(page);
    const resized = await page
      .locator('.benchline-gantt-task-wrapper')
      .filter({ has: bar })
      .locator('.benchline-gantt-resize-right')
      .boundingBox();
    await page.mouse.move(resized.x + resized.width / 2, resized.y + 9);
    await page.mouse.down();
    await page.mouse.move(resized.x + resized.width / 2 + 24, resized.y + 9, { steps: 3 });
    await alignment(page);
    await page.mouse.up();
    await alignment(page);
    const beforeCancel = await page.evaluate(
      () => JSON.parse(localStorage.getItem('sai.hosted.project.v1')).tasks[0].startDate,
    );
    // Fractional zoom must attach to the rendered six-pixel minimum bar.
    if (mobile) await page.locator('.benchline-gantt-more summary').click();
    for (let i = 0; i < 30 && (await zoomOut.isEnabled()); i++) await zoomOut.click();
    if (mobile) await page.locator('.benchline-gantt-more summary').click();
    await alignment(page);
    const latest = await bar.boundingBox();
    await bar.dispatchEvent('pointerdown', {
      pointerId: 99,
      pointerType: 'touch',
      button: 0,
      clientX: latest.x + 3,
      clientY: latest.y + 9,
    });
    await page.evaluate(
      ({ x, y }) =>
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerId: 99,
            pointerType: 'touch',
            clientX: x + 40,
            clientY: y,
          }),
        ),
      { x: latest.x + 3, y: latest.y + 9 },
    );
    await alignment(page);
    await page.evaluate(() =>
      window.dispatchEvent(
        new PointerEvent('pointercancel', { pointerId: 99, pointerType: 'touch' }),
      ),
    );
    await alignment(page);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('sai.hosted.project.v1')).tasks[0].startDate,
      ),
    ).toEqual(beforeCancel);
    if (!mobile) {
      const group = page.locator('.gantt-task-list').getByText('Work', { exact: true });
      await group.click();
      await expect(page.locator('[data-dependency-path]')).toHaveCount(0);
      await group.click();
      await expect(page.locator('[data-dependency-path]')).toHaveCount(2);
      await alignment(page);
    }
    const remove = page.getByRole('button', { name: 'Remove dependency from a to b', exact: true });
    await remove.focus();
    await remove.press('Enter');
    await expect(page.locator('[data-dependency-path]')).toHaveCount(1);
  });
}
