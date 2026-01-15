/**
 * Property-based tests for data model validation
 * Feature: journal-notes, Property 11: Structured Data Format
 * Validates: Requirements 9.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  NoteEntry,
  TaskMetadata,
  UserSettings,
  KeyboardShortcutMap,
  isNoteEntry,
  isTaskMetadata,
  isUserSettings,
  isKeyboardShortcutMap,
  validateNoteEntry,
  validateTaskMetadata,
  createNoteEntry,
  createTaskMetadata,
  createDefaultUserSettings
} from './types';

// Arbitraries (generators) for property-based testing

const dateArbitrary = (): fc.Arbitrary<Date> =>
  fc.integer({ min: 0, max: Date.now() }).map(timestamp => new Date(timestamp));

const taskMetadataArbitrary = (): fc.Arbitrary<TaskMetadata> =>
  fc.record({
    priority: fc.nat(),
    tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
    dueDate: fc.option(dateArbitrary(), { nil: undefined }),
    completed: fc.boolean(),
    completedAt: fc.option(dateArbitrary(), { nil: undefined })
  });

const noteEntryArbitrary = (): fc.Arbitrary<NoteEntry> =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ maxLength: 200 }),
    content: fc.string({ maxLength: 5000 }),
    createdAt: dateArbitrary(),
    updatedAt: dateArbitrary(),
    dividerPosition: fc.nat(),
    isTask: fc.boolean(),
    taskMetadata: fc.option(taskMetadataArbitrary(), { nil: undefined })
  });

const keyboardShortcutMapArbitrary = (): fc.Arbitrary<KeyboardShortcutMap> =>
  fc.record({
    addDivider: fc.string({ minLength: 1, maxLength: 20 }),
    createTask: fc.string({ minLength: 1, maxLength: 20 }),
    openSearch: fc.string({ minLength: 1, maxLength: 20 }),
    openCalendar: fc.string({ minLength: 1, maxLength: 20 }),
    undo: fc.string({ minLength: 1, maxLength: 20 }),
    redo: fc.string({ minLength: 1, maxLength: 20 })
  });

const userSettingsArbitrary = (): fc.Arbitrary<UserSettings> =>
  fc.record({
    userId: fc.uuid(),
    passwordHash: fc.string({ minLength: 1, maxLength: 100 }),
    encryptionSalt: fc.string({ minLength: 1, maxLength: 100 }),
    theme: fc.constantFrom('light', 'dark'),
    keyboardShortcuts: keyboardShortcutMapArbitrary()
  });

describe('Feature: journal-notes, Property 11: Structured Data Format', () => {
  describe('NoteEntry validation', () => {
    it('should validate all generated NoteEntry objects as valid structured data', () => {
      fc.assert(
        fc.property(noteEntryArbitrary(), (noteEntry) => {
          // Property: For any valid NoteEntry, it should pass validation
          const validation = validateNoteEntry(noteEntry);
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
          
          // Property: For any valid NoteEntry, type guard should return true
          expect(isNoteEntry(noteEntry)).toBe(true);
          
          // Property: For any valid NoteEntry, JSON serialization should be reversible
          const serialized = JSON.stringify(noteEntry, (key, value) => {
            // Handle Date serialization
            if (value instanceof Date) {
              return value.toISOString();
            }
            return value;
          });
          
          const parsed = JSON.parse(serialized, (key, value) => {
            // Handle Date deserialization
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
              return new Date(value);
            }
            return value;
          });
          
          // The parsed object should be equivalent to the original
          expect(parsed.id).toBe(noteEntry.id);
          expect(parsed.title).toBe(noteEntry.title);
          expect(parsed.content).toBe(noteEntry.content);
          expect(parsed.createdAt).toEqual(noteEntry.createdAt);
          expect(parsed.updatedAt).toEqual(noteEntry.updatedAt);
          expect(parsed.dividerPosition).toBe(noteEntry.dividerPosition);
          expect(parsed.isTask).toBe(noteEntry.isTask);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid NoteEntry objects', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.option(fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))),
            title: fc.option(fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))),
            content: fc.option(fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))),
            createdAt: fc.option(fc.oneof(dateArbitrary(), fc.string(), fc.integer(), fc.constant(null))),
            updatedAt: fc.option(fc.oneof(dateArbitrary(), fc.string(), fc.integer(), fc.constant(null))),
            dividerPosition: fc.option(fc.oneof(fc.nat(), fc.string(), fc.boolean(), fc.constant(null))),
            isTask: fc.option(fc.oneof(fc.boolean(), fc.string(), fc.integer(), fc.constant(null))),
          }),
          (invalidData) => {
            // Property: For any object missing required fields or with wrong types, validation should fail
            const validation = validateNoteEntry(invalidData);
            
            // If any required field is missing or has wrong type, validation should fail
            const hasValidId = typeof invalidData.id === 'string' && invalidData.id.length > 0;
            const hasValidTitle = typeof invalidData.title === 'string';
            const hasValidContent = typeof invalidData.content === 'string';
            const hasValidCreatedAt = invalidData.createdAt instanceof Date;
            const hasValidUpdatedAt = invalidData.updatedAt instanceof Date;
            const hasValidDividerPosition = typeof invalidData.dividerPosition === 'number' && invalidData.dividerPosition >= 0;
            const hasValidIsTask = typeof invalidData.isTask === 'boolean';
            
            const shouldBeValid = hasValidId && hasValidTitle && hasValidContent && 
                                hasValidCreatedAt && hasValidUpdatedAt && 
                                hasValidDividerPosition && hasValidIsTask;
            
            if (!shouldBeValid) {
              expect(validation.valid).toBe(false);
              expect(validation.errors.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('TaskMetadata validation', () => {
    it('should validate all generated TaskMetadata objects as valid structured data', () => {
      fc.assert(
        fc.property(taskMetadataArbitrary(), (taskMetadata) => {
          // Property: For any valid TaskMetadata, it should pass validation
          const validation = validateTaskMetadata(taskMetadata);
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
          
          // Property: For any valid TaskMetadata, type guard should return true
          expect(isTaskMetadata(taskMetadata)).toBe(true);
          
          // Property: For any valid TaskMetadata, JSON serialization should preserve structure
          const serialized = JSON.stringify(taskMetadata, (key, value) => {
            if (value instanceof Date) {
              return value.toISOString();
            }
            return value;
          });
          
          expect(() => JSON.parse(serialized)).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('UserSettings validation', () => {
    it('should validate all generated UserSettings objects as valid structured data', () => {
      fc.assert(
        fc.property(userSettingsArbitrary(), (userSettings) => {
          // Property: For any valid UserSettings, it should pass type guard validation
          expect(isUserSettings(userSettings)).toBe(true);
          
          // Property: For any valid UserSettings, keyboard shortcuts should be valid
          expect(isKeyboardShortcutMap(userSettings.keyboardShortcuts)).toBe(true);
          
          // Property: For any valid UserSettings, theme should be valid
          expect(['light', 'dark']).toContain(userSettings.theme);
          
          // Property: For any valid UserSettings, JSON serialization should preserve structure
          const serialized = JSON.stringify(userSettings);
          const parsed = JSON.parse(serialized);
          
          expect(parsed.userId).toBe(userSettings.userId);
          expect(parsed.theme).toBe(userSettings.theme);
          expect(parsed.keyboardShortcuts).toEqual(userSettings.keyboardShortcuts);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Factory functions', () => {
    it('should create valid objects with factory functions', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            title: fc.option(fc.string(), { nil: undefined }),
            content: fc.option(fc.string(), { nil: undefined }),
            isTask: fc.option(fc.boolean(), { nil: undefined })
          }),
          (partial) => {
            // Property: For any partial data, createNoteEntry should produce valid NoteEntry
            const noteEntry = createNoteEntry(partial);
            
            expect(isNoteEntry(noteEntry)).toBe(true);
            expect(validateNoteEntry(noteEntry).valid).toBe(true);
            expect(noteEntry.id).toBe(partial.id);
            
            if (partial.title !== undefined) {
              expect(noteEntry.title).toBe(partial.title);
            }
            if (partial.content !== undefined) {
              expect(noteEntry.content).toBe(partial.content);
            }
            if (partial.isTask !== undefined) {
              expect(noteEntry.isTask).toBe(partial.isTask);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create valid TaskMetadata with factory function', () => {
      fc.assert(
        fc.property(
          fc.record({
            priority: fc.option(fc.nat(), { nil: undefined }),
            tags: fc.option(fc.array(fc.string()), { nil: undefined }),
            completed: fc.option(fc.boolean(), { nil: undefined })
          }),
          (partial) => {
            // Property: For any partial TaskMetadata, createTaskMetadata should produce valid TaskMetadata
            const taskMetadata = createTaskMetadata(partial);
            
            expect(isTaskMetadata(taskMetadata)).toBe(true);
            expect(validateTaskMetadata(taskMetadata).valid).toBe(true);
            
            if (partial.priority !== undefined) {
              expect(taskMetadata.priority).toBe(partial.priority);
            }
            if (partial.tags !== undefined) {
              expect(taskMetadata.tags).toEqual(partial.tags);
            }
            if (partial.completed !== undefined) {
              expect(taskMetadata.completed).toBe(partial.completed);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create valid UserSettings with factory function', () => {
      fc.assert(
        fc.property(fc.uuid(), (userId) => {
          // Property: For any userId, createDefaultUserSettings should produce valid UserSettings
          const userSettings = createDefaultUserSettings(userId);
          
          expect(isUserSettings(userSettings)).toBe(true);
          expect(userSettings.userId).toBe(userId);
          expect(userSettings.theme).toBe('light');
          expect(isKeyboardShortcutMap(userSettings.keyboardShortcuts)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('JSON serialization round-trip', () => {
    it('should preserve data integrity through JSON serialization for all data types', () => {
      fc.assert(
        fc.property(
          fc.record({
            noteEntry: noteEntryArbitrary(),
            taskMetadata: taskMetadataArbitrary(),
            userSettings: userSettingsArbitrary()
          }),
          (data) => {
            // Property: For any structured data, JSON serialization and parsing should preserve essential properties
            
            // Test NoteEntry round-trip
            const noteJson = JSON.stringify(data.noteEntry, (key, value) => {
              return value instanceof Date ? value.toISOString() : value;
            });
            
            const parsedNote = JSON.parse(noteJson, (key, value) => {
              if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
                return new Date(value);
              }
              return value;
            });
            
            expect(parsedNote.id).toBe(data.noteEntry.id);
            expect(parsedNote.title).toBe(data.noteEntry.title);
            expect(parsedNote.content).toBe(data.noteEntry.content);
            expect(parsedNote.isTask).toBe(data.noteEntry.isTask);
            
            // Test TaskMetadata round-trip
            const taskJson = JSON.stringify(data.taskMetadata, (key, value) => {
              return value instanceof Date ? value.toISOString() : value;
            });
            
            const parsedTask = JSON.parse(taskJson);
            expect(parsedTask.priority).toBe(data.taskMetadata.priority);
            expect(parsedTask.tags).toEqual(data.taskMetadata.tags);
            expect(parsedTask.completed).toBe(data.taskMetadata.completed);
            
            // Test UserSettings round-trip
            const userJson = JSON.stringify(data.userSettings);
            const parsedUser = JSON.parse(userJson);
            expect(parsedUser.userId).toBe(data.userSettings.userId);
            expect(parsedUser.theme).toBe(data.userSettings.theme);
            expect(parsedUser.keyboardShortcuts).toEqual(data.userSettings.keyboardShortcuts);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});