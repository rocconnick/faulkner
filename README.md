# Journal Notes Application (Beta)

A journal-based notetaking application with a continuous stream interface for capturing thoughts chronologically.

## Project Structure

```
.
├── frontend/          # React + TypeScript + Vite frontend
├── backend/           # Python + FastAPI backend
└── .kiro/specs/       # Feature specifications
```

## Frontend Setup

The frontend is built with:
- React 19
- TypeScript
- Vite (build tool)
- Vitest (testing framework)
- React Testing Library
- fast-check (property-based testing)

### Frontend Commands

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Build for production
npm run build

# Lint code
npm run lint
```

## Backend Setup

The backend is built with:
- Python 3.9+
- FastAPI
- Uvicorn (ASGI server)
- pytest (testing framework)
- **uv** (fast Python package manager)

### Backend Commands

```bash
cd backend

# Install dependencies (creates .venv automatically)
uv sync

# Run development server
uv run uvicorn main:app --reload

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov

# Add a new dependency
uv add package-name
```

## Development

1. Start the backend server:
   ```bash
   cd backend
   uv run uvicorn main:app --reload
   ```

2. In a new terminal, start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`

## Testing

### Frontend Tests
- Unit tests: `npm test` in the `frontend/` directory
- Property-based tests use fast-check library
- Tests are located alongside source files with `.test.tsx` extension

### Backend Tests
- Unit tests: `pytest` in the `backend/` directory
- Tests are located in the `backend/tests/` directory

## Features (Beta Scope)

- ✅ Journal stream with dividers and markdown editing
- ✅ Task management with priorities, tags, and due dates
- ✅ Calendar and search navigation
- ✅ Local filesystem storage with encryption
- ✅ Keyboard shortcuts and undo/redo

## Future Enhancements

- AI features (chat, RAG, title generation)
- Cloud storage (AWS S3)
- Multi-device sync
- Native macOS and iOS apps

## License

Private project - All rights reserved
