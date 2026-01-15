from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
import hashlib
from pydantic import BaseModel

from storage_backend import (
    NoteEntry,
    TaskMetadata,
    ListOptions,
    LocalFSBackend,
    StorageError
)
from encryption_service import EncryptionService

app = FastAPI(title="Journal Notes API", version="0.1.0")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage backend instance (will be initialized with authentication)
storage_backend: Optional[LocalFSBackend] = None

# Session management
sessions = {}  # session_token -> {"password": str, "expires_at": datetime}
SESSION_DURATION = timedelta(hours=24)


# Authentication models
class LoginRequest(BaseModel):
    """Request model for login."""
    password: str


class LoginResponse(BaseModel):
    """Response model for login."""
    session_token: str
    message: str


class SetupPasswordRequest(BaseModel):
    """Request model for initial password setup."""
    password: str


# Request/Response models
class CreateNoteRequest(BaseModel):
    """Request model for creating a note."""
    id: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    divider_position: int
    is_task: bool
    task_metadata: Optional[TaskMetadata] = None


class UpdateNoteRequest(BaseModel):
    """Request model for updating a note."""
    title: Optional[str] = None
    content: Optional[str] = None
    updated_at: Optional[datetime] = None
    divider_position: Optional[int] = None
    is_task: Optional[bool] = None
    task_metadata: Optional[TaskMetadata] = None


class ListNotesQuery(BaseModel):
    """Query parameters for listing notes."""
    limit: Optional[int] = None
    offset: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_task: Optional[bool] = None


