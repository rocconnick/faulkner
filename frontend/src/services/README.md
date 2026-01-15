# Frontend Services

This directory contains the core services for the Journal Notes application frontend.

## Services Overview

### IndexedDBService
**File:** `IndexedDBService.ts`

Local caching layer using IndexedDB for offline support and performance.

**Features:**
- CRUD operations for notes
- User settings storage
- Calendar index management
- Batch operations
- Date range queries

**Usage:**
```typescript
const db = new IndexedDBService();
await db.initialize();

// Save a note
await db.saveNote(note);

// Get a note
const note = await db.getNote(noteId);

// List notes with filters
const notes = await db.listNotes({ isTask: true });
```

### ApiClient
**File:** `ApiClient.ts`

HTTP client for backend communication with authentication and error handling.

**Features:**
- Authentication (login, logout, password setup)
- CRUD operations for notes
- Automatic retries on network errors
- Request timeout handling
- Session token management

**Usage:**
```typescript
const client = new ApiClient({ baseUrl: 'http://localhost:8000' });

// Login
await client.login('password');

// Create a note
await client.createNote(note);

// List notes
const notes = await client.listNotes({ limit: 10 });
```

### StorageService
**File:** `StorageService.ts`

Unified storage layer combining IndexedDB and API client for offline-first architecture.

**Features:**
- Automatic local caching
- Backend synchronization when online
- Offline support with pending changes queue
- Conflict resolution
- Session persistence

**Usage:**
```typescript
const storage = new StorageService();
await storage.initialize();

// Login
await storage.login('password');

// Save a note (local + remote)
await storage.saveNote(note);

// List notes (cached + synced)
const notes = await storage.listNotes();

// Works offline - changes sync when back online
```

### EncryptionService
**File:** `EncryptionService.ts`

Client-side encryption using Web Crypto API (AES-256-GCM).

**Features:**
- PBKDF2 key derivation
- AES-256-GCM encryption
- Random salt and IV generation
- Secure password-based encryption

**Usage:**
```typescript
const encryption = new EncryptionService();

// Encrypt data
const encrypted = await encryption.encrypt('sensitive data', 'password');

// Decrypt data
const decrypted = await encryption.decrypt(encrypted, 'password');
```

## Architecture

```
┌─────────────────────────────────────────┐
│         StorageService                  │
│  (Unified Interface)                    │
└─────────────────────────────────────────┘
           │                    │
           ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  IndexedDBService│  │    ApiClient     │
│  (Local Cache)   │  │  (Backend API)   │
└──────────────────┘  └──────────────────┘
           │                    │
           ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│    IndexedDB     │  │  Backend Server  │
│   (Browser)      │  │   (FastAPI)      │
└──────────────────┘  └──────────────────┘
```

## Requirements Mapping

- **Requirement 7.2**: API client for backend communication
- **Requirement 9.1**: Immediate persistence to storage
- **Requirement 16.4, 16.7**: Client-side encryption

## Testing

All services have comprehensive test coverage:
- Unit tests for core functionality
- Property-based tests for encryption
- Integration tests for storage operations

Run tests:
```bash
npm test
```
