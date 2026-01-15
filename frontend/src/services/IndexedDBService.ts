/**
 * IndexedDBService - Local caching layer using IndexedDB
 * 
 * Provides a wrapper around IndexedDB for storing notes, settings, and calendar index
 * locally in the browser for offline support and performance.
 * 
 * Requirements: 9.1
 */

import type { NoteEntry, UserSettings, CalendarIndex, ListOptions } from '../types';

export class IndexedDBService {
  private static readonly DB_NAME = 'journal-notes';
  private static readonly DB_VERSION = 1;
  private static readonly NOTES_STORE = 'notes';
  private static readonly SETTINGS_STORE = 'settings';
  private static readonly CALENDAR_INDEX_STORE = 'calendar-index';

  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database
   * Creates object stores if they don't exist
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IndexedDBService.DB_NAME, IndexedDBService.DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create notes store with indexes
        if (!db.objectStoreNames.contains(IndexedDBService.NOTES_STORE)) {
          const notesStore = db.createObjectStore(IndexedDBService.NOTES_STORE, { keyPath: 'id' });
          notesStore.createIndex('createdAt', 'createdAt', { unique: false });
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          notesStore.createIndex('isTask', 'isTask', { unique: false });
          notesStore.createIndex('dividerPosition', 'dividerPosition', { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(IndexedDBService.SETTINGS_STORE)) {
          db.createObjectStore(IndexedDBService.SETTINGS_STORE, { keyPath: 'userId' });
        }

        // Create calendar index store
        if (!db.objectStoreNames.contains(IndexedDBService.CALENDAR_INDEX_STORE)) {
          db.createObjectStore(IndexedDBService.CALENDAR_INDEX_STORE, { keyPath: 'date' });
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  /**
   * Save a note to IndexedDB
   * @param note - Note entry to save
   */
  async saveNote(note: NoteEntry): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.NOTES_STORE], 'readwrite');
      const store = transaction.objectStore(IndexedDBService.NOTES_STORE);

      // Convert dates to ISO strings for storage
      const noteData = this.serializeNote(note);
      const request = store.put(noteData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save note: ${request.error?.message}`));
    });
  }

  /**
   * Get a note by ID from IndexedDB
   * @param id - Note ID
   * @returns Note entry or null if not found
   */
  async getNote(id: string): Promise<NoteEntry | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.NOTES_STORE], 'readonly');
      const store = transaction.objectStore(IndexedDBService.NOTES_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(this.deserializeNote(result));
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(new Error(`Failed to get note: ${request.error?.message}`));
    });
  }

  /**
   * List notes with optional filtering
   * @param options - List options for filtering
   * @returns Array of note entries
   */
  async listNotes(options?: ListOptions): Promise<NoteEntry[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.NOTES_STORE], 'readonly');
      const store = transaction.objectStore(IndexedDBService.NOTES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        let notes = request.result.map((note: any) => this.deserializeNote(note));

        // Apply filters
        if (options) {
          if (options.isTask !== undefined) {
            notes = notes.filter(note => note.isTask === options.isTask);
          }

          if (options.startDate) {
            notes = notes.filter(note => note.createdAt >= options.startDate!);
          }

          if (options.endDate) {
            notes = notes.filter(note => note.createdAt <= options.endDate!);
          }

          if (options.tags && options.tags.length > 0) {
            notes = notes.filter(note => 
              note.taskMetadata?.tags.some(tag => options.tags!.includes(tag))
            );
          }

          if (options.completed !== undefined) {
            notes = notes.filter(note => 
              note.taskMetadata?.completed === options.completed
            );
          }

          // Sort by creation date (chronological)
          notes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

          // Apply pagination
          if (options.offset !== undefined) {
            notes = notes.slice(options.offset);
          }

          if (options.limit !== undefined) {
            notes = notes.slice(0, options.limit);
          }
        } else {
          // Default sort by creation date
          notes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }

        resolve(notes);
      };

      request.onerror = () => reject(new Error(`Failed to list notes: ${request.error?.message}`));
    });
  }

  /**
   * Delete a note from IndexedDB
   * @param id - Note ID
   * @returns True if deleted, false if not found
   */
  async deleteNote(id: string): Promise<boolean> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.NOTES_STORE], 'readwrite');
      const store = transaction.objectStore(IndexedDBService.NOTES_STORE);

      // Check if note exists first
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          resolve(false);
          return;
        }

        const deleteRequest = store.delete(id);
        deleteRequest.onsuccess = () => resolve(true);
        deleteRequest.onerror = () => reject(new Error(`Failed to delete note: ${deleteRequest.error?.message}`));
      };

      getRequest.onerror = () => reject(new Error(`Failed to check note existence: ${getRequest.error?.message}`));
    });
  }

  /**
   * Save multiple notes in a batch operation
   * @param notes - Array of note entries
   */
  async saveNotes(notes: NoteEntry[]): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.NOTES_STORE], 'readwrite');
      const store = transaction.objectStore(IndexedDBService.NOTES_STORE);

      let completed = 0;
      const total = notes.length;

      if (total === 0) {
        resolve();
        return;
      }

      notes.forEach(note => {
        const noteData = this.serializeNote(note);
        const request = store.put(noteData);

        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to save note in batch: ${request.error?.message}`));
        };
      });
    });
  }

  /**
   * Get notes by date range
   * @param start - Start date
   * @param end - End date
   * @returns Array of note entries
   */
  async getNotesByDateRange(start: Date, end: Date): Promise<NoteEntry[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.NOTES_STORE], 'readonly');
      const store = transaction.objectStore(IndexedDBService.NOTES_STORE);
      const index = store.index('createdAt');

      const range = IDBKeyRange.bound(start.toISOString(), end.toISOString());
      const request = index.getAll(range);

      request.onsuccess = () => {
        const notes = request.result.map((note: any) => this.deserializeNote(note));
        resolve(notes);
      };

      request.onerror = () => reject(new Error(`Failed to get notes by date range: ${request.error?.message}`));
    });
  }

  /**
   * Save user settings
   * @param settings - User settings
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(IndexedDBService.SETTINGS_STORE);
      const request = store.put(settings);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save settings: ${request.error?.message}`));
    });
  }

  /**
   * Get user settings
   * @param userId - User ID
   * @returns User settings or null if not found
   */
  async getSettings(userId: string): Promise<UserSettings | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(IndexedDBService.SETTINGS_STORE);
      const request = store.get(userId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get settings: ${request.error?.message}`));
    });
  }

  /**
   * Save calendar index
   * @param date - ISO date string (YYYY-MM-DD)
   * @param index - Calendar index data
   */
  async saveCalendarIndex(date: string, index: { created: string[]; updated: string[] }): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.CALENDAR_INDEX_STORE], 'readwrite');
      const store = transaction.objectStore(IndexedDBService.CALENDAR_INDEX_STORE);
      const request = store.put({ date, ...index });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save calendar index: ${request.error?.message}`));
    });
  }

  /**
   * Get calendar index for a date
   * @param date - ISO date string (YYYY-MM-DD)
   * @returns Calendar index data or null if not found
   */
  async getCalendarIndex(date: string): Promise<{ created: string[]; updated: string[] } | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.CALENDAR_INDEX_STORE], 'readonly');
      const store = transaction.objectStore(IndexedDBService.CALENDAR_INDEX_STORE);
      const request = store.get(date);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({ created: result.created, updated: result.updated });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(new Error(`Failed to get calendar index: ${request.error?.message}`));
    });
  }

  /**
   * Get all calendar index data
   * @returns Complete calendar index
   */
  async getAllCalendarIndex(): Promise<CalendarIndex> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([IndexedDBService.CALENDAR_INDEX_STORE], 'readonly');
      const store = transaction.objectStore(IndexedDBService.CALENDAR_INDEX_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const index: CalendarIndex = {};
        request.result.forEach((item: any) => {
          index[item.date] = {
            created: item.created,
            updated: item.updated
          };
        });
        resolve(index);
      };

      request.onerror = () => reject(new Error(`Failed to get all calendar index: ${request.error?.message}`));
    });
  }

  /**
   * Clear all data from IndexedDB
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        [IndexedDBService.NOTES_STORE, IndexedDBService.SETTINGS_STORE, IndexedDBService.CALENDAR_INDEX_STORE],
        'readwrite'
      );

      const notesStore = transaction.objectStore(IndexedDBService.NOTES_STORE);
      const settingsStore = transaction.objectStore(IndexedDBService.SETTINGS_STORE);
      const calendarStore = transaction.objectStore(IndexedDBService.CALENDAR_INDEX_STORE);

      notesStore.clear();
      settingsStore.clear();
      calendarStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Failed to clear data: ${transaction.error?.message}`));
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Serialize a note for storage (convert Dates to ISO strings)
   */
  private serializeNote(note: NoteEntry): any {
    return {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      taskMetadata: note.taskMetadata ? {
        ...note.taskMetadata,
        dueDate: note.taskMetadata.dueDate?.toISOString(),
        completedAt: note.taskMetadata.completedAt?.toISOString()
      } : undefined
    };
  }

  /**
   * Deserialize a note from storage (convert ISO strings to Dates)
   */
  private deserializeNote(data: any): NoteEntry {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      taskMetadata: data.taskMetadata ? {
        ...data.taskMetadata,
        dueDate: data.taskMetadata.dueDate ? new Date(data.taskMetadata.dueDate) : undefined,
        completedAt: data.taskMetadata.completedAt ? new Date(data.taskMetadata.completedAt) : undefined
      } : undefined
    };
  }
}
