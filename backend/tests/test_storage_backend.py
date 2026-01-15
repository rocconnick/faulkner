"""
Tests for the storage backend implementations.

This module contains both unit tests and property-based tests for the storage backend.
"""

import pytest
import tempfile
import shutil
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from hypothesis import given, strategies as st, settings
from hypothesis.strategies import composite

from storage_backend import (
    NoteEntry, TaskMetadata, ListOptions, StorageBackend, 
    LocalFSBackend, StorageError
)
from encryption_service import EncryptionService


# Test fixtures
@pytest.fixture
def temp_dir():
    """Create a temporary directory for testing."""
    temp_path = tempfile.mkdtemp()
    yield temp_path
    shutil.rmtree(temp_path)


@pytest.fixture
def encryption_service():
    """Create an encryption service instance."""
    return EncryptionService()


@pytest.fixture
def storage_backend(temp_dir, encryption_service):
    """Create a LocalFSBackend instance for testing."""
    return LocalFSBackend(temp_dir, encryption_service, "test-password-123")


# Hypothesis strategies for generating test data
@composite
def task_metadata_strategy(draw):
    """Generate TaskMetadata instances."""
    return TaskMetadata(
        priority=draw(st.integers(min_value=0, max_value=1000)),
        tags=draw(st.lists(st.text(min_size=1, max_size=20), max_size=5)),
        due_date=draw(st.one_of(st.none(), st.datetimes(
            min_value=datetime(2020, 1, 1),
            max_value=datetime(2030, 12, 31)
        ).map(lambda dt: dt.replace(tzinfo=timezone.utc)))),
        completed=draw(st.booleans()),
        completed_at=draw(st.one_of(st.none(), st.datetimes(
            min_value=datetime(2020, 1, 1),
            max_value=datetime(2030, 12, 31)
        ).map(lambda dt: dt.replace(tzinfo=timezone.utc))))
    )


@composite
def note_entry_strategy(draw):
    """Generate NoteEntry instances."""
    created_at = draw(st.datetimes(
        min_value=datetime(2020, 1, 1),
        max_value=datetime(2030, 12, 31)
    )).replace(tzinfo=timezone.utc)
    
    updated_at = draw(st.datetimes(
        min_value=created_at.replace(tzinfo=None),
        max_value=datetime(2030, 12, 31)
    )).replace(tzinfo=timezone.utc)
    
    is_task = draw(st.booleans())
    task_metadata = draw(task_metadata_strategy()) if is_task else None
    
    return NoteEntry(
        id=draw(st.text(min_size=1, max_size=50, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd'), 
            whitelist_characters='-_'
        ))),
        title=draw(st.text(min_size=0, max_size=200)),
        content=draw(st.text(min_size=0, max_size=5000)),
        created_at=created_at,
        updated_at=updated_at,
        divider_position=draw(st.integers(min_value=0, max_value=10000)),
        is_task=is_task,
        task_metadata=task_metadata
    )


# Property-based tests
class TestStorageBackendProperties:
    """Property-based tests for storage backend."""
    
    @given(note_entry_strategy())
    @settings(max_examples=100, deadline=None)
    @pytest.mark.asyncio
    async def test_immediate_persistence_property(self, note):
        """
        Feature: journal-notes, Property 10: Immediate Persistence
        
        For any note entry creation or modification, the changes should be 
        persisted to storage immediately without delay.
        
        **Validates: Requirements 9.1**
        """
        # Create a fresh storage backend for each test
        with tempfile.TemporaryDirectory() as temp_dir:
            encryption_service = EncryptionService()
            storage_backend = LocalFSBackend(temp_dir, encryption_service, "test-password-123")
            
            # Save the note
            await storage_backend.save_note(note)
            
            # Immediately try to retrieve it - should be available
            retrieved_note = await storage_backend.get_note(note.id)
            
            # The note should be immediately available
            assert retrieved_note is not None
            assert retrieved_note.id == note.id
            assert retrieved_note.title == note.title
            assert retrieved_note.content == note.content
            assert retrieved_note.created_at == note.created_at
            assert retrieved_note.updated_at == note.updated_at
            assert retrieved_note.divider_position == note.divider_position
            assert retrieved_note.is_task == note.is_task
            assert retrieved_note.task_metadata == note.task_metadata


