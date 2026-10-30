/** Per-board editing history and viewport live only for this app session. */
export class BoardSessions {
  constructor(limit = Infinity) {
    this.limit = limit;
    this.entries = new Map();
  }
  remember(state) {
    if (!state.board) return;
    this.entries.delete(state.board.id);
    this.entries.set(state.board.id, {
      revision: state.board.revision || 0,
      history: state.history,
      future: state.future,
      view: { ...state.view },
    });
    while (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value);
  }
  restore(board) {
    const session = this.entries.get(board.id);
    // Never apply an old undo stack over edits saved by another window.
    return session && session.revision === (board.revision || 0) ? session : null;
  }
  forget(id) {
    this.entries.delete(id);
  }
}
