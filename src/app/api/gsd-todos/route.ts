import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export interface GsdTodo {
  id: string;
  text: string;
  section: "NOW" | "NEXT" | "DONE" | "IDEAS";
  order: number;
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

export async function getTodos(): Promise<GsdTodo[]> {
  return await getTodosFromKv();
}

export async function addTodo(text: string, section: GsdTodo['section'] = 'NOW'): Promise<GsdTodo> {
  const todos = await getTodosFromKv();
  const sectionTodos = todos.filter(t => t.section === section);
  const maxOrder = sectionTodos.length > 0 ? Math.max(...sectionTodos.map(t => t.order ?? 0)) : 0;
  const newTodo: GsdTodo = {
    id: crypto.randomUUID(),
    text,
    section,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
  };
  todos.unshift(newTodo);
  await saveTodosToKv(todos);
  return newTodo;
}

export async function updateTodo(id: string, updates: Partial<GsdTodo>): Promise<GsdTodo | null> {
  const todos = await getTodosFromKv();
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) return null;

  todos[index] = { ...todos[index], ...updates };
  await saveTodosToKv(todos);
  return todos[index];
}

export async function deleteTodo(id: string): Promise<boolean> {
  const todos = await getTodosFromKv();
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) return false;

  todos.splice(index, 1);
  await saveTodosToKv(todos);
  return true;
}

export async function GET() {
  try {
    const todos = await getTodos();
    return NextResponse.json(todos);
  } catch (err) {
    console.error('[gsd-todos API] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle reorder endpoint
    if (body.movedId && body.targetId && body.before !== undefined) {
      const todos = await getTodosFromKv();
      const moved = todos.find(t => t.id === body.movedId);
      const target = todos.find(t => t.id === body.targetId);
      if (!moved || !target || moved.section !== target.section) {
        return NextResponse.json({ error: 'Invalid reorder' }, { status: 400 });
      }
      const section = moved.section;

      // Remove moved from list
      const sectionTodos = todos.filter(t => t.section === section);
      sectionTodos.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const movedIdx = sectionTodos.findIndex(t => t.id === body.movedId);
      const targetIdx = sectionTodos.findIndex(t => t.id === body.targetId);
      sectionTodos.splice(movedIdx, 1);

      // Re-insert at new position
      if (body.before) {
        sectionTodos.splice(targetIdx, 0, moved);
      } else {
        sectionTodos.splice(targetIdx + 1, 0, moved);
      }

      // Renumber all tasks in section sequentially
      sectionTodos.forEach((t, i) => { t.order = i; });

      await saveTodosToKv(todos);
      return NextResponse.json({ success: true });
    }

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid text field' }, { status: 400 });
    }
    const section = body.section || 'NOW';
    if (!['NOW', 'NEXT', 'DONE', 'IDEAS', 'TAXES'].includes(section)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }
    const todo = await addTodo(body.text.trim(), section);
    return NextResponse.json(todo, { status: 201 });
  } catch (err) {
    console.error('[gsd-todos API] POST error:', err);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing id field' }, { status: 400 });
    }
    const allowedUpdates: Partial<GsdTodo> = {};
    if (typeof body.text === 'string') allowedUpdates.text = body.text.trim();
    if (['NOW', 'NEXT', 'DONE', 'IDEAS', 'TAXES'].includes(body.section)) {
      allowedUpdates.section = body.section;
    }
    if (typeof body.order === 'number') {
      allowedUpdates.order = body.order;
    }
    if (typeof body.done === 'boolean') {
      allowedUpdates.section = body.done ? 'DONE' : 'NOW';
    }
    const todo = await updateTodo(body.id, allowedUpdates);
    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }
    return NextResponse.json(todo);
  } catch (err) {
    console.error('[gsd-todos API] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }
    const deleted = await deleteTodo(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[gsd-todos API] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}