# Unit tests for error handling
class TestStorageBackendErrorHandling:
    """Unit tests for storage backend error handling."""
    
    @pytest.mark.asyncio
    async def test_file_not_found_handling(self, storage_backend):
        """Test handling of file not found errors."""
        # Try to get a note that doesn't exist
        result = await storage_backend.get_note("nonexistent-note-id")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_permission_errors(self, temp_dir, encryption_service):
        """Test handling of permission errors."""
        # Create a directory structure where we can control permissions
        test_path = Path(temp_dir) / "test_storage"
        test_path.mkdir()
        
        # Create the backend first (this creates the notes directory)
        backend = LocalFSBackend(str(test_path), encryption_service, "test-password")
        
        # Now make the notes directory read-only
        notes_path = test_path / "notes"
        notes_path.chmod(0o444)  # Read-only
        
        try:
            # Create a test note
            note = NoteEntry(
                id="test-note",
                title="Test Note",
                content="Test content",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                divider_position=0,
                is_task=False
            )
            
            # Saving should raise a StorageError due to permission issues
            with pytest.raises(StorageError):
                await backend.save_note(note)
                
        finally:
            # Restore permissions for cleanup
            notes_path.chmod(0o755)
    
    @pytest.mark.asyncio
    async def test_corrupted_data_recovery(self, storage_backend, temp_dir):
        """Test handling of corrupted data recovery."""
        # Create a corrupted file
        notes_path = Path(temp_dir) / "notes"
        corrupted_file = notes_path / "corrupted-note.json"
        
        # Write invalid encrypted data
        with open(corrupted_file, 'w') as f:
            f.write("invalid-encrypted-data")
        
        # Trying to get the corrupted note should raise StorageError
        with pytest.raises(StorageError):
            await storage_backend.get_note("corrupted-note")
    
    @pytest.mark.asyncio
    async def test_invalid_json_handling(self, storage_backend, temp_dir, encryption_service):
        """Test handling of invalid JSON data."""
        # Create a file with valid encryption but invalid JSON
        notes_path = Path(temp_dir) / "notes"
        invalid_json_file = notes_path / "invalid-json.json"
        
        # Encrypt invalid JSON
        invalid_json = "{ invalid json content"
        encrypted_invalid = encryption_service.encrypt(invalid_json, "test-password-123")
        
        with open(invalid_json_file, 'w') as f:
            f.write(encrypted_invalid)
        
        # Trying to get the note should raise StorageError
        with pytest.raises(StorageError):
            await storage_backend.get_note("invalid-json")
    
    @pytest.mark.asyncio
    async def test_wrong_password_handling(self, temp_dir, encryption_service):
        """Test handling of wrong password during decryption."""
        # Create backend with one password
        backend1 = LocalFSBackend(temp_dir, encryption_service, "password1")
        
        # Save a note
        note = NoteEntry(
            id="test-note",
            title="Test Note",
            content="Test content",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            divider_position=0,
            is_task=False
        )
        await backend1.save_note(note)
        
        # Create another backend with different password
        backend2 = LocalFSBackend(temp_dir, encryption_service, "password2")
        
        # Trying to read with wrong password should raise StorageError
        with pytest.raises(StorageError):
            await backend2.get_note("test-note")
    
    @pytest.mark.asyncio
    async def test_batch_save_partial_failure(self, temp_dir, encryption_service):
        """Test batch save with some failures."""
        # Create a backend
        backend = LocalFSBackend(temp_dir, encryption_service, "test-password")
        
        # Create valid notes
        valid_notes = [
            NoteEntry(
                id=f"valid-note-{i}",
                title=f"Valid Note {i}",
                content="Valid content",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                divider_position=i,
                is_task=False
            )
            for i in range(3)
        ]
        
        # Save the valid notes first
        await backend.save_notes(valid_notes)
        
        # Now make the notes directory read-only to cause save failures
        notes_path = Path(temp_dir) / "notes"
        notes_path.chmod(0o444)
        
        try:
            # Create a new note that should fail to save
            new_note = NoteEntry(
                id="new-note",
                title="New Note",
                content="New content",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                divider_position=999,
                is_task=False
            )
            
            # Batch save should raise StorageError due to permission issues
            with pytest.raises(StorageError):
                await backend.save_notes([new_note])
        finally:
            # Restore permissions for cleanup
            notes_path.chmod(0o755)