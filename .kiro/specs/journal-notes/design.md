# Design Document: Journal Notes Application (Beta)

## Overview

The Journal Notes application is a browser-based notetaking system that provides a continuous stream interface for capturing thoughts chronologically. The beta version focuses on core journaling and task management features with local storage, deferring AI capabilities and cloud sync to future releases.

### Key Design Principles

1. **Stream-First Interface**: Notes flow chronologically in an infinite scroll, bounded by dividers
2. **Keyboard-Driven**: All primary actions accessible via keyboard shortcuts with markdown-style formatting
3. **Privacy-First**: Client-side encryption ensures data remains private
4. **Local-First**: Beta focuses on local filesystem storage with full offline capability
5. **Minimal Aesthetic**: Clean, distraction-free interface with soft pastel color palette

### Beta Scope

The beta version includes:
- Journal stream with dividers and markdown editing
- Task management with priorities, tags, and due dates
- Calendar and search navigation
- Local filesystem storage with encryption
- Keyboard shortcuts and undo/redo

**Deferred to Future**:
- AI features (chat, RAG, title generation, AgentCore integration)
- Cloud storage (AWS S3)
- Multi-device sync
- Native macOS and iOS apps

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Application (Beta)              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────┐                     │
│  │   UI Layer   │  │  Storage Layer  │                     │
│  │              │  │                 │                     │
│  │ - Journal    │  │ - Encryption    │                     │
│  │   Stream     │  │ - Local Store   │                     │
│  │ - Task Panel │  │   (IndexedDB)   │                     │
│  │ - Calendar   │  │                 │                     │
│  │ - Search     │  │                 │                     │
│  └──────────────┘  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services (Beta)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────┐                     │
│  │  Web Server  │  │  Storage        │                     │
│  │              │  │  Backend        │                     │
│  │ - Static     │  │                 │                     │
│  │   Assets     │  │ - Local FS      │                     │
│  │ - API        │  │                 │                     │
│  │   Endpoints  │  │                 │                     │
│  └──────────────┘  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**:
- React or Vue.js for UI components
- ContentEditable API for markdown editor
- Web Crypto API (SubtleCrypto) for client-side encryption
- IndexedDB for local storage
- Fuse.js for fuzzy text search

**Backend**:
- Node.js/Express or Python/FastAPI for web server
- Local filesystem for storage (beta)

**Future Enhancements**:
- AWS S3 for cloud storage
- WebSocket for real-time sync
- AgentCore SDK for AI agent integration
- Vector database for RAG (Pinecone, Qdrant, or pgvector)
- Embedding model and LLM for AI features

## Components and Interfaces

### 1. Journal Stream Component

**Purpose**: Main interface for displaying and editing the continuous stream of notes.

**Key Features**:
- Infinite scroll with dynamic loading
- Context-aware pagination (loads target note + surrounding entries)
- Viewport-based unloading for performance
- Hidden scrollbars for seamless aesthetic

**Data Structure**:
```typescript
interface NoteEntry {
  id: string;
  title: string;
  content: string; // Markdown format
  createdAt: Date;
  updatedAt: Date;
  dividerPosition: number; // Position in stream
  isTask: boolean;
  taskMetadata?: TaskMetadata;
}

interface TaskMetadata {
  priority: number; // Drag-drop order
  tags: string[];
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;
}
```

**Rendering Strategy**:
- Load initial viewport: 10-15 entries
- On scroll: load 5-10 entries ahead/behind
- Unload entries >50 positions away from viewport
- Maintain scroll position during dynamic loading

### 2. Markdown Editor Component

**Purpose**: Real-time markdown formatting with keyboard-driven interface.

**Implementation Approach**:
- Use ContentEditable div with custom markdown parser
- Intercept keyboard input to detect markdown syntax
- Apply formatting in real-time without mode switching
- Preserve cursor position during formatting

**Supported Markdown**:
- Headers: `#`, `##`, `###`
- Lists: `-`, `*` for bullets
- Bold: `**text**`
- Italic: `*text*`
- Code: `` `code` ``

**Technical Details**:
```javascript
// Pseudo-code for markdown detection
onKeyPress(event) {
  const line = getCurrentLine();
  
  if (line.startsWith('# ')) {
    applyFormatting('h1');
    removeMarkdownSyntax();
  } else if (line.startsWith('## ')) {
    applyFormatting('h2');
    removeMarkdownSyntax();
  }
  // ... other patterns
}
```

