// Undo / redo history for the cover state: a snapshot stack of plain JSON.
// Every committed edit pushes the previous state; undo and redo move the pointer.
export function createHistory(initialState) {
  let past = [];
  let future = [];
  let current = JSON.parse(JSON.stringify(initialState));
  return {
    get current() {
      return JSON.parse(JSON.stringify(current));
    },
    commit(nextState) {
      past.push(current);
      if (past.length > 60) past.shift();
      future = [];
      current = JSON.parse(JSON.stringify(nextState));
    },
    undo() {
      if (!past.length) return null;
      future.push(current);
      current = past.pop();
      return JSON.parse(JSON.stringify(current));
    },
    redo() {
      if (!future.length) return null;
      past.push(current);
      current = future.pop();
      return JSON.parse(JSON.stringify(current));
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
  };
}
