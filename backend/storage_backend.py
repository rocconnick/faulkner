"""
Storage backend interface and implementations for the Journal Notes application.

This module provides an abstract interface for data persistence operations
and concrete implementations for different storage backends.
"""

import os
import json
import asyncio
from pathlib import Path
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class NoteEntry(BaseModel):
    """Data model for a note entry."""
    id: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    divider_position: int
    is_task: bool
    task_metadata: Optional['TaskMetadata'] = None


class TaskMetadata(BaseModel):
    """Data model for task metadata."""
    priority: int
    tags: List[str]
    due_date: Optional[datetime] = None
    completed: bool
    completed_at: Optional[datetime] = None


class ListOptions(BaseModel):
    """Options for listing notes."""
    limit: Optional[int] = None
    offset: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_task: Optional[bool] = None


class StorageBackend(ABC):
    """Abstract interface for storage backend implementations."""
    
    @abstractmethod
    async def save_note(self, note: NoteEntry) -> None:
        """
        Save a note entry to storage.
        
        Args:
            note: The note entry to save
            
        Raises:
            StorageError: If the save operation fails
        """
        pass
    
    @abstractmethod
    async def get_note(self, note_id: str) -> Optional[NoteEntry]:
        """
        Retrieve a note entry by ID.
        
        Args:
            note_id: The unique identifier of the note
            
        Returns:
            The note entry if found, None otherwise
            
        Raises:
            StorageError: If the retrieval operation fails
        """
        pass
    
    @abstractmethod
    async def list_notes(self, options: Optional[ListOptions] = None) -> List[NoteEntry]:
        """
        List note entries with optional filtering.
        
        Args:
            options: Optional filtering and pagination options
            
        Returns:
            List of note entries matching the criteria
            
        Raises:
            StorageError: If the list operation fails
        """
        pass
    
    @abstractmethod
    async def delete_note(self, note_id: str) -> bool:
        """
        Delete a note entry by ID.
        
        Args:
            note_id: The unique identifier of the note to delete
            
        Returns:
            True if the note was deleted, False if not found
            
        Raises:
            StorageError: If the delete operation fails
        """
        pass
    
    @abstractmethod
    async def save_notes(self, notes: List[NoteEntry]) -> None:
        """
        Save multiple note entries in a batch operation.
        
        Args:
            notes: List of note entries to save
            
        Raises:
            StorageError: If the batch save operation fails
        """
        pass
    
    @abstractmethod
    async def get_notes_by_date_range(self, start_date: datetime, end_date: datetime) -> List[NoteEntry]:
        """
        Retrieve notes created or updated within a date range.
        
        Args:
            start_date: Start of the date range (inclusive)
            end_date: End of the date range (inclusive)
            
        Returns:
            List of note entries within the date range
            
        Raises:
            StorageError: If the retrieval operation fails
        """
        pass


class StorageError(Exception):
    """Exception raised for storage backend errors."""
    
    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(message)
        self.cause = cause