### 3. Task Management Component

**Purpose**: Sidebar panel for viewing, organizing, and filtering tasks.

**Features**:
- Drag-and-drop reordering
- Tag management with autocomplete
- Due date picker
- Visual indicators (yellow for impending, red for overdue)
- Filter by tag, due date, completion status

**UI Layout**:
```
┌─────────────────────────┐
│  Tasks                  │
├─────────────────────────┤
│  [Filter: All ▼]        │
│  [Tags: work, personal] │
├─────────────────────────┤
│  ☐ Task 1               │
│     #work 📅 Tomorrow   │
│     "Preview text..."   │
├─────────────────────────┤
│  ☐ Task 2               │
│     #personal 📅 Today  │
│     "Preview text..."   │
└─────────────────────────┘
```

### 4. Storage Backend (Local Filesystem)

**Purpose**: Unified interface for data persistence on local filesystem.

**Interface**:
```typescript
interface StorageBackend {
  // CRUD operations
  async saveNote(note: NoteEntry): Promise<void>;
  async getNote(id: string): Promise<NoteEntry>;
  async listNotes(options: ListOptions): Promise<NoteEntry[]>;
  async deleteNote(id: string): Promise<void>;
  
  // Batch operations
  async saveNotes(notes: NoteEntry[]): Promise<void>;
  async getNotesByDateRange(start: Date, end: Date): Promise<NoteEntry[]>;
}
```

**Local Filesystem Implementation**:
```typescript
class LocalFSBackend implements StorageBackend {
  private basePath: string = './data/notes';
  
  async saveNote(note: NoteEntry): Promise<void> {
    const encrypted = await encrypt(JSON.stringify(note), userPassword);
    await fs.writeFile(`${this.basePath}/${note.id}.json`, encrypted);
  }
  
  async listNotes(options: ListOptions): Promise<NoteEntry[]> {
    const files = await fs.readdir(this.basePath);
    const notes = await Promise.all(
      files.map(async (file) => {
        const encrypted = await fs.readFile(`${this.basePath}/${file}`);
        const decrypted = await decrypt(encrypted, userPassword);
        return JSON.parse(decrypted);
      })
    );
    return notes.sort((a, b) => a.createdAt - b.createdAt);
  }
  
  // ... other methods
}
```

### 5. Encryption Service

**Purpose**: Client-side encryption/decryption of all data before storage.

**Algorithm**: AES-256-GCM via Web Crypto API

**Key Derivation**: PBKDF2 with user password

**Implementation**:
```typescript
class EncryptionService {
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  async encrypt(data: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      new TextEncoder().encode(data)
    );
    
    // Combine salt + iv + encrypted data
    return base64Encode(salt, iv, encrypted);
  }
  
  async decrypt(encryptedData: string, password: string): Promise<string> {
    const { salt, iv, data } = base64Decode(encryptedData);
    const key = await this.deriveKey(password, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  }
}
```

### 6. Calendar Navigation Component

**Purpose**: Browse notes by creation or modification date.

**UI Design**:
- Month view with highlighted dates
- Green highlight for dates with created notes
- Yellow highlight for dates with updated notes
- Dates with both show both colors (split or gradient)
- Click date to jump to notes from that day
- Keyboard navigation (arrow keys)

**Data Structure**:
```typescript
interface CalendarIndex {
  [date: string]: {
    created: string[];  // Note IDs created on this date
    updated: string[];  // Note IDs updated on this date
  };
}

// Example:
{
  "2026-01-14": {
    created: ["note-123", "note-456"],
    updated: ["note-789"]
  },
  "2026-01-13": {
    created: ["note-789"],
    updated: []
  }
}
```

**Visual Representation**:
```
Calendar View:
┌─────────────────────────────────┐
│  January 2026                   │
├─────────────────────────────────┤
│  S  M  T  W  T  F  S           │
│           1  2  3  4           │
│  5  6  7  8  9 10 11           │
│ 12 [13][14]15 16 17 18         │
│                                 │
│  Legend:                        │
│  [Pastel Green] = Created       │
│  [Pastel Yellow] = Updated      │
└─────────────────────────────────┘

Where:
- Day 13: Pastel green (notes created)
- Day 14: Pastel green + yellow (notes created and updated)
```

