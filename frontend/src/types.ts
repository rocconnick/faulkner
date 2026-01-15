/**
 * Core data models for the Journal Notes application
 * Based on the design document specifications
 */

// Note Entry - Core data structure for journal entries
export interface NoteEntry {
  id: string;                    // UUID
  title: string;                 // User-provided title
  content: string;               // Markdown content
  createdAt: Date;
  updatedAt: Date;
  dividerPosition: number;       // Order in stream
  isTask: boolean;
  taskMetadata?: TaskMetadata;
}

// Task Metadata - Additional data for notes marked as tasks
export interface TaskMetadata {
  priority: number;              // Drag-drop order (0 = highest)
  tags: string[];                // Custom tags
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;
}

// User Settings - Application configuration and preferences
export interface UserSettings {
  userId: string;
  passwordHash: string;          // For authentication
  encryptionSalt: string;        // For key derivation
  theme: 'light' | 'dark';       // Future: dark mode
  keyboardShortcuts: KeyboardShortcutMap;
}

// Keyboard Shortcuts - Configurable keyboard shortcuts
export interface KeyboardShortcutMap {
  addDivider: string;            // Default: Cmd+Enter
  createTask: string;            // Default: Cmd+T
  openSearch: string;            // Default: Cmd+K
  openCalendar: string;          // Default: Cmd+D
  undo: string;                  // Default: Cmd+Z
  redo: string;                  // Default: Cmd+Shift+Z
}

// Calendar Index - For organizing notes by date
export interface CalendarIndex {
  [date: string]: {
    created: string[];  // Note IDs created on this date
    updated: string[];  // Note IDs updated on this date
  };
}

// List Options - For querying notes with filters
export interface ListOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  isTask?: boolean;
  tags?: string[];
  completed?: boolean;
}

// Storage Backend Interface - Unified interface for data persistence
export interface StorageBackend {
  // CRUD operations
  saveNote(note: NoteEntry): Promise<void>;
  getNote(id: string): Promise<NoteEntry>;
  listNotes(options?: ListOptions): Promise<NoteEntry[]>;
  deleteNote(id: string): Promise<void>;
  
  // Batch operations
  saveNotes(notes: NoteEntry[]): Promise<void>;
  getNotesByDateRange(start: Date, end: Date): Promise<NoteEntry[]>;
}

// Validation schemas and type guards

/**
 * Type guard to check if an object is a valid NoteEntry
 */
export function isNoteEntry(obj: any): obj is NoteEntry {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.content === 'string' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date &&
    typeof obj.dividerPosition === 'number' &&
    typeof obj.isTask === 'boolean' &&
    (obj.taskMetadata === undefined || obj.taskMetadata === null || isTaskMetadata(obj.taskMetadata))
  );
}

/**
 * Type guard to check if an object is a valid TaskMetadata
 */
export function isTaskMetadata(obj: any): obj is TaskMetadata {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.priority === 'number' &&
    Array.isArray(obj.tags) &&
    obj.tags.every((tag: any) => typeof tag === 'string') &&
    (obj.dueDate === undefined || obj.dueDate === null || obj.dueDate instanceof Date) &&
    typeof obj.completed === 'boolean' &&
    (obj.completedAt === undefined || obj.completedAt === null || obj.completedAt instanceof Date)
  );
}

/**
 * Type guard to check if an object is a valid UserSettings
 */
export function isUserSettings(obj: any): obj is UserSettings {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.userId === 'string' &&
    typeof obj.passwordHash === 'string' &&
    typeof obj.encryptionSalt === 'string' &&
    (obj.theme === 'light' || obj.theme === 'dark') &&
    isKeyboardShortcutMap(obj.keyboardShortcuts)
  );
}

/**
 * Type guard to check if an object is a valid KeyboardShortcutMap
 */
export function isKeyboardShortcutMap(obj: any): obj is KeyboardShortcutMap {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.addDivider === 'string' &&
    typeof obj.createTask === 'string' &&
    typeof obj.openSearch === 'string' &&
    typeof obj.openCalendar === 'string' &&
    typeof obj.undo === 'string' &&
    typeof obj.redo === 'string'
  );
}

