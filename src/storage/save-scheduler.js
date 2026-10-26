/** Coalesces typing into one write while exposing a real flush barrier. */
export class SaveScheduler {
  constructor(write, { delay = 300, maxWait = 2000, onState = () => {} } = {}) {
    this.write = write;
    this.delay = delay;
    this.maxWait = maxWait;
    this.onState = onState;
    this.pending = new Map();
    this.running = null;
    this.timer = null;
    this.deadline = null;
    this.inFlight = [];
  }

  schedule(board) {
    this.pending.set(board.id, board);
    this.onState('pending');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush().catch(() => {}), this.delay);
    if (!this.deadline)
      this.deadline = setTimeout(() => this.flush().catch(() => {}), this.maxWait);
  }

  get dirty() {
    return this.pending.size > 0 || this.running !== null;
  }

  clearTimers() {
    clearTimeout(this.timer);
    clearTimeout(this.deadline);
    this.timer = this.deadline = null;
  }

  flush() {
    this.clearTimers();
    if (this.running) return this.running;
    if (!this.pending.size) return Promise.resolve();
    this.running = this.drain().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  async drain() {
    try {
      while (this.pending.size) {
        const batch = [...this.pending.values()];
        this.pending.clear();
        this.inFlight = batch;
        this.onState('saving');
        for (let index = 0; index < batch.length; index++) {
          const board = batch[index];
          try {
            await this.write(structuredClone(board), board);
          } catch (error) {
            // Keep the newest references so a retry cannot overwrite later edits.
            for (const remaining of batch.slice(index))
              if (!this.pending.has(remaining.id)) this.pending.set(remaining.id, remaining);
            throw error;
          }
        }
      }
      this.clearTimers();
      this.onState('saved');
    } catch (error) {
      this.clearTimers();
      this.onState('error', error);
      throw error;
    } finally {
      this.inFlight = [];
    }
  }

  journal(repository) {
    const boards = new Map(this.inFlight.map((board) => [board.id, board]));
    for (const [id, board] of this.pending) boards.set(id, board);
    let complete = true;
    for (const board of boards.values()) if (!repository.writeDraft(board)) complete = false;
    return complete;
  }
}
