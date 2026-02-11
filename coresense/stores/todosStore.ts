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
  loading: boolean;
  error: string | null;

  // Actions
  fetchTodos: () => Promise<void>;
  createTodo: (input: CreateTodoInput) => Promise<Todo | null>;
  createCoachTodo: (input: CreateCoachTodoInput) => Promise<Todo | null>;
  updateTodoStatus: (todoId: string, status: Todo['status']) => Promise<boolean>;
  updateTodo: (todoId: string, updates: Partial<CreateTodoInput>) => Promise<boolean>;
  deleteTodo: (todoId: string) => Promise<boolean>;
  clearError: () => void;

  // Computed helpers
  getPendingTodos: () => Todo[];
  getCompletedTodos: () => Todo[];
  getCoachTodos: () => Todo[];
  getUserTodos: () => Todo[];
}

export const useTodosStore = create<TodosStore>()(
  persist(
    (set, get) => ({
      // Initial state
      todos: [],
      loading: false,
      error: null,

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

      createTodo: async (input: CreateTodoInput) => {
        set({ loading: true, error: null });

        try {
          const { data, error } = await coresenseApi.createTodo(input);

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

        // Optimistic update - immediately update local state for responsive UI
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
            // Revert optimistic update on error
            set({ todos: previousTodos });
            throw new Error(error);
          }

          if (data) {
            // Update with server response to ensure consistency
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
            // Remove from local state (soft delete sets status to cancelled)
            set((state) => ({
              todos: state.todos.filter((todo) => todo.id !== todoId),
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

      clearError: () => {
        set({ error: null });
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
    }),
    {
      name: 'todos-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        todos: state.todos.slice(0, 50), // Keep last 50 todos
      }),
    }
  )
);