/**
 * Validation function for NoteEntry data
 */
export function validateNoteEntry(obj: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    errors.push('NoteEntry must be an object');
    return { valid: false, errors };
  }
  
  if (!obj.id || typeof obj.id !== 'string') {
    errors.push('id must be a non-empty string');
  }
  
  if (typeof obj.title !== 'string') {
    errors.push('title must be a string');
  }
  
  if (typeof obj.content !== 'string') {
    errors.push('content must be a string');
  }
  
  if (!(obj.createdAt instanceof Date) && !isValidDateString(obj.createdAt)) {
    errors.push('createdAt must be a valid Date');
  }
  
  if (!(obj.updatedAt instanceof Date) && !isValidDateString(obj.updatedAt)) {
    errors.push('updatedAt must be a valid Date');
  }
  
  if (typeof obj.dividerPosition !== 'number' || obj.dividerPosition < 0) {
    errors.push('dividerPosition must be a non-negative number');
  }
  
  if (typeof obj.isTask !== 'boolean') {
    errors.push('isTask must be a boolean');
  }
  
  if (obj.taskMetadata !== undefined) {
    const taskValidation = validateTaskMetadata(obj.taskMetadata);
    if (!taskValidation.valid) {
      errors.push(...taskValidation.errors.map(err => `taskMetadata.${err}`));
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validation function for TaskMetadata data
 */
export function validateTaskMetadata(obj: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    errors.push('TaskMetadata must be an object');
    return { valid: false, errors };
  }
  
  if (typeof obj.priority !== 'number' || obj.priority < 0) {
    errors.push('priority must be a non-negative number');
  }
  
  if (!Array.isArray(obj.tags)) {
    errors.push('tags must be an array');
  } else if (!obj.tags.every((tag: any) => typeof tag === 'string')) {
    errors.push('all tags must be strings');
  }
  
  if (obj.dueDate !== undefined && obj.dueDate !== null && !(obj.dueDate instanceof Date) && !isValidDateString(obj.dueDate)) {
    errors.push('dueDate must be a valid Date or undefined');
  }
  
  if (typeof obj.completed !== 'boolean') {
    errors.push('completed must be a boolean');
  }
  
  if (obj.completedAt !== undefined && obj.completedAt !== null && !(obj.completedAt instanceof Date) && !isValidDateString(obj.completedAt)) {
    errors.push('completedAt must be a valid Date or undefined');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Helper function to check if a string represents a valid date
 */
function isValidDateString(dateString: any): boolean {
  if (typeof dateString !== 'string') return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Factory function to create a new NoteEntry with default values
 */
export function createNoteEntry(partial: Partial<NoteEntry> & { id: string }): NoteEntry {
  const now = new Date();
  const result: NoteEntry = {
    id: partial.id,
    title: partial.title ?? '',
    content: partial.content ?? '',
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    dividerPosition: partial.dividerPosition ?? 0,
    isTask: partial.isTask ?? false,
    taskMetadata: partial.taskMetadata
  };
  return result;
}

/**
 * Factory function to create a new TaskMetadata with default values
 */
export function createTaskMetadata(partial: Partial<TaskMetadata> = {}): TaskMetadata {
  return {
    priority: partial.priority ?? 0,
    tags: partial.tags ?? [],
    completed: partial.completed ?? false,
    dueDate: partial.dueDate,
    completedAt: partial.completedAt
  };
}

/**
 * Factory function to create default UserSettings
 */
export function createDefaultUserSettings(userId: string): UserSettings {
  return {
    userId,
    passwordHash: '',
    encryptionSalt: '',
    theme: 'light',
    keyboardShortcuts: {
      addDivider: 'Cmd+Enter',
      createTask: 'Cmd+T',
      openSearch: 'Cmd+K',
      openCalendar: 'Cmd+D',
      undo: 'Cmd+Z',
      redo: 'Cmd+Shift+Z'
    }
  };
}