# Implementation Plan: Journal Notes Application (Beta)

## Overview

This implementation plan breaks down the journal notes application into discrete coding tasks. The beta focuses on core journaling and task management with local storage, using TypeScript for the frontend and Python for the backend.

## Tasks

- [x] 1. Project Setup and Infrastructure
  - Initialize frontend project with React/TypeScript and Vite
  - Initialize backend project with Python/FastAPI
  - Set up development environment and build tools
  - Configure TypeScript and ESLint
  - Set up testing frameworks (Vitest for frontend, pytest for backend)
  - _Requirements: All_

- [x] 2. Implement Core Data Models
  - [x] 2.1 Create TypeScript interfaces for NoteEntry, TaskMetadata, UserSettings
    - Define all data structures in types.ts
    - Include validation schemas
    - _Requirements: 1.1, 3.1_

  - [x] 2.2 Write property test for data model validation
    - **Property 11: Structured Data Format**
    - **Validates: Requirements 9.4**

- [x] 3. Implement Encryption Service
  - [x] 3.1 Create EncryptionService class using Web Crypto API
    - Implement PBKDF2 key derivation
    - Implement AES-256-GCM encryption/decryption
    - Handle salt and IV generation
    - _Requirements: 16.4, 16.7_

  - [x] 3.2 Write property test for encryption round-trip
    - **Property 15: Encryption Round-Trip**
    - **Validates: Requirements 16.4, 16.7**

  - [x] 3.3 Write unit tests for encryption edge cases
    - Test wrong password rejection
    - Test empty data handling
    - Test large data encryption
    - _Requirements: 16.3, 16.4_

- [x] 4. Implement Local Storage Backend
  - [x] 4.1 Create StorageBackend interface
    - Define CRUD operations
    - Define batch operations
    - _Requirements: 8.1, 9.1_

  - [x] 4.2 Implement LocalFSBackend class (Python)
    - Implement saveNote, getNote, listNotes, deleteNote
    - Integrate with encryption service
    - Handle file I/O errors
    - _Requirements: 9.1, 9.4_

  - [x] 4.3 Write property test for immediate persistence
    - **Property 10: Immediate Persistence**
    - **Validates: Requirements 9.1**

  - [x] 4.4 Write unit tests for storage error handling
    - Test file not found
    - Test permission errors
    - Test corrupted data recovery
    - _Requirements: 9.5_

- [x] 5. Implement Backend API Server
  - [x] 5.1 Create FastAPI application with endpoints
    - POST /api/notes - Create note
    - GET /api/notes/:id - Get note
    - PUT /api/notes/:id - Update note
    - DELETE /api/notes/:id - Delete note
    - GET /api/notes - List notes with filters
    - _Requirements: 7.2, 9.1_

  - [x] 5.2 Add authentication middleware
    - Implement password verification
    - Create session management
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 5.3 Write integration tests for API endpoints
    - Test CRUD operations
    - Test authentication flow
    - Test error responses
    - _Requirements: 7.2, 16.2_

- [x] 6. Checkpoint - Backend Complete
  - Ensure all backend tests pass
  - Verify API endpoints work with Postman/curl
  - Ask the user if questions arise

- [x] 7. Implement Frontend Storage Layer
  - [x] 7.1 Create IndexedDB wrapper for local caching
    - Set up database schema
    - Implement CRUD operations
    - _Requirements: 9.1_

  - [x] 7.2 Create API client for backend communication
    - Implement fetch wrappers for all endpoints
    - Handle authentication tokens
    - Handle network errors
    - _Requirements: 7.2_

- [x] 8. Implement Journal Stream Component
  - [x] 8.1 Create JournalStream React component
    - Implement infinite scroll with dynamic loading
    - Implement viewport-based rendering
    - Handle scroll position preservation
    - _Requirements: 1.1, 1.7, 1.8, 1.11_

  - [x] 8.2 Write property test for chronological ordering
    - **Property 1: Chronological Ordering**
    - **Validates: Requirements 1.1**

  - [x] 8.3 Write property test for context-aware loading
    - **Property 4: Context-Aware Loading**
    - **Validates: Requirements 1.7**

  - [x] 8.4 Implement divider creation and note entry management
    - Add divider button and keyboard shortcut
    - Create new note entry on divider add
    - _Requirements: 1.2, 1.3_

  - [x] 8.5 Write property test for divider creates note entry
    - **Property 2: Divider Creates Note Entry**
    - **Validates: Requirements 1.2**

