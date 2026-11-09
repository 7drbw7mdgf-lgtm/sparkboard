import { test, expect } from '@playwright/test';

for (const separateTab of [false, true]) {
  test(`linked task opens in Benchline, saves changes and returns to its exact board (${separateTab ? 'other tab' : 'same tab'})`, async ({
    page,
  }) => {
    await page.goto('/?workspace=1');
    await page.waitForFunction(async () => (await import('/src/state.js')).state.ready);
    const origin = await page.evaluate(async () => {
      const { state } = await import('/src/state.js');
      const { commit } = await import('/src/history.js');
      const { publishTask } = await import('/src/task-bridge.js');
      const { flushSaves } = await import('/src/boards.js');
      const task = {
        id: 'integration-task',
        name: 'Linked experiment',
        boardId: state.board.id,
        nodeId: 'integration-node',
        notes: 'Keep the linked details',
        priority: 'High',
      };
      commit(() =>
        state.board.objects.push({
          id: task.nodeId,
          type: 'shape',
          x: 200,
          y: 200,
          w: 220,
          h: 90,
          text: task.name,
          color: '#e8edff',
          sparkTask: task,
        }),
      );
      publishTask(task);
      await flushSaves();
      return task;
    });
    // Follow the same link provided on the canvas; existing canvas pan remains untouched.
    const boardPage = page;
    if (separateTab) {
      const href = await page.locator('.spark-task-tag').getAttribute('href');
      page = await page.context().newPage();
      await page.goto(href);
    } else await page.locator('.spark-task-tag').filter({ hasText: 'Benchline' }).click();
    await expect(page.locator('#task-detail-title')).toHaveValue(origin.name);
    await page.locator('#task-detail-title').fill('Updated linked experiment');
    await page.getByRole('button', { name: 'Mark Complete', exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem('sparkboard.sai.task-state.v1'))?.['integration-task']
              ?.completion,
        ),
      )
      .toBe(100);
    if (separateTab) {
      await expect(boardPage.locator('.spark-task-tag')).toContainText('Complete');
      await expect(boardPage.locator('[data-id="integration-node"]')).toContainText(
        'Updated linked experiment',
      );
    }
    await page.getByRole('link', { name: 'Open source board' }).click();
    await page.waitForURL((url) => url.pathname === '/' && url.searchParams.has('board'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(async () => (await import('/src/state.js')).state.ready);
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const { state } = await import('/src/state.js');
          return {
            boardId: state.board?.id,
            text: state.board?.objects.find((item) => item.id === 'integration-node')?.text,
            selected: state.selected.has('integration-node'),
          };
        }),
      )
      .toEqual({ boardId: origin.boardId, text: 'Updated linked experiment', selected: true });
    await expect(page.locator('.spark-task-tag')).toContainText('Complete');
  });
}
