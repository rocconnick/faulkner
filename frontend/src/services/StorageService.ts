/**
 * StorageService - Unified storage layer combining IndexedDB and API client
 * 
 * Provides a single interface for data operations with local caching and
 * backend synchronization. Implements offline-first architecture.
 * 
 * Requirements: 9.1, 7.2
 */

import type { NoteEntry, UserSettings, CalendarIndex, ListOptions } from '../types';
import { IndexedDBService } from './IndexedDBService';
import { ApiClient } from './ApiClient';

export class StorageService {
  private indexedDB: IndexedDBService;
  private apiClient: ApiClient;
  private isOnline: boolean = navigator.onLine;

  constructor(apiClient?: ApiClient) {
    this.indexedDB = new IndexedDBService();
    this.apiClient = apiClient || new ApiClient();

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    await this.indexedDB.initialize();
  }

  /**
   * Check if the service is online
   */
  isServiceOnline(): boolean {
    return this.isOnline && this.apiClient.isAuthenticated();
  }

  /**
   * Login to the backend
   */
  async login(password: string): Promise<void> {
    const response = await this.apiClient.login(password);
    // Store session token in localStorage for persistence
    localStorage.setItem('session_token', response.session_token);
  }

  /**
   * Setup initial password
   */
  async setupPassword(password: string): Promise<void> {
    const response = await this.apiClient.setupPassword(password);
    // Store session token in localStorage for persistence
    localStorage.setItem('session_token', response.session_token);
  }

  /**
   * Logout from the backend
   */
  async logout(): Promise<void> {
    await this.apiClient.logout();
    localStorage.removeItem('session_token');
    await this.indexedDB.clearAll();
  }

  /**
   * Restore session from localStorage
   */
  restoreSession(): boolean {
    const token = localStorage.getItem('session_token');
    if (token) {
      this.apiClient.setSessionToken(token);
      return true;
    }
    return false;
  }

  /**
   * Save a note (local + remote if online)
   */
  async saveNote(note: NoteEntry): Promise<void> {
    // Always save to local cache first
    await this.indexedDB.saveNote(note);

    // Try to sync to backend if online
    if (this.isServiceOnline()) {
      try {
        // Check if note exists on backend
        const existingNote = await this.apiClient.getNote(note.id);
        
        if (existingNote) {
          // Update existing note
          await this.apiClient.updateNote(note.id, note);
        } else {
          // Create new note
          await this.apiClient.createNote(note);
        }
      } catch (error) {
        console.warn('Failed to sync note to backend:', error);
        // Note is still saved locally, will sync later
      }
    }
  }

  /**
   * Get a note by ID (local cache first, then remote)
   */
  async getNote(id: string): Promise<NoteEntry | null> {
    // Try local cache first
    const localNote = await this.indexedDB.getNote(id);
    if (localNote) {
      return localNote;
    }

    // If not in cache and online, try backend
    if (this.isServiceOnline()) {
      try {
        const remoteNote = await this.apiClient.getNote(id);
        if (remoteNote) {
          // Cache it locally
          await this.indexedDB.saveNote(remoteNote);
          return remoteNote;
        }
      } catch (error) {
        console.warn('Failed to fetch note from backend:', error);
      }
    }

    return null;
  }

  /**
   * List notes (local cache first, sync from remote if online)
   */
  async listNotes(options?: ListOptions): Promise<NoteEntry[]> {
    // If online, sync from backend first
    if (this.isServiceOnline()) {
      try {
        const remoteNotes = await this.apiClient.listNotes(options);
        // Update local cache
        await this.indexedDB.saveNotes(remoteNotes);
        return remoteNotes;
      } catch (error) {
        console.warn('Failed to fetch notes from backend, using local cache:', error);
      }
    }

    // Return from local cache
    return await this.indexedDB.listNotes(options);
  }

  /**
   * Delete a note (local + remote if online)
   */
  async deleteNote(id: string): Promise<boolean> {
    // Delete from local cache
    const localDeleted = await this.indexedDB.deleteNote(id);

    // Try to delete from backend if online
    if (this.isServiceOnline()) {
      try {
        await this.apiClient.deleteNote(id);
      } catch (error) {
        console.warn('Failed to delete note from backend:', error);
      }
    }

    return localDeleted;
  }

  /**
   * Save multiple notes in batch
   */
  async saveNotes(notes: NoteEntry[]): Promise<void> {
    // Save to local cache
    await this.indexedDB.saveNotes(notes);

    // Sync to backend if online
    if (this.isServiceOnline()) {
      for (const note of notes) {
        try {
          const existingNote = await this.apiClient.getNote(note.id);
          if (existingNote) {
            await this.apiClient.updateNote(note.id, note);
          } else {
            await this.apiClient.createNote(note);
          }
        } catch (error) {
          console.warn(`Failed to sync note ${note.id} to backend:`, error);
        }
      }
    }
  }

  /**
   * Get notes by date range
   */
  async getNotesByDateRange(start: Date, end: Date): Promise<NoteEntry[]> {
    // If online, sync from backend first
    if (this.isServiceOnline()) {
      try {
        const remoteNotes = await this.apiClient.listNotes({ startDate: start, endDate: end });
        await this.indexedDB.saveNotes(remoteNotes);
        return remoteNotes;
      } catch (error) {
        console.warn('Failed to fetch notes by date range from backend:', error);
      }
    }

    // Return from local cache
    return await this.indexedDB.getNotesByDateRange(start, end);
  }

  /**
   * Save user settings
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    await this.indexedDB.saveSettings(settings);
  }

  /**
   * Get user settings
   */
  async getSettings(userId: string): Promise<UserSettings | null> {
    return await this.indexedDB.getSettings(userId);
  }

  /**
   * Save calendar index
   */
  async saveCalendarIndex(date: string, index: { created: string[]; updated: string[] }): Promise<void> {
    await this.indexedDB.saveCalendarIndex(date, index);
  }

  /**
   * Get calendar index for a date
   */
  async getCalendarIndex(date: string): Promise<{ created: string[]; updated: string[] } | null> {
    return await this.indexedDB.getCalendarIndex(date);
  }

  /**
   * Get all calendar index data
   */
  async getAllCalendarIndex(): Promise<CalendarIndex> {
    return await this.indexedDB.getAllCalendarIndex();
  }

  /**
   * Sync pending changes to backend (called when coming back online)
   */
  private async syncPendingChanges(): Promise<void> {
    if (!this.isServiceOnline()) {
      return;
    }

    try {
      // Get all local notes
      const localNotes = await this.indexedDB.listNotes();

      // Sync each note to backend
      for (const note of localNotes) {
        try {
          const remoteNote = await this.apiClient.getNote(note.id);
          
          if (remoteNote) {
            // Compare timestamps and sync newer version
            if (note.updatedAt > remoteNote.updatedAt) {
              await this.apiClient.updateNote(note.id, note);
            } else if (remoteNote.updatedAt > note.updatedAt) {
              await this.indexedDB.saveNote(remoteNote);
            }
          } else {
            // Note doesn't exist on backend, create it
            await this.apiClient.createNote(note);
          }
        } catch (error) {
          console.warn(`Failed to sync note ${note.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to sync pending changes:', error);
    }
  }

  /**
   * Check backend health
   */
  async checkHealth(): Promise<boolean> {
    return await this.apiClient.checkHealth();
  }

  /**
   * Close the storage service
   */
  close(): void {
    this.indexedDB.close();
  }
}
