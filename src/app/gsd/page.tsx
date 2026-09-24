"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Todo {
  id: string;
  text: string;
  section: "NOW" | "NEXT" | "DONE" | "IDEAS" | "TAXES";
  order: number;
  createdAt: string;
}

const SECTIONS = ["NOW", "NEXT", "DONE", "IDEAS", "TAXES"] as const;
const SECTION_COLORS: Record<string, string> = {
  NOW: "#e63946",
  NEXT: "#d97706",
  DONE: "#059669",
  IDEAS: "#7c3aed",
  TAXES: "#0891b2",
};

const HOLD_TIME = 350;
const MOVE_THRESHOLD = 15;

export default function GSDPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [addingSection, setAddingSection] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [pickerTodoId, setPickerTodoId] = useState<string | null>(null);

  const dragState = useRef({
    id: null as string | null,
    el: null as HTMLElement | null,
    rect: null as DOMRect | null,
    startY: 0,
    startX: 0,
    isDragging: false,
    moved: false,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/gsd-todos?_=" + Date.now());
      if (res.ok) {
        const data = await res.json();
        setTodos(data);
      }
    } catch (err) {
      console.error("Failed to fetch todos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    if (pickerTodoId) {
      const handler = (e: MouseEvent) => {
        const picker = document.querySelector('.section-picker');
        if (picker && !picker.contains(e.target as Node)) {
          setPickerTodoId(null);
        }
      };
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [pickerTodoId]);

  // Document-level touch handlers
  useEffect(() => {
    const ds = dragState.current;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.todo-actions') || target.closest('.add-form') || target.closest('.section-header')) return;
      const item = target.closest('.todo-item') as HTMLElement | null;
      if (!item) return;
      const id = item.getAttribute('data-id');
      if (!id) return;

      const touch = e.touches[0];
      ds.id = id;
      ds.el = item;
      ds.rect = item.getBoundingClientRect();
      ds.startY = touch.clientY;
      ds.startX = touch.clientX;
      ds.isDragging = false;
      ds.moved = false;
      item.classList.add('holding');

      ds.timer = setTimeout(() => {
        if (!ds.moved) {
          ds.isDragging = true;
          ds.el?.classList.remove('holding');
          ds.el?.classList.add('dragging');
          if (ds.el && ds.rect) {
            ds.el.style.top = ds.rect.top + 'px';
            ds.el.style.left = ds.rect.left + 'px';
            ds.el.style.width = ds.rect.width + 'px';
          }
          if (navigator.vibrate) navigator.vibrate(30);
        }
      }, HOLD_TIME);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!ds.id || !ds.el || !ds.rect) return;
      const touch = e.touches[0];
      const diffY = Math.abs(touch.clientY - ds.startY);
      const diffX = Math.abs(touch.clientX - ds.startX);

      if ((diffY > MOVE_THRESHOLD || diffX > MOVE_THRESHOLD) && !ds.isDragging) {
        clearTimeout(ds.timer!);
        ds.el.classList.remove('holding');
        ds.id = null;
        ds.el = null;
        ds.moved = true;
        return;
      }

      if (!ds.isDragging) return;
      e.preventDefault();
      ds.el.style.top = (touch.clientY - ds.rect.height / 2) + 'px';

      // Clear and set drop indicators
      document.querySelectorAll('.todo-item').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      document.querySelectorAll('.todo-item:not(.dragging)').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          const midY = rect.top + rect.height / 2;
          if (touch.clientY < midY) {
            el.classList.add('drag-over-top');
          } else {
            el.classList.add('drag-over-bottom');
          }
        }
      });
    };

    const onTouchEnd = () => {
      if (!ds.id && !ds.timer) return;

      if (ds.timer) {
        clearTimeout(ds.timer);
        ds.timer = null;
      }

      if (!ds.isDragging) {
        if (ds.el) ds.el.classList.remove('holding');
        ds.id = null;
        ds.el = null;
        ds.rect = null;
        return;
      }

      // Find drop target
      let targetId: string | null = null;
      let insertBefore = true;
      document.querySelectorAll('.todo-item').forEach(el => {
        if (el.classList.contains('drag-over-top')) {
          targetId = el.getAttribute('data-id');
          insertBefore = true;
        } else if (el.classList.contains('drag-over-bottom')) {
          targetId = el.getAttribute('data-id');
          insertBefore = false;
        }
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      if (targetId && targetId !== ds.id) {
        console.log('[touchEnd] Calling reorderTodo:', { movedId: ds.id, targetId, insertBefore });
        reorderTodo(ds.id!, targetId, insertBefore);
      } else {
        console.log('[touchEnd] No reorder:', { targetId, sameAsSource: targetId === ds.id });
      }

      if (ds.el) {
        ds.el.classList.remove('dragging');
        ds.el.style.top = '';
        ds.el.style.left = '';
        ds.el.style.width = '';
      }

      ds.id = null;
      ds.el = null;
      ds.rect = null;
      ds.isDragging = false;
      // NOTE: do NOT call fetchTodos here - reorderTodo already handles the refresh
    };

    const onTouchCancel = () => {
      if (ds.el) {
        ds.el.classList.remove('holding', 'dragging');
        ds.el.style.top = '';
        ds.el.style.left = '';
        ds.el.style.width = '';
      }
      ds.id = null;
      ds.el = null;
      ds.rect = null;
      ds.isDragging = false;
      ds.moved = false;
      if (ds.timer) clearTimeout(ds.timer);
      document.querySelectorAll('.todo-item').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, []);

  const addTodo = async (section: string) => {
    if (!newTaskText.trim()) return;
    try {
      const res = await fetch("/api/gsd-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTaskText.trim(), section }),
      });
      if (res.ok) {
        const todo = await res.json();
        setTodos((prev) => [todo, ...prev]);
        setNewTaskText("");
        setAddingSection(null);
      }
    } catch (err) {
      console.error("Failed to add todo:", err);
    }
  };

  const toggleSection = async (id: string, direction: "left" | "right") => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const currentIndex = SECTIONS.indexOf(todo.section);
    const newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= SECTIONS.length) return;
    const newSection = SECTIONS[newIndex];
    try {
      const res = await fetch("/api/gsd-todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, section: newSection }),
      });
      if (res.ok) {
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, section: newSection } : t))
        );
      }
    } catch (err) {
      console.error("Failed to move todo:", err);
    }
  };

  const moveToSection = async (id: string, section: typeof SECTIONS[number]) => {
    try {
      const res = await fetch("/api/gsd-todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, section }),
      });
      if (res.ok) {
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, section } : t))
        );
        setPickerTodoId(null);
      }
    } catch (err) {
      console.error("Failed to move todo:", err);
    }
  };

  const moveToDone = async (id: string) => {
    await moveToSection(id, "DONE");
  };

  const deleteTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/gsd-todos?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setTodos((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete todo:", err);
    }
  };

  const reorderTodo = async (movedId: string, targetId: string, before: boolean) => {
    // Direct local-state-only reorder - no API dependency
    setTodos(prev => {
      const next = prev.map(t => ({ ...t }));
      const moved = next.find(t => t.id === movedId);
      const target = next.find(t => t.id === targetId);
      if (!moved || !target || moved.section !== target.section) return prev;
      const section = moved.section;
      const sectionTodos = next.filter(t => t.section === section);
      sectionTodos.sort((a, b) => a.order - b.order);
      const movedIdx = sectionTodos.findIndex(t => t.id === movedId);
      const targetIdx = sectionTodos.findIndex(t => t.id === targetId);
      const insertIdx = before
        ? (movedIdx < targetIdx ? targetIdx - 1 : targetIdx)
        : (movedIdx < targetIdx ? targetIdx + 1 : targetIdx);
      const [movedItem] = sectionTodos.splice(movedIdx, 1);
      sectionTodos.splice(insertIdx, 0, movedItem);
      sectionTodos.forEach((t, i) => { t.order = i; });
      // Persist to API in background
      fetch('/api/gsd-todos?_=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movedId, targetId, before }),
      });
      return next;
    });
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch("/api/gsd-todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, text: editText.trim() }),
      });
      if (res.ok) {
        setTodos((prev) =>
          prev.map((t) => (t.id === editingId ? { ...t, text: editText.trim() } : t))
        );
        setEditingId(null);
      }
    } catch (err) {
      console.error("Failed to update todo:", err);
    }
  };

  const renderSection = (section: typeof SECTIONS[number]) => {
    const sectionTodos = todos
      .filter((t) => t.section === section)
      .sort((a, b) => a.order - b.order);
    const color = SECTION_COLORS[section];
    const currentIndex = SECTIONS.indexOf(section);
    const isTaxes = section === 'TAXES';

    return (
      <div key={section} className={`bg-white rounded-2xl p-4 shadow-sm${isTaxes ? ' border-l-4' : ''}`} style={isTaxes ? { borderLeftColor: '#0891b2' } : {}}>
        <div
          className="flex items-center justify-between mb-4 cursor-pointer active:bg-gray-50 rounded-lg p-1 -m-1"
          onClick={() => setAddingSection(addingSection === section ? null : section)}
        >
          <h2 className="text-sm font-extrabold uppercase tracking-widest" style={{ color }}>
            {section}
          </h2>
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
            {sectionTodos.length}
          </span>
        </div>

        {addingSection === section && (
          <div className="flex gap-2 mb-3 add-form">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add task..."
              className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") addTodo(section);
                if (e.key === "Escape") setAddingSection(null);
              }}
            />
            <button
              onClick={() => addTodo(section)}
              className="bg-orange-500 text-white font-bold px-4 py-2 rounded-lg text-sm active:bg-orange-600"
            >
              Add
            </button>
            <button
              onClick={() => setAddingSection(null)}
              className="bg-gray-200 text-gray-600 font-bold px-3 py-2 rounded-lg text-sm active:bg-gray-300"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-2">
          {sectionTodos.length === 0 && (
            <p className="text-gray-400 text-xs text-center py-4">Nothing here</p>
          )}
          {sectionTodos.map((todo) => (
            <div
              key={todo.id}
              data-id={todo.id}
              className={`todo-item bg-gray-50 rounded-xl p-3 border border-gray-100 relative group`}
            >
              {editingId === todo.id ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full border-2 border-orange-400 rounded-lg px-2 py-1 text-sm"
                  autoFocus
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <span
                  className="text-sm text-gray-800 block"
                  style={{ paddingRight: '100px' }}
                  onClick={() => startEdit(todo.id, todo.text)}
                >
                  {todo.text}
                </span>
              )}

              {pickerTodoId === todo.id && (
                <div className="section-picker absolute bottom-full right-0 bg-white rounded-xl shadow-lg z-50 mb-2 min-w-28 overflow-hidden">
                  {SECTIONS.map((sec, i) => {
                    const label = sec.charAt(0) + sec.slice(1).toLowerCase();
                    const isCurrent = i === currentIndex;
                    return (
                      <div
                        key={sec}
                        className="px-4 py-3 font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        style={{ color: SECTION_COLORS[sec] }}
                        onClick={() => moveToSection(todo.id, sec)}
                      >
                        {label}{isCurrent ? ' ✓' : ''}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="todo-actions absolute top-1 right-1 flex gap-0.5 transition-opacity">
                {currentIndex > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSection(todo.id, "left"); }}
                    className="bg-gray-200 text-gray-600 text-xs font-bold px-1.5 py-1 rounded"
                  >
                    ←
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setPickerTodoId(pickerTodoId === todo.id ? null : todo.id); }}
                  className="bg-gray-200 text-gray-600 text-xs font-bold px-1.5 py-1 rounded"
                >
                  →
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveToDone(todo.id); }}
                  className="bg-green-100 text-green-600 text-xs font-bold px-1.5 py-1 rounded"
                >
                  ✓
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
                  className="bg-red-100 text-red-500 text-xs font-bold px-1.5 py-1 rounded"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-white shadow-sm px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #e63946, #f4845f)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            GSD
          </h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Get Shit Done</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          SECTIONS.map((section) => renderSection(section))
        )}
      </div>

      <style>{`
        .dragging {
          position: fixed !important;
          z-index: 999 !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.25) !important;
          opacity: 0.95 !important;
          transform: scale(1.02) !important;
          pointer-events: none !important;
        }
        .holding {
          background: #fee2e2 !important;
          border-color: #e63946 !important;
        }
        .drag-over-top::before {
          content: '';
          position: absolute;
          top: -6px;
          left: 0;
          right: 0;
          height: 3px;
          background: #e63946;
          border-radius: 2px;
        }
        .drag-over-bottom::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 0;
          right: 0;
          height: 3px;
          background: #e63946;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}