**Color Palette**:
- Created notes: Soft pastel green (#C8E6C9 or similar)
- Updated notes: Soft pastel yellow (#FFF9C4 or similar)
- Background: Off-white (#FAFAFA)
- Text: Dark gray (#333333)
- Dividers: Light gray (#E0E0E0)
- Task due date (impending): Pastel yellow (#FFF9C4)
- Task due date (overdue): Pastel red/pink (#FFCDD2)

### 7. Search Component

**Purpose**: Find notes using fuzzy text matching.

**Implementation**:
- Use Fuse.js for fuzzy text search
- Search across title and content
- Highlight matching text in results

**UI**:
```
┌─────────────────────────────────┐
│  Search: [____________]  🔍     │
├─────────────────────────────────┤
│  Results (12)                   │
│                                 │
│  ○ Meeting notes - Jan 14      │
│     "Discussed project..."      │
│                                 │
│  ○ Ideas for app - Jan 13      │
│     "Could add feature..."      │
└─────────────────────────────────┘
```

**Implementation**:
```typescript
import Fuse from 'fuse.js';

function setupSearch(notes: NoteEntry[]) {
  const fuse = new Fuse(notes, {
    keys: ['title', 'content'],
    threshold: 0.3, // Fuzzy matching tolerance
    includeMatches: true
  });
  
  return (query: string) => fuse.search(query);
}
```

## Data Models

### Core Data Schema

```typescript
// Note Entry
interface NoteEntry {
  id: string;                    // UUID
  title: string;                 // User-provided title
  content: string;               // Markdown content
  createdAt: Date;
  updatedAt: Date;
  dividerPosition: number;       // Order in stream
  isTask: boolean;
  taskMetadata?: TaskMetadata;
}

// Task Metadata
interface TaskMetadata {
  priority: number;              // Drag-drop order (0 = highest)
  tags: string[];                // Custom tags
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;
}

// User Settings
interface UserSettings {
  userId: string;
  passwordHash: string;          // For authentication
  encryptionSalt: string;        // For key derivation
  theme: 'light' | 'dark';       // Future: dark mode
  keyboardShortcuts: KeyboardShortcutMap;
}

// Keyboard Shortcuts
interface KeyboardShortcutMap {
  addDivider: string;            // Default: Cmd+Enter
  createTask: string;            // Default: Cmd+T
  openSearch: string;            // Default: Cmd+K
  openCalendar: string;          // Default: Cmd+D
  undo: string;                  // Default: Cmd+Z
  redo: string;                  // Default: Cmd+Shift+Z
}
```

### Storage Format

**Local Storage (IndexedDB)**:
```
Database: journal-notes
  Store: notes
    - Key: note.id
    - Value: Encrypted NoteEntry
  
  Store: settings
    - Key: 'user-settings'
    - Value: UserSettings
  
  Store: calendar-index
    - Key: ISO date string
    - Value: Array of note IDs
```

**Remote Storage (Local Filesystem)**:
```
Directory: ./data/journal-notes/
  /notes/{noteId}.json          - Encrypted note
  /settings/user.json           - User settings
  /index/calendar.json          - Calendar index
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Chronological Ordering

*For any* collection of note entries, when displayed in the journal stream, they should appear in chronological order based on their creation timestamps.

**Validates: Requirements 1.1**

### Property 2: Divider Creates Note Entry

*For any* journal stream state, when a divider is added, a new note entry should be created immediately below that divider.

**Validates: Requirements 1.2**

### Property 3: Content Addition

*For any* note entry and any text content, when the user types content, it should be added to the current note entry without loss.

**Validates: Requirements 1.4**

### Property 4: Context-Aware Loading

*For any* note entry accessed via calendar or search, the journal stream should load that entry plus surrounding entries (before and after) for context.

**Validates: Requirements 1.7**

### Property 5: Markdown Formatting Application

*For any* supported markdown syntax (h1, h2, h3, bullets), when typed, the corresponding formatting should be applied in real-time.

**Validates: Requirements 2.2**

### Property 6: Task Creation Linkage

*For any* note entry marked as a task, a task marker should be created that links back to that note entry's location in the stream.

**Validates: Requirements 3.1**

### Property 7: Task Navigation

*For any* task marker, when selected, the journal stream should navigate to and highlight the associated note entry.

**Validates: Requirements 3.3**

### Property 8: Task Completion Preserves Note

*For any* task marker, when marked as complete, the task status should update but the associated note entry should remain unchanged in the stream.

**Validates: Requirements 3.4**

### Property 9: Priority Order Persistence

*For any* task marker reordered via drag-and-drop, the new priority order should be persisted to storage.

**Validates: Requirements 3.6**

### Property 10: Immediate Persistence

*For any* note entry creation or modification, the changes should be persisted to storage immediately without delay.

**Validates: Requirements 9.1**

### Property 11: Structured Data Format

*For any* data stored by the storage backend, it should be in a valid structured format (JSON) that can be parsed without errors.

**Validates: Requirements 9.4**

### Property 12: Fuzzy Search Matching

*For any* search query, the fuzzy text search should return note entries that contain text matching the query (with tolerance for typos).

**Validates: Requirements 13.1**

### Property 13: Calendar Date Navigation

*For any* date selected in the calendar view, the journal stream should navigate to and display all note entries that were either created or updated on that specific date, with visual distinction between created (green) and updated (yellow) notes.

**Validates: Requirements 14.2**

### Property 14: Keyboard Shortcut Execution

*For any* registered keyboard shortcut (add divider, create task, open search, etc.), pressing the shortcut should execute the corresponding action.

**Validates: Requirements 15.1**

### Property 15: Encryption Round-Trip

*For any* note entry, encrypting it with a password and then decrypting with the same password should produce the original note entry data.

**Validates: Requirements 16.4, 16.7**

### Property 16: Password Change Re-encryption

*For any* password change operation, all existing encrypted data should be re-encrypted with the new password and remain accessible.

**Validates: Requirements 16.9**

### Property 17: Undo-Redo Round-Trip

*For any* action (text edit, note creation, divider insertion, task operation), performing undo followed by redo should restore the state to what it was before the undo.

**Validates: Requirements 17.1, 17.2**

### Property 18: Redo History Clearing

*For any* undo operation followed by a new action, the redo history should be cleared and the undone action should no longer be redoable.

**Validates: Requirements 17.4**

## Error Handling

### Client-Side Errors

**Encryption Failures**:
- Scenario: Password incorrect, key derivation fails
- Handling: Display clear error message, prompt for correct password
- Recovery: Allow retry with password reset option

**Storage Quota Exceeded**:
- Scenario: IndexedDB or local storage full
- Handling: Notify user, suggest cleanup or export
- Recovery: Provide tools to archive old notes

**AI Service Unavailable** (Future):
- Scenario: AgentCore or LLM service down
- Handling: Disable AI features gracefully, show status message
- Recovery: Continue allowing note-taking, retry AI features periodically

### Server-Side Errors

**Storage Backend Failures**:
- Scenario: Filesystem errors, permission issues
- Handling: Log error, return 500 status
- Recovery: Implement retry logic with exponential backoff

**Authentication Failures**:
- Scenario: Invalid credentials, expired sessions
- Handling: Return 401 status, prompt re-authentication
- Recovery: Redirect to login, preserve unsaved changes

### Data Integrity Errors

**Corrupted Data**:
- Scenario: Decryption fails, JSON parse errors
- Handling: Attempt recovery from backup, log error
- Recovery: Restore from last known good state

**Missing References**:
- Scenario: Task marker references deleted note
- Handling: Mark task as orphaned, allow cleanup
- Recovery: Provide UI to remove orphaned tasks

## Testing Strategy

### Dual Testing Approach

The application will use both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests**:
- Specific examples demonstrating correct behavior
- Edge cases (empty notes, special characters, boundary conditions)
- Error conditions (invalid input, storage failures)
- Integration points between components

**Property-Based Tests**:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number

### Property-Based Testing Configuration

**Framework**: fast-check (JavaScript/TypeScript)

**Test Structure**:
```typescript
// Example property test
describe('Feature: journal-notes, Property 1: Chronological Ordering', () => {
  it('should display notes in chronological order', () => {
    fc.assert(
      fc.property(
        fc.array(noteEntryArbitrary(), { minLength: 2, maxLength: 50 }),
        (notes) => {
          const stream = new JournalStream(notes);
          const displayed = stream.getDisplayedNotes();
          
          // Verify chronological order
          for (let i = 1; i < displayed.length; i++) {
            expect(displayed[i].createdAt >= displayed[i-1].createdAt).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Generators (Arbitraries)**:
```typescript
// Custom generators for property tests
function noteEntryArbitrary(): fc.Arbitrary<NoteEntry> {
  return fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 0, maxLength: 5000 }),
    createdAt: fc.date(),
    updatedAt: fc.date(),
    dividerPosition: fc.nat(),
    isTask: fc.boolean(),
    taskMetadata: fc.option(taskMetadataArbitrary())
  });
}

function taskMetadataArbitrary(): fc.Arbitrary<TaskMetadata> {
  return fc.record({
    priority: fc.nat(),
    tags: fc.array(fc.string(), { maxLength: 10 }),
    dueDate: fc.option(fc.date()),
    completed: fc.boolean(),
    completedAt: fc.option(fc.date())
  });
}
```

### Unit Test Coverage

**Components to Test**:
1. Markdown Editor: Formatting application, cursor position
2. Encryption Service: Key derivation, encryption/decryption
3. Storage Backend: CRUD operations, error handling
4. Task Management: Drag-drop, filtering, due date calculations
5. Calendar Navigation: Date indexing, navigation
6. Search: Fuzzy matching, result ranking

**Example Unit Tests**:
```typescript
describe('EncryptionService', () => {
  it('should encrypt and decrypt data correctly', async () => {
    const service = new EncryptionService();
    const data = 'sensitive note content';
    const password = 'user-password-123';
    
    const encrypted = await service.encrypt(data, password);
    const decrypted = await service.decrypt(encrypted, password);
    
    expect(decrypted).toBe(data);
  });
  
  it('should fail decryption with wrong password', async () => {
    const service = new EncryptionService();
    const data = 'sensitive note content';
    const encrypted = await service.encrypt(data, 'correct-password');
    
    await expect(
      service.decrypt(encrypted, 'wrong-password')
    ).rejects.toThrow();
  });
});
```

### Integration Testing

**End-to-End Scenarios**:
1. Create note → Add task → Navigate via task list → Complete task
2. Write note → Add title → Edit content → Verify persistence
3. Search notes → Click result → Verify navigation
4. Calendar navigation → Select date → Verify notes displayed
5. Keyboard shortcuts → Verify all actions work

**Testing Tools**:
- Playwright or Cypress for browser automation
- Mock storage backends for isolation

### Performance Testing

**Metrics to Monitor**:
- Initial load time (target: <2s)
- Scroll performance with 1000+ notes (target: 60fps)
- Search response time (target: <500ms)

**Load Testing**:
- Test with 10,000+ notes
- Test with large note content (10,000+ characters)

### Security Testing

**Encryption Validation**:
- Verify encrypted data is not readable without password
- Test key derivation with various password strengths
- Validate salt and IV randomness

**Authentication Testing**:
- Test password validation
- Test session management
- Test password change flow

## Deployment Architecture

### Beta Phase (Local Deployment)

```
┌─────────────────────────────────────┐
│  Developer Machine                  │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐ │
│  │  Node.js Server               │ │
│  │  - Serves static files        │ │
│  │  - API endpoints              │ │
│  │  - Port: 3000                 │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Local Filesystem             │ │
│  │  - ./data/notes/              │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Browser (localhost:3000)           │
│  - React/Vue app                    │
│  - IndexedDB for local cache        │
└─────────────────────────────────────┘
```

## Future Enhancements

### AI Features

**Title Generation**:
- Automatically generate concise titles for note entries
- Use fast LLM (GPT-3.5-turbo or similar via AgentCore)
- Allow manual override

**AI Chat Sidebar**:
- Conversational interface for querying notes
- RAG-powered semantic search
- Citation of source notes
- Persistent conversation memory

**Smart Suggestions**:
- Related note recommendations
- Auto-tagging based on content
- Writing style analysis

### Cloud Storage and Sync

**AWS S3 Backend**:
- Migrate from local filesystem to S3
- Maintain encryption at rest
- Implement versioning for note history

**Multi-Device Sync**:
- WebSocket for real-time updates
- Conflict resolution (last-write-wins with notification)
- Offline queue with sync on reconnection

### Native Applications

**macOS Desktop App**:
- Electron or Tauri for cross-platform
- Better system integration
- Native notifications
- Menu bar integration

**iOS Mobile App**:
- React Native or Swift
- Quick note capture
- Voice-to-text input
- Widget for recent notes

### Collaboration Features

**Shared Journals**:
- Invite others to view/edit specific notes
- Comment threads on notes
- Activity feed

**Team Workspaces**:
- Shared task lists
- Team chat with note context
- Permission management

## References

**Encryption Standards**:
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - MDN documentation
- [Client-side Encryption](https://en.wikipedia.org/wiki/Client-side_encryption) - Wikipedia overview
- Content rephrased for compliance with licensing restrictions