- [x] 9. Enhance Journal Stream with Editing Capabilities
  - [x] 9.1 Add inline editing to JournalStream component
    - Make note title and content editable
    - Implement auto-save on blur or after delay
    - Update note timestamps on edit
    - _Requirements: 2.1, 2.7, 2.8, 2.9_

  - [x] 9.2 Implement basic markdown rendering
    - Parse and render markdown in note content display
    - Support h1, h2, h3, bullets, bold, italic, code
    - Use a lightweight markdown library (e.g., marked or markdown-it)
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 9.3 Write property test for content addition
    - **Property 3: Content Addition**
    - **Validates: Requirements 1.4**

  - [x] 9.4 Write unit tests for editing edge cases
    - Test concurrent edits
    - Test auto-save behavior
    - Test markdown rendering edge cases
    - _Requirements: 2.2, 2.8, 2.11_

- [ ] 10. Implement Task Management Component
  - [ ] 10.1 Create TaskPanel component
    - Display list of tasks from notes marked as tasks
    - Show task preview text from note content
    - Show tags and due dates
    - Implement task filtering (all, active, completed)
    - _Requirements: 3.2, 3.11, 3.12_

  - [ ] 10.2 Add task marking functionality to notes
    - Add "Mark as Task" button/shortcut to note entries
    - Create TaskMetadata when marking as task
    - Link task to note entry
    - _Requirements: 3.1_

  - [ ]* 10.3 Write property test for task creation linkage
    - **Property 6: Task Creation Linkage**
    - **Validates: Requirements 3.1**

  - [ ] 10.4 Implement task navigation
    - Click task in TaskPanel to navigate to note in JournalStream
    - Highlight note in stream when navigated from task
    - _Requirements: 3.3_

  - [ ]* 10.5 Write property test for task navigation
    - **Property 7: Task Navigation**
    - **Validates: Requirements 3.3**

  - [ ] 10.6 Implement task completion
    - Add checkbox for task completion in TaskPanel
    - Update task status when checked/unchecked
    - Preserve note entry when task is completed
    - _Requirements: 3.4_

  - [ ]* 10.7 Write property test for task completion preserves note
    - **Property 8: Task Completion Preserves Note**
    - **Validates: Requirements 3.4**

  - [ ] 10.8 Implement drag-and-drop task reordering
    - Add drag handles to tasks in TaskPanel
    - Implement drop zones between tasks
    - Update priority order on drop
    - Persist new order to storage
    - _Requirements: 3.5, 3.6_

  - [ ]* 10.9 Write property test for priority order persistence
    - **Property 9: Priority Order Persistence**
    - **Validates: Requirements 3.6**

  - [ ] 10.10 Implement tag management for tasks
    - Add tag input with autocomplete to TaskPanel
    - Display tags on tasks
    - Implement tag filtering
    - _Requirements: 3.7, 3.12_

  - [ ] 10.11 Implement due date management for tasks
    - Add date picker for due dates
    - Display due dates with color coding (pastel yellow for impending, pastel red for overdue)
    - Implement due date filtering
    - _Requirements: 3.8, 3.9, 3.10, 3.12_

- [ ] 11. Checkpoint - Core Features Complete
  - Ensure all core feature tests pass
  - Verify journal stream, editing, and tasks work together
  - Ask the user if questions arise

- [ ] 12. Implement Calendar Navigation
  - [ ] 12.1 Create Calendar component
    - Display month view with date grid
    - Highlight dates with notes (pastel green for created, pastel yellow for updated)
    - Handle date selection to navigate to notes
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ] 12.2 Build calendar index in IndexedDB
    - Index notes by creation date
    - Index notes by update date
    - Store in IndexedDB calendar-index store
    - Update index when notes are created/modified
    - _Requirements: 14.6_

  - [ ]* 12.3 Write property test for calendar date navigation
    - **Property 13: Calendar Date Navigation**
    - **Validates: Requirements 14.2**

  - [ ] 12.4 Implement keyboard navigation for calendar
    - Arrow keys for date navigation
    - Enter to select date
    - Escape to close calendar
    - _Requirements: 14.8_

- [ ] 13. Implement Search Functionality
  - [ ] 13.1 Create Search component
    - Add search input with keyboard shortcut
    - Display search results list
    - Highlight matching text in results
    - _Requirements: 13.3_

  - [ ] 13.2 Implement fuzzy text search with Fuse.js
    - Set up Fuse.js with note data
    - Configure search options (title and content)
    - Return ranked results
    - _Requirements: 13.1_

  - [ ]* 13.3 Write property test for fuzzy search matching
    - **Property 12: Fuzzy Search Matching**
    - **Validates: Requirements 13.1**

  - [ ] 13.4 Implement search result navigation
    - Click result to navigate to note in JournalStream
    - Scroll to note and highlight it
    - _Requirements: 13.4_