class LocalFSBackend(StorageBackend):
    """Local filesystem implementation of the storage backend."""
    
    def __init__(self, base_path: str, encryption_service, password: str):
        """
        Initialize the local filesystem backend.
        
        Args:
            base_path: Base directory path for storing notes
            encryption_service: Instance of EncryptionService for data encryption
            password: User password for encryption/decryption
        """
        import os
        import json
        import asyncio
        from pathlib import Path
        
        self.base_path = Path(base_path)
        self.notes_path = self.base_path / "notes"
        self.encryption_service = encryption_service
        self.password = password
        
        # Create directories if they don't exist
        self.notes_path.mkdir(parents=True, exist_ok=True)
    
    async def save_note(self, note: NoteEntry) -> None:
        """Save a note entry to the local filesystem."""
        try:
            # Convert note to JSON
            note_dict = note.model_dump()
            # Convert datetime objects to ISO strings for JSON serialization
            note_dict['created_at'] = note.created_at.isoformat()
            note_dict['updated_at'] = note.updated_at.isoformat()
            if note.task_metadata and note.task_metadata.due_date:
                note_dict['task_metadata']['due_date'] = note.task_metadata.due_date.isoformat()
            if note.task_metadata and note.task_metadata.completed_at:
                note_dict['task_metadata']['completed_at'] = note.task_metadata.completed_at.isoformat()
            
            note_json = json.dumps(note_dict)
            
            # Encrypt the JSON data
            encrypted_data = self.encryption_service.encrypt(note_json, self.password)
            
            # Write to file
            file_path = self.notes_path / f"{note.id}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(encrypted_data)
                
        except Exception as e:
            raise StorageError(f"Failed to save note {note.id}: {str(e)}", e)
    
    async def get_note(self, note_id: str) -> Optional[NoteEntry]:
        """Retrieve a note entry by ID from the local filesystem."""
        try:
            file_path = self.notes_path / f"{note_id}.json"
            
            if not file_path.exists():
                return None
            
            # Read encrypted data from file
            with open(file_path, 'r', encoding='utf-8') as f:
                encrypted_data = f.read()
            
            # Decrypt the data
            note_json = self.encryption_service.decrypt(encrypted_data, self.password)
            note_dict = json.loads(note_json)
            
            # Convert ISO strings back to datetime objects
            note_dict['created_at'] = datetime.fromisoformat(note_dict['created_at'])
            note_dict['updated_at'] = datetime.fromisoformat(note_dict['updated_at'])
            if note_dict.get('task_metadata'):
                task_meta = note_dict['task_metadata']
                if task_meta.get('due_date'):
                    task_meta['due_date'] = datetime.fromisoformat(task_meta['due_date'])
                if task_meta.get('completed_at'):
                    task_meta['completed_at'] = datetime.fromisoformat(task_meta['completed_at'])
                # Convert dict to TaskMetadata object
                note_dict['task_metadata'] = TaskMetadata(**task_meta)
            
            return NoteEntry(**note_dict)
            
        except FileNotFoundError:
            return None
        except Exception as e:
            raise StorageError(f"Failed to retrieve note {note_id}: {str(e)}", e)
    
    async def list_notes(self, options: Optional[ListOptions] = None) -> List[NoteEntry]:
        """List note entries with optional filtering."""
        try:
            notes = []
            
            # Get all note files
            if not self.notes_path.exists():
                return notes
            
            note_files = list(self.notes_path.glob("*.json"))
            
            # Load and decrypt each note
            for file_path in note_files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        encrypted_data = f.read()
                    
                    note_json = self.encryption_service.decrypt(encrypted_data, self.password)
                    note_dict = json.loads(note_json)
                    
                    # Convert ISO strings back to datetime objects
                    note_dict['created_at'] = datetime.fromisoformat(note_dict['created_at'])
                    note_dict['updated_at'] = datetime.fromisoformat(note_dict['updated_at'])
                    if note_dict.get('task_metadata'):
                        task_meta = note_dict['task_metadata']
                        if task_meta.get('due_date'):
                            task_meta['due_date'] = datetime.fromisoformat(task_meta['due_date'])
                        if task_meta.get('completed_at'):
                            task_meta['completed_at'] = datetime.fromisoformat(task_meta['completed_at'])
                        # Convert dict to TaskMetadata object
                        note_dict['task_metadata'] = TaskMetadata(**task_meta)
                    
                    note = NoteEntry(**note_dict)
                    notes.append(note)
                    
                except Exception as e:
                    # Log error but continue with other notes
                    print(f"Warning: Failed to load note from {file_path}: {str(e)}")
                    continue
            
            # Apply filtering if options provided
            if options:
                if options.start_date:
                    notes = [n for n in notes if n.created_at >= options.start_date]
                if options.end_date:
                    notes = [n for n in notes if n.created_at <= options.end_date]
                if options.is_task is not None:
                    notes = [n for n in notes if n.is_task == options.is_task]
            
            # Sort by creation date (chronological order)
            notes.sort(key=lambda n: n.created_at)
            
            # Apply pagination if specified
            if options and options.offset:
                notes = notes[options.offset:]
            if options and options.limit:
                notes = notes[:options.limit]
            
            return notes
            
        except Exception as e:
            raise StorageError(f"Failed to list notes: {str(e)}", e)
    
    async def delete_note(self, note_id: str) -> bool:
        """Delete a note entry by ID."""
        try:
            file_path = self.notes_path / f"{note_id}.json"
            
            if not file_path.exists():
                return False
            
            file_path.unlink()
            return True
            
        except Exception as e:
            raise StorageError(f"Failed to delete note {note_id}: {str(e)}", e)
    
    async def save_notes(self, notes: List[NoteEntry]) -> None:
        """Save multiple note entries in a batch operation."""
        errors = []
        
        for note in notes:
            try:
                await self.save_note(note)
            except StorageError as e:
                errors.append(f"Note {note.id}: {str(e)}")
        
        if errors:
            raise StorageError(f"Batch save failed for some notes: {'; '.join(errors)}")
    
    async def get_notes_by_date_range(self, start_date: datetime, end_date: datetime) -> List[NoteEntry]:
        """Retrieve notes created or updated within a date range."""
        try:
            options = ListOptions(start_date=start_date, end_date=end_date)
            notes = await self.list_notes(options)
            
            # Also include notes that were updated in the date range
            all_notes = await self.list_notes()
            updated_notes = [
                n for n in all_notes 
                if start_date <= n.updated_at <= end_date and n not in notes
            ]
            
            # Combine and sort
            combined_notes = notes + updated_notes
            combined_notes.sort(key=lambda n: n.created_at)
            
            return combined_notes
            
        except Exception as e:
            raise StorageError(f"Failed to get notes by date range: {str(e)}", e)