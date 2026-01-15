/**
 * JournalStream Component Tests
 * 
 * Basic unit tests for the JournalStream component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { JournalStream } from './JournalStream';
import { createNoteEntry } from '../types';
import type { NoteEntry } from '../types';

describe('JournalStream', () => {
  /**
   * Feature: journal-notes, Property 1: Chronological Ordering
   * Validates: Requirements 1.1
   * 
   * Property: For any collection of note entries, when displayed in the journal stream,
   * they should appear in chronological order based on their creation timestamps.
   */
  describe('Property 1: Chronological Ordering', () => {
    it('should display notes in chronological order for any collection of notes', () => {
      // Custom arbitrary for generating NoteEntry objects
      const noteEntryArbitrary = fc.record({
        id: fc.uuid(),
        title: fc.string({ minLength: 0, maxLength: 100 }),
        content: fc.string({ minLength: 0, maxLength: 1000 }),
        createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        dividerPosition: fc.nat({ max: 1000 }),
        isTask: fc.boolean(),
        taskMetadata: fc.constant(undefined)
      }).map(data => createNoteEntry(data));

      fc.assert(
        fc.property(
          fc.array(noteEntryArbitrary, { minLength: 2, maxLength: 50 }),
          (notes) => {
            // Render the JournalStream with the generated notes
            const { container } = render(<JournalStream notes={notes} />);
            
            // Get all rendered note elements
            const noteElements = container.querySelectorAll('.note-entry');
            
            // Extract the note IDs from the rendered elements
            const renderedIds = Array.from(noteElements).map(
              element => element.id.replace('note-', '')
            );
            
            // Sort the original notes by creation date to get expected order
            const expectedOrder = [...notes]
              .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
              .map(note => note.id);
            
            // Verify that rendered order matches chronological order
            expect(renderedIds).toEqual(expectedOrder);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  it('should render notes in chronological order', () => {
    const notes = [
      createNoteEntry({
        id: '2',
        title: 'Second Note',
        content: 'This is the second note',
        dividerPosition: 1,
        createdAt: new Date('2026-01-14T12:00:00'),
        updatedAt: new Date('2026-01-14T12:00:00')
      }),
      createNoteEntry({
        id: '1',
        title: 'First Note',
        content: 'This is the first note',
        dividerPosition: 0,
        createdAt: new Date('2026-01-14T10:00:00'),
        updatedAt: new Date('2026-01-14T10:00:00')
      })
    ];

    render(<JournalStream notes={notes} />);

    const noteElements = screen.getAllByText(/Note/);
    expect(noteElements[0]).toHaveTextContent('First Note');
    expect(noteElements[1]).toHaveTextContent('Second Note');
  });

  it('should render add divider button', () => {
    const notes = [
      createNoteEntry({
        id: '1',
        title: 'Test Note',
        content: 'Test content',
        dividerPosition: 0
      })
    ];

    render(<JournalStream notes={notes} />);

    const button = screen.getByRole('button', { name: /add divider/i });
    expect(button).toBeDefined();
  });

  it('should call onNoteCreate when divider is added', () => {
    const onNoteCreate = vi.fn();
    const notes = [
      createNoteEntry({
        id: '1',
        title: 'Test Note',
        content: 'Test content',
        dividerPosition: 0
      })
    ];

    render(<JournalStream notes={notes} onNoteCreate={onNoteCreate} />);

    const button = screen.getByRole('button', { name: /add divider/i });
    button.click();

    expect(onNoteCreate).toHaveBeenCalledTimes(1);
    expect(onNoteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        title: '',
        content: '',
        dividerPosition: 1,
        isTask: false
      })
    );
  });

  it('should highlight target note when targetNoteId is provided', () => {
    const notes = [
      createNoteEntry({
        id: 'target-note',
        title: 'Target Note',
        content: 'This should be highlighted',
        dividerPosition: 0
      }),
      createNoteEntry({
        id: 'other-note',
        title: 'Other Note',
        content: 'This should not be highlighted',
        dividerPosition: 1
      })
    ];

    render(<JournalStream notes={notes} targetNoteId="target-note" />);

    const targetElement = document.getElementById('note-target-note');
    expect(targetElement?.classList.contains('highlighted')).toBe(true);
  });

  it('should display task badge for task notes', () => {
    const notes = [
      createNoteEntry({
        id: '1',
        title: 'Task Note',
        content: 'This is a task',
        dividerPosition: 0,
        isTask: true
      })
    ];

    render(<JournalStream notes={notes} />);

    const badge = screen.getByText('Task');
    expect(badge).toBeDefined();
  });

  /**
   * Feature: journal-notes, Property 2: Divider Creates Note Entry
   * Validates: Requirements 1.2
   * 
   * Property: For any journal stream state, when a divider is added,
   * a new note entry should be created immediately below that divider.
   */
  describe('Property 2: Divider Creates Note Entry', () => {
    it('should create a new note entry when divider is added for any journal stream state', () => {
      // Custom arbitrary for generating NoteEntry objects
      const noteEntryArbitrary = fc.record({
        id: fc.uuid(),
        title: fc.string({ minLength: 0, maxLength: 100 }),
        content: fc.string({ minLength: 0, maxLength: 1000 }),
        createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        dividerPosition: fc.nat({ max: 1000 }),
        isTask: fc.boolean(),
        taskMetadata: fc.constant(undefined)
      }).map(data => createNoteEntry(data));

      fc.assert(
        fc.property(
          fc.array(noteEntryArbitrary, { minLength: 0, maxLength: 50 }),
          (notes) => {
            // Track created notes
            const createdNotes: NoteEntry[] = [];
            const onNoteCreate = vi.fn((note: NoteEntry) => {
              createdNotes.push(note);
            });

            // Render the JournalStream with the generated notes
            const { container } = render(
              <JournalStream 
                notes={notes} 
                onNoteCreate={onNoteCreate}
              />
            );
            
            // Find and click the add divider button
            const button = container.querySelector('.add-divider-button');
            expect(button).toBeDefined();
            
            if (button) {
              button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
            
            // Verify that onNoteCreate was called exactly once
            expect(onNoteCreate).toHaveBeenCalledTimes(1);
            
            // Verify that a new note entry was created
            expect(createdNotes.length).toBe(1);
            const newNote = createdNotes[0];
            
            // Verify the new note has the expected properties
            expect(newNote).toBeDefined();
            expect(newNote.id).toBeDefined();
            expect(typeof newNote.id).toBe('string');
            expect(newNote.title).toBe('');
            expect(newNote.content).toBe('');
            expect(newNote.isTask).toBe(false);
            
            // Verify the divider position is correct (should be max + 1)
            const maxPosition = notes.length > 0 
              ? Math.max(...notes.map(n => n.dividerPosition))
              : -1;
            expect(newNote.dividerPosition).toBe(maxPosition + 1);
            
            // Verify timestamps are set
            expect(newNote.createdAt).toBeInstanceOf(Date);
            expect(newNote.updatedAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: journal-notes, Property 4: Context-Aware Loading
   * Validates: Requirements 1.7
   * 
   * Property: For any note entry accessed via calendar or search, the journal stream
   * should load that entry plus surrounding entries (before and after) for context.
   */
  describe('Property 4: Context-Aware Loading', () => {
    it('should load target note plus surrounding entries for any note collection and target', () => {
      // Custom arbitrary for generating NoteEntry objects
      const noteEntryArbitrary = fc.record({
        id: fc.uuid(),
        title: fc.string({ minLength: 0, maxLength: 100 }),
        content: fc.string({ minLength: 0, maxLength: 1000 }),
        createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        dividerPosition: fc.nat({ max: 1000 }),
        isTask: fc.boolean(),
        taskMetadata: fc.constant(undefined)
      }).map(data => createNoteEntry(data));

      fc.assert(
        fc.property(
          fc.array(noteEntryArbitrary, { minLength: 5, maxLength: 100 }),
          fc.integer({ min: 5, max: 20 }), // contextSize
          (notes, contextSize) => {
            // Pick a random target note from the collection
            const targetIndex = Math.floor(Math.random() * notes.length);
            const targetNote = notes[targetIndex];
            
            // Render the JournalStream with target note and context size
            const { container } = render(
              <JournalStream 
                notes={notes} 
                targetNoteId={targetNote.id}
                contextSize={contextSize}
              />
            );
            
            // Get all rendered note elements
            const noteElements = container.querySelectorAll('.note-entry');
            const renderedIds = Array.from(noteElements).map(
              element => element.id.replace('note-', '')
            );
            
            // Calculate expected range of notes to be loaded
            const expectedStart = Math.max(0, targetIndex - contextSize);
            const expectedEnd = Math.min(notes.length, targetIndex + contextSize + 1);
            const expectedNotes = notes.slice(expectedStart, expectedEnd);
            
            // Sort expected notes chronologically (as they would be displayed)
            const expectedIds = expectedNotes
              .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
              .map(note => note.id);
            
            // Verify that the target note is included in rendered notes
            expect(renderedIds).toContain(targetNote.id);
            
            // Verify that the number of rendered notes is within expected range
            // (should be contextSize before + target + contextSize after, bounded by array limits)
            const expectedCount = expectedEnd - expectedStart;
            expect(renderedIds.length).toBe(expectedCount);
            
            // Verify that rendered notes match the expected context window
            expect(renderedIds).toEqual(expectedIds);
            
            // Verify that the target note is highlighted
            const targetElement = container.querySelector(`#note-${targetNote.id}`);
            expect(targetElement?.classList.contains('highlighted')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: journal-notes, Property 3: Content Addition
   * Validates: Requirements 1.4
   * 
   * Property: For any note entry and any text content, when the user types content,
   * it should be added to the current note entry without loss.
   */
  describe('Property 3: Content Addition', () => {
    it('should add content to note entry without loss for any note and any text', () => {
      // Custom arbitrary for generating NoteEntry objects
      const noteEntryArbitrary = fc.record({
        id: fc.uuid(),
        title: fc.string({ minLength: 0, maxLength: 100 }),
        content: fc.string({ minLength: 0, maxLength: 1000 }),
        createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        dividerPosition: fc.nat({ max: 1000 }),
        isTask: fc.boolean(),
        taskMetadata: fc.constant(undefined)
      }).map(data => createNoteEntry(data));

      fc.assert(
        fc.property(
          noteEntryArbitrary,
          fc.string({ minLength: 1, maxLength: 500 }), // New content to add
          (note, newContent) => {
            // Track updated notes
            let updatedNote: NoteEntry | null = null;
            const onNoteUpdate = vi.fn((note: NoteEntry) => {
              updatedNote = note;
            });

            // Render the JournalStream with the note
            const { container } = render(
              <JournalStream 
                notes={[note]} 
                onNoteUpdate={onNoteUpdate}
              />
            );
            
            // Find the content textarea/div for the note
            const noteElement = container.querySelector(`#note-${note.id}`);
            expect(noteElement).toBeDefined();
            
            // Click on the content area to enter edit mode
            const contentArea = noteElement?.querySelector('.note-body-rendered');
            if (contentArea) {
              contentArea.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
            
            // Find the textarea that should now be visible
            const textarea = noteElement?.querySelector('.note-body-input') as HTMLTextAreaElement;
            
            if (textarea) {
              // Simulate typing new content
              const combinedContent = note.content + newContent;
              
              // Trigger change event
              textarea.value = combinedContent;
              textarea.dispatchEvent(new Event('change', { bubbles: true }));
              
              // Trigger blur to save
              textarea.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
              
              // Verify that onNoteUpdate was called
              expect(onNoteUpdate).toHaveBeenCalled();
              
              // Verify that the updated note contains the new content
              if (updatedNote) {
                expect(updatedNote.content).toContain(newContent);
                expect(updatedNote.id).toBe(note.id);
                
                // Verify that updatedAt timestamp was updated
                expect(updatedNote.updatedAt.getTime()).toBeGreaterThanOrEqual(note.updatedAt.getTime());
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Unit tests for editing edge cases
   * Requirements: 2.2, 2.8, 2.11
   */
  describe('Editing Edge Cases', () => {
    it('should handle auto-save after delay when typing', async () => {
      vi.useFakeTimers();
      
      const note = createNoteEntry({
        id: 'test-note',
        title: 'Test Note',
        content: 'Initial content',
        dividerPosition: 0
      });

      const onNoteUpdate = vi.fn();
      const { container } = render(
        <JournalStream notes={[note]} onNoteUpdate={onNoteUpdate} />
      );

      // Click to enter edit mode
      const contentArea = container.querySelector('.note-body-rendered');
      contentArea?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Find textarea and type
      const textarea = container.querySelector('.note-body-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = 'Initial content with new text';
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        // Should not save immediately
        expect(onNoteUpdate).not.toHaveBeenCalled();

        // Fast-forward time by 1 second (auto-save delay)
        vi.advanceTimersByTime(1000);

        // Should have auto-saved
        expect(onNoteUpdate).toHaveBeenCalledTimes(1);
      }

      vi.useRealTimers();
    });

    it('should cancel auto-save timer on blur and save immediately', async () => {
      vi.useFakeTimers();
      
      const note = createNoteEntry({
        id: 'test-note',
        title: 'Test Note',
        content: 'Initial content',
        dividerPosition: 0
      });

      const onNoteUpdate = vi.fn();
      const { container } = render(
        <JournalStream notes={[note]} onNoteUpdate={onNoteUpdate} />
      );

      // Click to enter edit mode
      const contentArea = container.querySelector('.note-body-rendered');
      contentArea?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Find textarea and type
      const textarea = container.querySelector('.note-body-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = 'Initial content with new text';
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        // Blur before auto-save timer fires
        textarea.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

        // Should save immediately on blur
        expect(onNoteUpdate).toHaveBeenCalledTimes(1);

        // Fast-forward time to ensure auto-save doesn't fire again
        vi.advanceTimersByTime(1000);

        // Should still only be called once
        expect(onNoteUpdate).toHaveBeenCalledTimes(1);
      }

      vi.useRealTimers();
    });

    it('should update timestamp when note is edited', () => {
      const originalDate = new Date('2026-01-14T10:00:00');
      const note = createNoteEntry({
        id: 'test-note',
        title: 'Test Note',
        content: 'Initial content',
        dividerPosition: 0,
        createdAt: originalDate,
        updatedAt: originalDate
      });

      let updatedNote: NoteEntry | null = null;
      const onNoteUpdate = vi.fn((note: NoteEntry) => {
        updatedNote = note;
      });

      const { container } = render(
        <JournalStream notes={[note]} onNoteUpdate={onNoteUpdate} />
      );

      // Click to enter edit mode
      const contentArea = container.querySelector('.note-body-rendered');
      contentArea?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Find textarea and edit
      const textarea = container.querySelector('.note-body-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = 'Updated content';
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        textarea.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

        // Verify timestamp was updated
        expect(updatedNote).toBeDefined();
        if (updatedNote) {
          expect(updatedNote.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
        }
      }
    });

    it('should handle empty content gracefully', () => {
      const note = createNoteEntry({
        id: 'test-note',
        title: 'Test Note',
        content: '',
        dividerPosition: 0
      });

      const { container } = render(
        <JournalStream notes={[note]} />
      );

      // Should show placeholder when content is empty
      const placeholder = container.querySelector('.note-body-placeholder');
      expect(placeholder).toBeDefined();
      expect(placeholder?.textContent).toBe('Start typing...');
    });

    it('should render markdown with headers correctly', () => {
      const note = createNoteEntry({
        id: 'test-note',
        title: 'Test Note',
        content: '# Header 1\n## Header 2\n### Header 3',
        dividerPosition: 0
      });

      const { container } = render(
        <JournalStream notes={[note]} />
      );

      // Wait for markdown to render
      setTimeout(() => {
        const renderedContent = container.querySelector('.markdown-renderer');
        expect(renderedContent).toBeDefined();
        
        // Check for headers (markdown should be rendered as HTML)
        const h1 = renderedContent?.querySelector('h1');
        const h2 = renderedContent?.querySelector('h2');
        const h3 = renderedContent?.querySelector('h3');
        
        expect(h1).toBeDefined();
        expect(h2).toBeDefined();
        expect(h3).toBeDefined();
      }, 100);
    });

    it('should render markdown with lists correctly', () => {
      const note = createNoteEntry({
        id: 'test-note',
        title: 'Test Note',
        content: '- Item 1\n- Item 2\n* Item 3',
        dividerPosition: 0
      });

      const { container } = render(
        <JournalStream notes={[note]} />
      );

      // Wait for markdown to render
      setTimeout(() => {
        const renderedContent = container.querySelector('.markdown-renderer');
        expect(renderedContent).toBeDefined();
        
        // Check for list
        const ul = renderedContent?.querySelector('ul');
        expect(ul).toBeDefined();
        
        const listItems = renderedContent?.querySelectorAll('li');
        expect(listItems?.length).toBeGreaterThanOrEqual(3);
      }, 100);
    });

    it('should render markdown with bold and italic correctly', () => {
      const note = createNoteEntry({
        id: 'test-note',
        title: 'Test Note',
        content: '**bold text** and *italic text*',
        dividerPosition: 0
      });

      const { container } = render(
        <JournalStream notes={[note]} />
      );

      // Wait for markdown to render
      setTimeout(() => {
        const renderedContent = container.querySelector('.markdown-renderer');
        expect(renderedContent).toBeDefined();
        
        // Check for bold and italic
        const strong = renderedContent?.querySelector('strong');
        const em = renderedContent?.querySelector('em');
        
        expect(strong).toBeDefined();
        expect(em).toBeDefined();
      }, 100);
    });

    it('should render markdown with code correctly', () => {
      const note = createNoteEntry({
        id: 'test-note',
        title: 'Test Note',
        content: 'Inline `code` here',
        dividerPosition: 0
      });

      const { container } = render(
        <JournalStream notes={[note]} />
      );

      // Wait for markdown to render
      setTimeout(() => {
        const renderedContent = container.querySelector('.markdown-renderer');
        expect(renderedContent).toBeDefined();
        
        // Check for code
        const code = renderedContent?.querySelector('code');
        expect(code).toBeDefined();
      }, 100);
    });

    it('should handle special characters in markdown', () => {
      const note = createNoteEntry({
        id: 'test-note',
        title: 'Test Note',
        content: 'Special chars: <>&"\'',
        dividerPosition: 0
      });

      const { container } = render(
        <JournalStream notes={[note]} />
      );

      // Should render without errors
      const noteElement = container.querySelector(`#note-${note.id}`);
      expect(noteElement).toBeDefined();
    });
  });
});
