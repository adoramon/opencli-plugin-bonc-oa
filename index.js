export { statusCommand } from './status.js';
export { todosCommand } from './todos.js';
export { todoCommand } from './todo.js';
export { approveCommand, rejectCommand } from './approval.js';
export { submitExpenseCommand } from './submit-expense.js';

import { statusCommand } from './status.js';
import { todosCommand } from './todos.js';
import { todoCommand } from './todo.js';
import { approveCommand, rejectCommand } from './approval.js';
import { submitExpenseCommand } from './submit-expense.js';

export const commands = [
  statusCommand,
  todosCommand,
  todoCommand,
  approveCommand,
  rejectCommand,
  submitExpenseCommand,
];

export default commands;