- [ ] 14. Implement Keyboard Shortcuts System
  - [ ] 14.1 Create KeyboardShortcutManager
    - Register all shortcuts (add divider, create task, search, calendar, undo, redo)
    - Handle key combinations with proper modifier keys
    - Prevent conflicts with browser shortcuts
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.7_

  - [ ]* 14.2 Write property test for keyboard shortcut execution
    - **Property 14: Keyboard Shortcut Execution**
    - **Validates: Requirements 15.1**

  - [ ] 14.3 Create keyboard shortcuts help menu
    - Display all available shortcuts
    - Make accessible via keyboard shortcut (e.g., Cmd+/)
    - _Requirements: 15.6_

- [ ] 15. Implement Undo/Redo System
  - [ ] 15.1 Create UndoRedoManager
    - Maintain action history stack
    - Implement undo operation
    - Implement redo operation
    - Clear redo stack on new action
    - _Requirements: 17.1, 17.2, 17.4_

  - [ ]* 15.2 Write property test for undo-redo round-trip
    - **Property 17: Undo-Redo Round-Trip**
    - **Validates: Requirements 17.1, 17.2**

  - [ ]* 15.3 Write property test for redo history clearing
    - **Property 18: Redo History Clearing**
    - **Validates: Requirements 17.4**

  - [ ] 15.4 Integrate undo/redo with all actions
    - Text edits in notes
    - Note creation and deletion
    - Divider insertion
    - Task operations (create, complete, reorder)
    - _Requirements: 17.3_

- [ ] 16. Implement Visual Design and Styling
  - [ ] 16.1 Create global CSS with pastel color palette
    - Define color variables (pastel green, yellow, red, off-white, dark gray)
    - Set up typography with sans-serif fonts
    - Create minimal, clean layouts
    - _Requirements: 18.1, 18.2, 18.3, 18.7, 18.8_

  - [ ] 16.2 Style Journal Stream component
    - Apply pastel colors to UI elements
    - Style dividers subtly
    - Hide scrollbars for infinite stream aesthetic
    - _Requirements: 18.8, 18.9_

  - [ ] 16.3 Style Task Panel component
    - Apply pastel colors for due dates (yellow for impending, red for overdue)
    - Style drag handles
    - Style tags with subtle backgrounds
    - _Requirements: 18.5, 18.6_

  - [ ] 16.4 Style Calendar component
    - Apply pastel green for dates with created notes
    - Apply pastel yellow for dates with updated notes
    - Handle dates with both colors (split or gradient)
    - _Requirements: 18.4_

- [ ] 17. Implement Authentication Flow
  - [ ] 17.1 Create login/password setup screen
    - First-time password creation UI
    - Returning user login UI
    - Password validation and feedback
    - _Requirements: 16.1, 16.2, 16.3_

  - [ ] 17.2 Implement password change functionality
    - Verify old password
    - Re-encrypt all data with new password
    - Update session with new password
    - _Requirements: 16.9_

  - [ ]* 17.3 Write property test for password change re-encryption
    - **Property 16: Password Change Re-encryption**
    - **Validates: Requirements 16.9**

- [ ] 18. Integration and Polish
  - [ ] 18.1 Wire all components together in App.tsx
    - Connect journal stream to storage
    - Connect tasks to notes
    - Connect calendar to stream
    - Connect search to stream
    - Integrate keyboard shortcuts globally
    - _Requirements: All_

  - [ ] 18.2 Add loading states and error handling
    - Show loading spinners during async operations
    - Display error messages with user-friendly text
    - Handle network failures gracefully
    - _Requirements: 9.5_

  - [ ] 18.3 Optimize performance
    - Implement debouncing for search input
    - Optimize re-renders with React.memo and useMemo
    - Test with 1000+ notes for performance
    - _Requirements: 1.8, 1.9_

  - [ ]* 18.4 Write integration tests for end-to-end flows
    - Test create note → add task → navigate → complete
    - Test search → navigate → edit
    - Test calendar → navigate → edit
    - _Requirements: All_

- [ ] 19. Final Checkpoint - Complete Application
  - Ensure all tests pass
  - Verify all features work together
  - Test with realistic data
  - Ask the user for final review

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Checkpoints ensure incremental validation
