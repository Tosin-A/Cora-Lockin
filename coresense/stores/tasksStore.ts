/**
 * Tasks Store (Zustand)
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
} from '../utils/api';
import type { Task, CreateTaskInput } from '../types';

interface TasksState {
  tasks: Task[];
  groupedTasks: { [date: string]: Task[] };
  isLoading: boolean;
  fetchTasks: (userId: string) => Promise<void>;
  createTask: (userId: string, task: CreateTaskInput) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  groupTasksByDate: () => void;
}

const STORAGE_KEY = '@coresense/tasks';

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  groupedTasks: {},
  isLoading: false,

  groupTasksByDate: () => {
    const { tasks } = get();
    const grouped: { [date: string]: Task[] } = {
      today: [],
      tomorrow: [],
      upcoming: [],
      completed: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    tasks.forEach((task) => {
      if (task.status === 'completed') {
        grouped.completed.push(task);
        return;
      }

      if (!task.due_date) {
        grouped.upcoming.push(task);
        return;
      }

      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate.getTime() === today.getTime()) {
        grouped.today.push(task);
      } else if (dueDate.getTime() === tomorrow.getTime()) {
        grouped.tomorrow.push(task);
      } else if (dueDate > tomorrow) {
        grouped.upcoming.push(task);
      } else {
        grouped.today.push(task); // Overdue tasks go to today
      }
    });

    set({ groupedTasks: grouped });
  },

  fetchTasks: async (userId: string) => {
    set({ isLoading: true });
    try {
      // Try to load from cache first
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const cachedTasks = JSON.parse(cached) as Task[];
        set({ tasks: cachedTasks });
        get().groupTasksByDate();
      }

      const { data, error } = await fetchTasks(userId);
      if (error) throw error;

      set({ tasks: data || [], isLoading: false });
      get().groupTasksByDate();

      // Cache tasks
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data || []));
    } catch (error) {
      console.error('Fetch tasks error:', error);
      set({ isLoading: false });
    }
  },

  createTask: async (userId: string, taskInput: CreateTaskInput) => {
    try {
      const { data, error } = await createTask(userId, taskInput);
      if (error) throw error;

      const newTasks = [...get().tasks, data!];
      set({ tasks: newTasks });
      get().groupTasksByDate();

      // Update cache
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
    } catch (error) {
      console.error('Create task error:', error);
      throw error;
    }
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    try {
      const { data, error } = await updateTask(id, updates);
      if (error) throw error;

      const updatedTasks = get().tasks.map((t) => (t.id === id ? data! : t));
      set({ tasks: updatedTasks });
      get().groupTasksByDate();

      // Update cache
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Update task error:', error);
      throw error;
    }
  },

  completeTask: async (id: string) => {
    try {
      const { data, error } = await completeTask(id);
      if (error) throw error;

      const updatedTasks = get().tasks.map((t) => (t.id === id ? data! : t));
      set({ tasks: updatedTasks });
      get().groupTasksByDate();

      // Update cache
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Complete task error:', error);
      throw error;
    }
  },

  deleteTask: async (id: string) => {
    try {
      const { error } = await deleteTask(id);
      if (error) throw error;

      const updatedTasks = get().tasks.filter((t) => t.id !== id);
      set({ tasks: updatedTasks });
      get().groupTasksByDate();

      // Update cache
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Delete task error:', error);
      throw error;
    }
  },
}));





