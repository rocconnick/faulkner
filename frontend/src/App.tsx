import { useState, useEffect } from 'react';
import { JournalStream } from './components/JournalStream';
import { StorageService } from './services/StorageService';
import type { NoteEntry } from './types';
import { createNoteEntry } from './types';
import './App.css';

function App() {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [storageService] = useState(() => new StorageService());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize storage service and load notes
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await storageService.initialize();
        
        // Load existing notes
        const loadedNotes = await storageService.listNotes();
        
        // If no notes exist, create initial note
        if (loadedNotes.length === 0) {
          const initialNote = createNoteEntry({
            id: crypto.randomUUID(),
            title: 'Welcome to Journal Notes',
            content: 'Start writing your thoughts here. Press Cmd+Enter (or Ctrl+Enter) to add a new divider and create a new note entry.',
            dividerPosition: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            isTask: false
          });
          
          await storageService.saveNote(initialNote);
          setNotes([initialNote]);
        } else {
          setNotes(loadedNotes);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [storageService]);

  // Handle note creation
  const handleNoteCreate = async (note: NoteEntry) => {
    try {
      await storageService.saveNote(note);
      setNotes(prev => [...prev, note]);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  // Handle note update
  const handleNoteUpdate = async (note: NoteEntry) => {
    try {
      await storageService.saveNote(note);
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  if (!isInitialized) {
    return (
      <div className="app-loading">
        <p>Loading Journal Notes...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <JournalStream
        notes={notes}
        onNoteCreate={handleNoteCreate}
        onNoteUpdate={handleNoteUpdate}
      />
    </div>
  );
}

export default App;
