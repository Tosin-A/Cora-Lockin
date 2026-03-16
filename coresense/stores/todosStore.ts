/**
 * Todos Store - State management for shared to-do list
 * Manages coach-shared to-do items between user and AI coach
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { coresenseApi } from '../utils/coresenseApi';
import type { Todo, CreateTodoInput, CreateCoachTodoInput } from '../types/todos';

interface TodosStore {
  // State
  todos: Todo[];
  recurringTodos: Todo[];
  loading: boolean;
  error: string | null;
  streakCelebration: { streak: number; title: string } | null;

  // Actions
  fetchTodos: () => Promise<void>;
  fetchRecurringToday: () => Promise<void>;
  toggleRecurringTodo: (todoId: string) => Promise<void>;
  createTodo: (input: CreateTodoInput) => Promise<Todo | null>;
  createCoachTodo: (input: CreateCoachTodoInput) => Promise<Todo | null>;
  updateTodoStatus: (todoId: string, status: Todo['status']) => Promise<boolean>;
  updateTodo: (todoId: string, updates: Partial<CreateTodoInput>) => Promise<boolean>;
  deleteTodo: (todoId: string) => Promise<boolean>;
  archiveRecurringTodo: (todoId: string) => Promise<boolean>;
  reorderRecurringTodos: (taskIds: string[]) => Promise<void>;
  clearError: () => void;
  dismissStreakCelebration: () => void;

  // Computed helpers
  getPendingTodos: () => Todo[];
  getCompletedTodos: () => Todo[];
  getCoachTodos: () => Todo[];
  getUserTodos: () => Todo[];
  getRecurringIncomplete: () => Todo[];
  getRecurringComplete: () => Todo[];
}

export const useTodosStore = create<TodosStore>()(
  persist(
    (set, get) => ({
      // Initial state
      todos: [],
      recurringTodos: [],
      loading: false,
      error: null,
      streakCelebration: null,

      // Actions
      fetchTodos: async () => {
        set({ loading: true, error: null });

        try {
          const { data, error } = await coresenseApi.getTodos();

          if (error) {
            throw new Error(error);
          }

          if (data) {
            set({ todos: data });
          }
        } catch (error: any) {
          console.error('Failed to fetch todos:', error);
          set({ error: error.message || 'Failed to load todos' });
        } finally {
          set({ loading: false });
        }
      },

      fetchRecurringToday: async () => {
        set({ error: null });
        try {
          const { data, error } = await coresenseApi.getRecurringTodosToday();
          if (error) throw new Error(error);
          if (data) set({ recurringTodos: data });
        } catch (error: any) {
          console.error('Failed to fetch recurring todos:', error);
          set({ error: error.message || 'Failed to load recurring todos' });
        }
      },

      toggleRecurringTodo: async (todoId: string) => {
        const previousRecurring = get().recurringTodos;

        // Optimistic update: flip completed_today immediately
        set((state) => ({
          recurringTodos: state.recurringTodos.map((t) =>
            t.id === todoId ? { ...t, completed_today: !t.completed_today } : t
          ),
        }));

        try {
          const { data, error } = await coresenseApi.toggleRecurringTodo(todoId);
          if (error) {
            set({ recurringTodos: previousRecurring });
            throw new Error(error);
          }
          if (data) {
            set((state) => ({
              recurringTodos: state.recurringTodos.map((t) =>
                t.id === todoId ? { ...t, ...data } : t
              ),
            }));

            // Show streak celebration if milestone reached
            if (data.streak_milestone) {
              set({ streakCelebration: { streak: data.streak_milestone, title: data.title } });
            }
          }
        } catch (error: any) {
          console.error('Failed to toggle recurring todo:', error);
          set({ error: error.message || 'Failed to toggle recurring todo' });
        }
      },

      createTodo: async (input: CreateTodoInput) => {
        set({ loading: true, error: null });

        try {
          const { data, error } = await coresenseApi.createTodo(input);

          if (error) {
            throw new Error(error);
          }

          if (data) {
            if (input.is_recurring) {
              // Add to recurring list as well
              set((state) => ({
                recurringTodos: [...state.recurringTodos, { ...data, completed_today: false }],
              }));
            }
            set((state) => ({
              todos: [data, ...state.todos],
            }));
            return data;
          }

          return null;
        } catch (error: any) {
          console.error('Failed to create todo:', error);
          set({ error: error.message || 'Failed to create todo' });
          return null;
        } finally {
          set({ loading: false });
        }
      },

      createCoachTodo: async (input: CreateCoachTodoInput) => {
        set({ loading: true, error: null });

        try {
          const { data, error } = await coresenseApi.createCoachTodo(input);

          if (error) {
            throw new Error(error);
          }

          if (data) {
            set((state) => ({
              todos: [data, ...state.todos],
            }));
            return data;
          }

          return null;
        } catch (error: any) {
          console.error('Failed to create coach todo:', error);
          set({ error: error.message || 'Failed to create coach todo' });
          return null;
        } finally {
          set({ loading: false });
        }
      },

      updateTodoStatus: async (todoId: string, status: Todo['status']) => {
        set({ error: null });

        // Optimistic update
        const previousTodos = get().todos;
        const now = new Date().toISOString();
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === todoId
              ? {
                  ...todo,
                  status,
                  completed_at: status === 'completed' ? now : undefined,
                  updated_at: now,
                }
              : todo
          ),
        }));

        try {
          const { data, error } = await coresenseApi.updateTodoStatus(todoId, status);

          if (error) {
            set({ todos: previousTodos });
            throw new Error(error);
          }

          if (data) {
            set((state) => ({
              todos: state.todos.map((todo) =>
                todo.id === todoId ? { ...todo, ...data } : todo
              ),
            }));
            return true;
          }

          return false;
        } catch (error: any) {
          console.error('Failed to update todo status:', error);
          set({ error: error.message || 'Failed to update todo status' });
          return false;
        }
      },

      updateTodo: async (todoId: string, updates: Partial<CreateTodoInput>) => {
        set({ error: null });

        try {
          const { data, error } = await coresenseApi.updateTodo(todoId, updates);

          if (error) {
            throw new Error(error);
          }

          if (data) {
            set((state) => ({
              todos: state.todos.map((todo) =>
                todo.id === todoId ? { ...todo, ...data } : todo
              ),
            }));
            return true;
          }

          return false;
        } catch (error: any) {
          console.error('Failed to update todo:', error);
          set({ error: error.message || 'Failed to update todo' });
          return false;
        }
      },

      deleteTodo: async (todoId: string) => {
        set({ error: null });

        try {
          const { success, error } = await coresenseApi.deleteTodo(todoId);

          if (error) {
            throw new Error(error);
          }

          if (success) {
            set((state) => ({
              todos: state.todos.filter((todo) => todo.id !== todoId),
              recurringTodos: state.recurringTodos.filter((todo) => todo.id !== todoId),
            }));
            return true;
          }

          return false;
        } catch (error: any) {
          console.error('Failed to delete todo:', error);
          set({ error: error.message || 'Failed to delete todo' });
          return false;
        }
      },

      archiveRecurringTodo: async (todoId: string) => {
        set({ error: null });
        const previous = get().recurringTodos;

        // Optimistic remove
        set((state) => ({
          recurringTodos: state.recurringTodos.filter((t) => t.id !== todoId),
        }));

        try {
          const { success, error } = await coresenseApi.deleteTodo(todoId);
          if (error) {
            set({ recurringTodos: previous });
            throw new Error(error);
          }
          return success;
        } catch (error: any) {
          console.error('Failed to archive recurring todo:', error);
          set({ error: error.message || 'Failed to archive' });
          return false;
        }
      },

      reorderRecurringTodos: async (taskIds: string[]) => {
        // Optimistic reorder
        const reordered = taskIds
          .map((id) => get().recurringTodos.find((t) => t.id === id))
          .filter(Boolean) as Todo[];
        set({ recurringTodos: reordered });

        try {
          await coresenseApi.reorderRecurringTodos(taskIds);
        } catch (error: any) {
          console.error('Failed to reorder:', error);
          // Refetch on error
          get().fetchRecurringToday();
        }
      },

      clearError: () => {
        set({ error: null });
      },

      dismissStreakCelebration: () => {
        set({ streakCelebration: null });
      },

      // Computed helpers
      getPendingTodos: () => {
        const { todos } = get();
        return todos.filter((todo) => todo.status === 'pending' || todo.status === 'in_progress');
      },

      getCompletedTodos: () => {
        const { todos } = get();
        return todos.filter((todo) => todo.status === 'completed');
      },

      getCoachTodos: () => {
        const { todos } = get();
        return todos.filter((todo) => todo.created_by === 'coach');
      },

      getUserTodos: () => {
        const { todos } = get();
        return todos.filter((todo) => todo.created_by === 'user');
      },

      getRecurringIncomplete: () => {
        return get().recurringTodos.filter((t) => !t.completed_today);
      },

      getRecurringComplete: () => {
        return get().recurringTodos.filter((t) => t.completed_today);
      },
    }),
    {
      name: 'todos-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        todos: state.todos.slice(0, 50),
        recurringTodos: state.recurringTodos.slice(0, 100),
      }),
    }
  )
);
