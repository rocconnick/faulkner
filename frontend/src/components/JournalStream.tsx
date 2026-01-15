/**
 * JournalStream Component
 * 
 * Main interface for displaying and editing the continuous stream of notes.
 * Implements infinite scroll with dynamic loading, viewport-based rendering,
 * scroll position preservation, and divider creation.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.7, 1.8, 1.11
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { NoteEntry } from '../types';
import { createNoteEntry } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import './JournalStream.css';

const AUTO_SAVE_DELAY = 1000; // Auto-save after 1 second of inactivity

interface JournalStreamProps {
  notes: NoteEntry[];
  onLoadMore?: (direction: 'up' | 'down') => Promise<NoteEntry[]>;
  onNoteUpdate?: (note: NoteEntry) => void;
  onNoteCreate?: (note: NoteEntry) => void;
  onDividerAdd?: (position: number) => void;
  targetNoteId?: string; // For navigation from calendar/search
  contextSize?: number; // Number of notes to load before/after target
  keyboardShortcut?: string; // Keyboard shortcut for adding divider (default: Cmd+Enter)
}

interface ViewportState {
  startIndex: number;
  endIndex: number;
  scrollTop: number;
}

const VIEWPORT_BUFFER = 5; // Number of notes to render outside viewport
const UNLOAD_THRESHOLD = 50; // Unload notes this far from viewport
const LOAD_TRIGGER_OFFSET = 500; // Pixels from edge to trigger load

export function JournalStream({
  notes,
  onLoadMore,
  onNoteUpdate,
  onNoteCreate,
  onDividerAdd,
  targetNoteId,
  contextSize = 10,
  keyboardShortcut = 'Cmd+Enter'
}: JournalStreamProps) {
  const [displayedNotes, setDisplayedNotes] = useState<NoteEntry[]>([]);
  const [viewport, setViewport] = useState<ViewportState>({
    startIndex: 0,
    endIndex: 15,
    scrollTop: 0
  });
  const [isLoadingUp, setIsLoadingUp] = useState(false);
  const [isLoadingDown, setIsLoadingDown] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'content' | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const isScrollingRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  // Initialize displayed notes
  useEffect(() => {
    if (targetNoteId) {
      // Context-aware loading: load target note + surrounding entries
      const targetIndex = notes.findIndex(note => note.id === targetNoteId);
      if (targetIndex !== -1) {
        const start = Math.max(0, targetIndex - contextSize);
        const end = Math.min(notes.length, targetIndex + contextSize + 1);
        setDisplayedNotes(notes.slice(start, end));
        setViewport({
          startIndex: start,
          endIndex: end,
          scrollTop: 0
        });
        
        // Scroll to target note after render
        setTimeout(() => {
          const targetElement = document.getElementById(`note-${targetNoteId}`);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    } else {
      // Initial load: first 15 entries
      const initialNotes = notes.slice(0, 15);
      setDisplayedNotes(initialNotes);
      setViewport({
        startIndex: 0,
        endIndex: 15,
        scrollTop: 0
      });
    }
  }, [notes, targetNoteId, contextSize]);

  // Handle scroll events for dynamic loading and viewport management
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isScrollingRef.current) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Save scroll position
    scrollPositionRef.current = scrollTop;

    // Check if we need to load more notes at the top
    if (scrollTop < LOAD_TRIGGER_OFFSET && !isLoadingUp && viewport.startIndex > 0) {
      loadMoreNotes('up');
    }

    // Check if we need to load more notes at the bottom
    if (
      scrollHeight - scrollTop - clientHeight < LOAD_TRIGGER_OFFSET &&
      !isLoadingDown &&
      viewport.endIndex < notes.length
    ) {
      loadMoreNotes('down');
    }

    // Update viewport for rendering optimization
    updateViewport(scrollTop, clientHeight);
  }, [viewport, isLoadingUp, isLoadingDown, notes.length]);

  // Load more notes in specified direction
  const loadMoreNotes = async (direction: 'up' | 'down') => {
    if (direction === 'up') {
      setIsLoadingUp(true);
      
      // Load previous notes
      const newStartIndex = Math.max(0, viewport.startIndex - 10);
      const newNotes = notes.slice(newStartIndex, viewport.startIndex);
      
      if (newNotes.length > 0) {
        // Preserve scroll position
        const container = containerRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;
        
        setDisplayedNotes(prev => [...newNotes, ...prev]);
        setViewport(prev => ({
          ...prev,
          startIndex: newStartIndex
        }));
        
        // Restore scroll position after render
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const heightDifference = newScrollHeight - previousScrollHeight;
            container.scrollTop = scrollPositionRef.current + heightDifference;
          }
        }, 0);
      }
      
      // Call external load handler if provided
      if (onLoadMore) {
        await onLoadMore('up');
      }
      
      setIsLoadingUp(false);
    } else {
      setIsLoadingDown(true);
      
      // Load next notes
      const newEndIndex = Math.min(notes.length, viewport.endIndex + 10);
      const newNotes = notes.slice(viewport.endIndex, newEndIndex);
      
      if (newNotes.length > 0) {
        setDisplayedNotes(prev => [...prev, ...newNotes]);
        setViewport(prev => ({
          ...prev,
          endIndex: newEndIndex
        }));
      }
      
      // Call external load handler if provided
      if (onLoadMore) {
        await onLoadMore('down');
      }
      
      setIsLoadingDown(false);
    }
  };

  // Update viewport for rendering optimization
  const updateViewport = (scrollTop: number, clientHeight: number) => {
    // Calculate which notes are in viewport
    const noteElements = containerRef.current?.querySelectorAll('.note-entry');
    if (!noteElements) return;

    let newStartIndex = viewport.startIndex;
    let newEndIndex = viewport.endIndex;

    noteElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const isInViewport = rect.top < clientHeight && rect.bottom > 0;
      
      if (isInViewport) {
        const actualIndex = viewport.startIndex + index;
        if (actualIndex < newStartIndex) newStartIndex = actualIndex;
        if (actualIndex > newEndIndex) newEndIndex = actualIndex;
      }
    });

    // Add buffer
    newStartIndex = Math.max(0, newStartIndex - VIEWPORT_BUFFER);
    newEndIndex = Math.min(notes.length, newEndIndex + VIEWPORT_BUFFER);

    // Unload notes far from viewport
    if (Math.abs(newStartIndex - viewport.startIndex) > UNLOAD_THRESHOLD ||
        Math.abs(newEndIndex - viewport.endIndex) > UNLOAD_THRESHOLD) {
      setViewport({
        startIndex: newStartIndex,
        endIndex: newEndIndex,
        scrollTop
      });
      
      // Update displayed notes
      setDisplayedNotes(notes.slice(newStartIndex, newEndIndex));
    }
  };

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Handle keyboard shortcuts for divider creation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for keyboard shortcut (Cmd+Enter or Ctrl+Enter)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;
      
      if (modifierKey && event.key === 'Enter') {
        event.preventDefault();
        handleAddDivider();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedNotes, currentPosition]);

  // Add divider and create new note entry
  const handleAddDivider = useCallback(() => {
    // Calculate next divider position
    const maxPosition = notes.length > 0 
      ? Math.max(...notes.map(n => n.dividerPosition))
      : -1;
    const newPosition = maxPosition + 1;
    
    // Create new note entry
    const newNote = createNoteEntry({
      id: crypto.randomUUID(),
      title: '',
      content: '',
      dividerPosition: newPosition,
      createdAt: new Date(),
      updatedAt: new Date(),
      isTask: false
    });

    // Update current position
    setCurrentPosition(newPosition);

    // Call callbacks
    if (onDividerAdd) {
      onDividerAdd(newPosition);
    }
    
    if (onNoteCreate) {
      onNoteCreate(newNote);
    }

    // Scroll to new note after render
    setTimeout(() => {
      const newNoteElement = document.getElementById(`note-${newNote.id}`);
      if (newNoteElement) {
        newNoteElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [notes, onDividerAdd, onNoteCreate]);

  // Handle note field editing
  const handleNoteEdit = useCallback((noteId: string, field: 'title' | 'content', value: string) => {
    // Update displayed notes immediately for responsive UI
    setDisplayedNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, [field]: value, updatedAt: new Date() }
        : note
    ));

    // Clear existing auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new auto-save timer
    autoSaveTimerRef.current = setTimeout(() => {
      const updatedNote = displayedNotes.find(n => n.id === noteId);
      if (updatedNote && onNoteUpdate) {
        const noteToSave = { ...updatedNote, [field]: value, updatedAt: new Date() };
        onNoteUpdate(noteToSave);
      }
    }, AUTO_SAVE_DELAY);
  }, [displayedNotes, onNoteUpdate]);

  // Handle blur event to save immediately
  const handleNoteBlur = useCallback((noteId: string) => {
    // Clear auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // Save immediately on blur
    const updatedNote = displayedNotes.find(n => n.id === noteId);
    if (updatedNote && onNoteUpdate) {
      onNoteUpdate(updatedNote);
    }

    // Clear editing state
    setEditingNoteId(null);
    setEditingField(null);
  }, [displayedNotes, onNoteUpdate]);

  // Handle focus event to track editing
  const handleNoteFocus = useCallback((noteId: string, field: 'title' | 'content') => {
    setEditingNoteId(noteId);
    setEditingField(field);
  }, []);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Render notes in chronological order
  const sortedNotes = [...displayedNotes].sort((a, b) => 
    a.createdAt.getTime() - b.createdAt.getTime()
  );

  return (
    <div className="journal-stream" ref={containerRef}>
      {/* Add Divider Button */}
      <div className="divider-controls">
        <button 
          className="add-divider-button"
          onClick={handleAddDivider}
          title={`Add divider (${keyboardShortcut})`}
        >
          + Add Divider
        </button>
      </div>

      {isLoadingUp && (
        <div className="loading-indicator loading-up">
          Loading earlier notes...
        </div>
      )}
      
      <div className="notes-container">
        {sortedNotes.map((note) => {
          const isEditingTitle = editingNoteId === note.id && editingField === 'title';
          const isEditingContent = editingNoteId === note.id && editingField === 'content';
          
          return (
            <div
              key={note.id}
              id={`note-${note.id}`}
              className={`note-entry ${note.id === targetNoteId ? 'highlighted' : ''}`}
            >
              <div className="note-divider" />
              <div className="note-content">
                {isEditingTitle ? (
                  <input
                    type="text"
                    className="note-title-input"
                    value={note.title}
                    placeholder="Untitled"
                    onChange={(e) => handleNoteEdit(note.id, 'title', e.target.value)}
                    onFocus={() => handleNoteFocus(note.id, 'title')}
                    onBlur={() => handleNoteBlur(note.id)}
                    autoFocus
                  />
                ) : (
                  <div
                    className="note-title"
                    onClick={() => handleNoteFocus(note.id, 'title')}
                    role="button"
                    tabIndex={0}
                  >
                    {note.title || 'Untitled'}
                  </div>
                )}
                
                {isEditingContent ? (
                  <textarea
                    className="note-body-input"
                    value={note.content}
                    placeholder="Start typing..."
                    onChange={(e) => handleNoteEdit(note.id, 'content', e.target.value)}
                    onFocus={() => handleNoteFocus(note.id, 'content')}
                    onBlur={() => handleNoteBlur(note.id)}
                    rows={5}
                    autoFocus
                  />
                ) : (
                  <div
                    className="note-body-rendered"
                    onClick={() => handleNoteFocus(note.id, 'content')}
                    role="button"
                    tabIndex={0}
                  >
                    {note.content ? (
                      <MarkdownRenderer content={note.content} />
                    ) : (
                      <span className="note-body-placeholder">Start typing...</span>
                    )}
                  </div>
                )}
                
                <div className="note-metadata">
                  <span className="note-date">
                    {note.createdAt.toLocaleDateString()}
                  </span>
                  {note.updatedAt.getTime() !== note.createdAt.getTime() && (
                    <span className="note-updated">
                      Updated: {note.updatedAt.toLocaleDateString()}
                    </span>
                  )}
                  {note.isTask && (
                    <span className="note-task-badge">Task</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {isLoadingDown && (
        <div className="loading-indicator loading-down">
          Loading more notes...
        </div>
      )}
    </div>
  );
}
