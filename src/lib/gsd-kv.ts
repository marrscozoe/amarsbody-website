import { kv } from '@vercel/kv';

// GSD Todo data structure
export interface GsdTodo {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

const GSD_TODOS_KEY = 'gsd:todos';

async function getTodosFromKv(): Promise<GsdTodo[]> {
  try {
    const data = await kv.get<GsdTodo[] | string>(GSD_TODOS_KEY);
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
      return JSON.parse(data as string);
    } catch {
      console.error('[gsd-todos] JSON parse error:', data);
      return [];
    }
  } catch (err) {
    console.error('[gsd-todos] KV get error:', err);
    return [];
  }
}

async function saveTodosToKv(todos: GsdTodo[]): Promise<void> {
  await kv.set(GSD_TODOS_KEY, JSON.stringify(todos));
}

// GET - List all todos
export async function getTodos(): Promise<GsdTodo[]> {
  const todos = await getTodosFromKv();
  return todos.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// POST - Create a new todo
export async function addTodo(text: string): Promise<GsdTodo> {
  const todos = await getTodosFromKv();
  const newTodo: GsdTodo = {
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(newTodo);
  await saveTodosToKv(todos);
  return newTodo;
}

// PATCH - Update a todo (mark done/undone)
export async function updateTodo(id: string, done: boolean): Promise<GsdTodo | null> {
  const todos = await getTodosFromKv();
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  todos[index].done = done;
  await saveTodosToKv(todos);
  return todos[index];
}

// DELETE - Remove a todo
export async function deleteTodo(id: string): Promise<boolean> {
  const todos = await getTodosFromKv();
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) return false;
  
  todos.splice(index, 1);
  await saveTodosToKv(todos);
  return true;
}