# Helper functions for authentication
def hash_password(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return hash_password(password) == password_hash


def create_session(password: str) -> str:
    """Create a new session and return the session token."""
    session_token = secrets.token_urlsafe(32)
    sessions[session_token] = {
        "password": password,
        "expires_at": datetime.now() + SESSION_DURATION
    }
    return session_token


def get_session(session_token: str) -> Optional[dict]:
    """Get session data if valid, None otherwise."""
    session = sessions.get(session_token)
    if session and session["expires_at"] > datetime.now():
        return session
    elif session:
        # Session expired, remove it
        del sessions[session_token]
    return None


def cleanup_expired_sessions():
    """Remove expired sessions."""
    now = datetime.now()
    expired = [token for token, data in sessions.items() if data["expires_at"] <= now]
    for token in expired:
        del sessions[token]


# Dependency to get authenticated session
async def get_authenticated_session(authorization: Optional[str] = Header(None)) -> dict:
    """
    Verify authentication and return session data.
    
    Requirements: 16.1, 16.2, 16.3
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>" format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    session_token = parts[1]
    session = get_session(session_token)
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return session


# Dependency to get storage backend with authenticated password
def get_storage_backend(session: dict = Depends(get_authenticated_session)) -> LocalFSBackend:
    """
    Get the storage backend instance with authenticated password.
    
    Requirements: 16.1, 16.2, 16.3
    """
    global storage_backend
    
    # Initialize storage backend with user's password
    if storage_backend is None or storage_backend.password != session["password"]:
        encryption_service = EncryptionService()
        storage_backend = LocalFSBackend(
            base_path="./data",
            encryption_service=encryption_service,
            password=session["password"]
        )
    
    return storage_backend


@app.get("/")
async def root():
    return {"message": "Journal Notes API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and create session.
    
    Requirements: 16.1, 16.2, 16.3
    """
    try:
        # For beta, we verify password by attempting to decrypt a test note
        # In production, we'd check against stored password hash
        encryption_service = EncryptionService()
        test_backend = LocalFSBackend(
            base_path="./data",
            encryption_service=encryption_service,
            password=request.password
        )
        
        # Try to list notes to verify password
        # If password is wrong, decryption will fail
        try:
            await test_backend.list_notes()
        except Exception as e:
            # Password verification failed
            raise HTTPException(status_code=401, detail="Invalid password")
        
        # Create session
        session_token = create_session(request.password)
        
        # Cleanup expired sessions
        cleanup_expired_sessions()
        
        return LoginResponse(
            session_token=session_token,
            message="Login successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.post("/api/auth/setup", response_model=LoginResponse)
async def setup_password(request: SetupPasswordRequest):
    """
    Set up initial password for first-time users.
    
    Requirements: 16.1
    """
    try:
        # Check if any notes already exist (indicating password already set up)
        encryption_service = EncryptionService()
        test_backend = LocalFSBackend(
            base_path="./data",
            encryption_service=encryption_service,
            password=request.password
        )
        
        notes = await test_backend.list_notes()
        if notes:
            raise HTTPException(status_code=400, detail="Password already set up")
        
        # Create session for new user
        session_token = create_session(request.password)
        
        return LoginResponse(
            session_token=session_token,
            message="Password setup successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password setup failed: {str(e)}")


@app.post("/api/auth/logout", status_code=204)
async def logout(session: dict = Depends(get_authenticated_session), authorization: Optional[str] = Header(None)):
    """
    Logout user and invalidate session.
    
    Requirements: 16.2
    """
    if authorization:
        parts = authorization.split()
        if len(parts) == 2:
            session_token = parts[1]
            if session_token in sessions:
                del sessions[session_token]
    
    return None


@app.post("/api/notes", response_model=NoteEntry, status_code=201)
async def create_note(
    note_request: CreateNoteRequest,
    backend: LocalFSBackend = Depends(get_storage_backend)
):
    """
    Create a new note entry.
    
    Requirements: 7.2, 9.1
    """
    try:
        # Convert request to NoteEntry
        note = NoteEntry(**note_request.model_dump())
        
        # Save to storage
        await backend.save_note(note)
        
        return note
        
    except StorageError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create note: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")


@app.get("/api/notes/{note_id}", response_model=NoteEntry)
async def get_note(
    note_id: str,
    backend: LocalFSBackend = Depends(get_storage_backend)
):
    """
    Get a note entry by ID.
    
    Requirements: 7.2, 9.1
    """
    try:
        note = await backend.get_note(note_id)
        
        if note is None:
            raise HTTPException(status_code=404, detail=f"Note {note_id} not found")
        
        return note
        
    except HTTPException:
        raise
    except StorageError as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve note: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")


@app.put("/api/notes/{note_id}", response_model=NoteEntry)
async def update_note(
    note_id: str,
    update_request: UpdateNoteRequest,
    backend: LocalFSBackend = Depends(get_storage_backend)
):
    """
    Update a note entry.
    
    Requirements: 7.2, 9.1
    """
    try:
        # Get existing note
        note = await backend.get_note(note_id)
        
        if note is None:
            raise HTTPException(status_code=404, detail=f"Note {note_id} not found")
        
        # Update fields that were provided
        update_data = update_request.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(note, field, value)
        
        # Ensure updated_at is set
        if 'updated_at' not in update_data:
            note.updated_at = datetime.now()
        
        # Save updated note
        await backend.save_note(note)
        
        return note
        
    except HTTPException:
        raise
    except StorageError as e:
        raise HTTPException(status_code=500, detail=f"Failed to update note: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")


@app.delete("/api/notes/{note_id}", status_code=204)
async def delete_note(
    note_id: str,
    backend: LocalFSBackend = Depends(get_storage_backend)
):
    """
    Delete a note entry.
    
    Requirements: 7.2, 9.1
    """
    try:
        deleted = await backend.delete_note(note_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Note {note_id} not found")
        
        return None
        
    except HTTPException:
        raise
    except StorageError as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete note: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")


@app.get("/api/notes", response_model=List[NoteEntry])
async def list_notes(
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    is_task: Optional[bool] = None,
    backend: LocalFSBackend = Depends(get_storage_backend)
):
    """
    List notes with optional filtering.
    
    Requirements: 7.2, 9.1
    """
    try:
        # Build list options
        options = ListOptions(
            limit=limit,
            offset=offset,
            start_date=start_date,
            end_date=end_date,
            is_task=is_task
        )
        
        # Get notes from storage
        notes = await backend.list_notes(options)
        
        return notes
        
    except StorageError as e:
        raise HTTPException(status_code=500, detail=f"Failed to list notes: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
