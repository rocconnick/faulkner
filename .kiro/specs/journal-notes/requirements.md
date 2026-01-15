# Requirements Document

## Introduction

A journal-based notetaking application that allows users to maintain a continuous stream of notes with embedded tasks/reminders and AI-powered chat capabilities. The system enables users to capture thoughts chronologically, mark items for follow-up, and interact with their notes through an AI assistant with memory and retrieval capabilities.

## Glossary

- **Journal_Stream**: The continuous, chronological sequence of notes and entries
- **Note_Entry**: A single thought, observation, or piece of content within the Journal_Stream, bounded by Divider elements
- **Divider**: A visual separator that defines the boundaries of Note_Entry items in the Journal_Stream
- **Task_Marker**: A reminder or action item embedded within a Note_Entry that links back to its location
- **AI_Assistant**: The conversational agent that can query and interact with the user's notes
- **RAG_System**: Retrieval-Augmented Generation system that searches notes to provide context to the AI_Assistant
- **Memory_Store**: Persistent storage of conversation context and user preferences for the AI_Assistant
- **Desktop_App**: The application interface (browser-based in beta, native macOS in future)
- **Storage_Backend**: The abstracted data persistence layer that can use local filesystem or cloud storage
- **AgentCore**: The underlying framework for building the AI_Assistant capabilities

## Requirements

### Requirement 1: Journal Stream Management

**User Story:** As a user, I want to maintain a continuous stream of notes with efficient loading, so that I can capture my thoughts chronologically and navigate smoothly even with thousands of entries.

#### Acceptance Criteria

1. THE Journal_Stream SHALL display Note_Entry items in chronological order
2. WHEN a user adds a Divider, THE Journal_Stream SHALL create a new Note_Entry below the Divider
3. WHEN the application starts for the first time, THE Journal_Stream SHALL display a blank page with a single Divider at the top
4. WHEN a user types content, THE Journal_Stream SHALL add the content to the current Note_Entry
5. THE Journal_Stream SHALL persist all Note_Entry items and Divider positions to local storage
6. WHEN the application starts after first use, THE Journal_Stream SHALL load and display all previously saved content
7. WHEN a user navigates to a specific Note_Entry via calendar or search, THE Journal_Stream SHALL load that entry plus a few entries before and after for context
8. WHEN a user scrolls up or down, THE Journal_Stream SHALL dynamically load additional Note_Entry items to create an infinite scrolling experience
9. THE Journal_Stream SHALL unload Note_Entry items that are far from the current viewport to maintain performance
10. THE Desktop_App SHALL hide traditional scrollbars to maintain the infinite stream aesthetic
11. WHEN loading additional entries, THE Journal_Stream SHALL do so seamlessly without disrupting the user's reading position

### Requirement 2: Note Entry Creation and Editing

**User Story:** As a user, I want to create and edit notes easily using keyboard-driven markdown formatting, so that I can quickly capture and format my thoughts without leaving the keyboard.

#### Acceptance Criteria

1. WHEN a user types content after a Divider, THE Journal_Stream SHALL add the content to that Note_Entry
2. WHEN a user types markdown syntax (h1, h2, h3, -, *, etc.), THE Desktop_App SHALL apply the corresponding formatting in real-time
3. WHEN a user types "# " at the start of a line, THE Desktop_App SHALL format the line as heading level 1
4. WHEN a user types "## " at the start of a line, THE Desktop_App SHALL format the line as heading level 2
5. WHEN a user types "### " at the start of a line, THE Desktop_App SHALL format the line as heading level 3
6. WHEN a user types "- " or "* " at the start of a line, THE Desktop_App SHALL create a bulleted list item
7. WHEN a user selects an existing Note_Entry, THE Desktop_App SHALL allow editing of that entry
8. WHEN a user saves changes to a Note_Entry, THE Journal_Stream SHALL update the entry and persist changes immediately
9. WHEN a Note_Entry is modified, THE Journal_Stream SHALL maintain its chronological position
10. WHEN a user adds a new Divider, THE Journal_Stream SHALL create a new Note_Entry and position the cursor for typing
11. THE Desktop_App SHALL support all formatting changes through keyboard input without requiring mouse interaction
12. WHEN a Divider is created, THE Desktop_App SHALL display a title field directly underneath the Divider
13. WHEN a Note_Entry has content, THE AI_Assistant SHALL automatically generate a title based on the content
14. WHEN a user clicks on a Note_Entry title, THE Desktop_App SHALL allow manual editing of the title
15. WHEN a user manually edits a title, THE Desktop_App SHALL preserve the manual title and not overwrite it with AI-generated titles

### Requirement 3: Task Management Integration

**User Story:** As a user, I want to mark notes as tasks, prioritize them, and organize them with tags, so that I can track action items within my journal context.

#### Acceptance Criteria

1. WHEN a user marks a Note_Entry as a task, THE Journal_Stream SHALL create a Task_Marker linked to that entry's location
2. WHEN a user views the task list, THE Desktop_App SHALL display all Task_Marker items with preview text
3. WHEN a user selects a Task_Marker, THE Journal_Stream SHALL navigate to and highlight the associated Note_Entry
4. WHEN a user marks a Task_Marker as complete, THE Journal_Stream SHALL update the task status while preserving the Note_Entry
5. WHEN a user drags a Task_Marker in the task list, THE Desktop_App SHALL allow reordering to change priority
6. WHEN a user drops a Task_Marker in a new position, THE Desktop_App SHALL persist the new priority order
7. WHEN a user assigns a custom tag to a Task_Marker, THE Desktop_App SHALL associate the tag with that task
8. WHEN a user assigns a due date to a Task_Marker, THE Desktop_App SHALL treat it as a tag without affecting priority order
9. WHEN a Task_Marker has a due date within 1 day, THE Desktop_App SHALL display the due date in yellow
10. WHEN a Task_Marker has a past due date, THE Desktop_App SHALL display the due date in red
11. WHEN a user views the task list, THE Desktop_App SHALL display tags and due dates associated with each Task_Marker
12. WHEN a user filters by tag or due date, THE Desktop_App SHALL display only Task_Marker items with matching attributes
13. THE Desktop_App SHALL persist all Task_Marker states, priorities, tags, due dates, and associations to the Storage_Backend

### Requirement 4: AI Assistant with RAG

**User Story:** As a user, I want to chat with an AI about my notes through a sidebar interface, so that I can query, summarize, and gain insights from my journal.

#### Acceptance Criteria

1. WHEN a user clicks the chat icon in the bottom right, THE Desktop_App SHALL open a sidebar on the right side of the screen
2. WHEN the chat sidebar is open, THE Desktop_App SHALL display the AI_Assistant conversation interface
3. WHEN a user sends a message to the AI_Assistant, THE RAG_System SHALL retrieve relevant Note_Entry items from the Journal_Stream
4. WHEN the RAG_System retrieves notes, THE AI_Assistant SHALL use them as context to generate responses
5. WHEN a user asks about specific topics, THE RAG_System SHALL search Note_Entry content using semantic similarity
6. THE AI_Assistant SHALL cite or reference specific Note_Entry items when answering questions
7. WHEN the AI_Assistant references a Note_Entry, THE Desktop_App SHALL allow navigation to that entry in the Journal_Stream
8. THE Desktop_App SHALL display a floating chat icon in the bottom right corner that remains visible while scrolling
9. WHEN the chat sidebar is open, THE Journal_Stream SHALL adjust its width to accommodate the sidebar

### Requirement 5: AI Assistant Memory

**User Story:** As a user, I want the AI to remember our conversation context, so that I can have coherent multi-turn discussions about my notes.

#### Acceptance Criteria

1. WHEN a user has a conversation with the AI_Assistant, THE Memory_Store SHALL persist the conversation history
2. WHEN the AI_Assistant generates responses, THE Memory_Store SHALL provide recent conversation context
3. WHEN a user starts a new session, THE AI_Assistant SHALL have access to previous conversation history
4. THE Memory_Store SHALL persist user preferences and frequently discussed topics
5. WHEN the Memory_Store grows beyond a threshold, THE AI_Assistant SHALL summarize and compress older conversations

### Requirement 6: AgentCore Integration

**User Story:** As a developer, I want to build the AI features on AgentCore, so that I can leverage its agent capabilities and infrastructure.

#### Acceptance Criteria

1. THE AI_Assistant SHALL be implemented using the AgentCore framework
2. WHEN the Desktop_App initializes, THE AI_Assistant SHALL connect to AgentCore services
3. THE RAG_System SHALL use AgentCore's retrieval capabilities for note search
4. THE Memory_Store SHALL use AgentCore's memory management features
5. WHEN AgentCore is unavailable, THE Desktop_App SHALL display an appropriate error message

### Requirement 7: Browser-Based Application (Beta)

**User Story:** As a user in the beta phase, I want to access the journal through a web browser served locally, so that I can use the application without installing native software.

#### Acceptance Criteria

1. THE Desktop_App SHALL run as a web application accessible through a browser
2. WHEN the application server starts, THE Desktop_App SHALL be accessible at a local URL
3. THE Desktop_App SHALL provide the same functionality as planned for native applications
4. THE Desktop_App SHALL work in modern web browsers without requiring plugins
5. WHEN the browser is closed, THE Storage_Backend SHALL ensure all data is persisted

### Requirement 8: Abstracted Storage Layer

**User Story:** As a developer, I want an abstracted storage system, so that I can switch from local filesystem to AWS S3 without rewriting application logic.

#### Acceptance Criteria

1. THE Storage_Backend SHALL provide a unified interface for data operations regardless of underlying storage
2. WHERE local filesystem storage is configured, THE Storage_Backend SHALL read and write to the local filesystem
3. WHERE AWS S3 storage is configured, THE Storage_Backend SHALL read and write to S3 buckets
4. WHEN switching storage backends, THE Desktop_App SHALL continue functioning without code changes
5. THE Storage_Backend SHALL handle storage-specific concerns like authentication and error handling

### Requirement 9: Data Persistence and Storage

**User Story:** As a user, I want my notes and tasks to be saved reliably, so that I never lose my journal entries.

#### Acceptance Criteria

1. WHEN a Note_Entry is created or modified, THE Storage_Backend SHALL persist it immediately
2. WHEN a Task_Marker is created or updated, THE Storage_Backend SHALL persist the change
3. WHEN the AI_Assistant conversation occurs, THE Storage_Backend SHALL persist conversation history
4. THE Storage_Backend SHALL store all data in a structured format
5. WHEN data corruption is detected, THE Desktop_App SHALL attempt recovery and notify the user

### Requirement 10: Offline Support and Synchronization

**User Story:** As a user, I want the app to work offline and sync across devices when I reconnect, so that I can use my journal anywhere and access it from multiple devices.

#### Acceptance Criteria

1. WHEN the application is offline, THE Desktop_App SHALL continue to function with full read and write capabilities
2. WHEN the application is offline, THE Storage_Backend SHALL queue all changes locally
3. WHEN the application comes back online, THE Storage_Backend SHALL synchronize queued changes to the remote storage
4. WHEN synchronization occurs, THE Storage_Backend SHALL handle conflicts by preserving both versions and notifying the user
5. WHEN the application is offline, THE Desktop_App SHALL display an indicator showing offline status
6. WHEN synchronization completes, THE Desktop_App SHALL notify the user of successful sync
7. THE Storage_Backend SHALL prioritize local storage for immediate operations and sync asynchronously
8. WHEN changes are made on one device, THE Storage_Backend SHALL push updates to other connected devices
9. WHEN a device receives pushed updates, THE Desktop_App SHALL refresh the Journal_Stream to display the new content
10. WHEN multiple devices are editing simultaneously, THE Storage_Backend SHALL detect and resolve conflicts appropriately

### Requirement 11: macOS Desktop Application (Future)

**User Story:** As a macOS user, I want a native desktop application, so that I can use the journal efficiently on my computer.

#### Acceptance Criteria

1. WHERE native macOS support is enabled, THE Desktop_App SHALL run as a native macOS application
2. WHERE native macOS support is enabled, THE Desktop_App SHALL provide keyboard shortcuts for common actions
3. WHERE native macOS support is enabled, THE Desktop_App SHALL support macOS-native features like window management and notifications
4. WHERE native macOS support is enabled, THE Desktop_App SHALL integrate with system-level features
5. WHERE native macOS support is enabled, THE Storage_Backend SHALL use appropriate local storage locations

### Requirement 12: iOS Mobile Application (Future)

**User Story:** As a mobile user, I want to access my journal on iOS, so that I can capture notes and review tasks on the go.

#### Acceptance Criteria

1. WHERE iOS support is enabled, THE Journal_Stream SHALL synchronize with other application instances
2. WHERE iOS support is enabled, THE Storage_Backend SHALL handle data synchronization across devices
3. WHERE iOS support is enabled, THE AI_Assistant SHALL be accessible from the mobile interface
4. WHERE iOS support is enabled, THE Task_Marker list SHALL be viewable and actionable on mobile
5. WHERE iOS support is enabled, THE Storage_Backend SHALL handle offline access and sync conflicts

### Requirement 13: Search and Navigation

**User Story:** As a user, I want to search and navigate my journal using multiple methods, so that I can find specific notes quickly and browse by time.

#### Acceptance Criteria

1. WHEN a user enters a search query, THE Desktop_App SHALL perform fuzzy text matching across Note_Entry items
2. WHEN a user enters a search query, THE RAG_System SHALL perform vector-based semantic search across Note_Entry items
3. WHEN search results are displayed, THE Desktop_App SHALL highlight matching text within entries
4. WHEN a user selects a search result, THE Journal_Stream SHALL navigate to that Note_Entry
5. THE Desktop_App SHALL support filtering by Task_Marker status

### Requirement 14: Calendar-Based Navigation

**User Story:** As a user, I want to view my notes organized by calendar date, so that I can browse my journal chronologically and find entries from specific days.

#### Acceptance Criteria

1. WHEN a user opens the calendar view, THE Desktop_App SHALL display a calendar interface with dates highlighted based on note activity
2. WHEN a date has notes created on it, THE Desktop_App SHALL highlight that date in pastel green
3. WHEN a date has notes updated on it, THE Desktop_App SHALL highlight that date in pastel yellow
4. WHEN a date has both created and updated notes, THE Desktop_App SHALL display both pastel green and pastel yellow indicators
5. WHEN a user selects a date in the calendar, THE Journal_Stream SHALL navigate to and display all Note_Entry items created or updated on that date
6. THE Desktop_App SHALL index Note_Entry items by both their creation date and update date for calendar navigation
7. WHEN a date has multiple Note_Entry items, THE Journal_Stream SHALL display them in chronological order within that day
8. THE Desktop_App SHALL allow navigation between dates using keyboard shortcuts or calendar controls

### Requirement 15: Keyboard Shortcuts

**User Story:** As a user, I want keyboard shortcuts for common actions, so that I can work efficiently without reaching for the mouse.

#### Acceptance Criteria

1. WHEN a user presses the add divider shortcut, THE Journal_Stream SHALL insert a new Divider at the current cursor position
2. WHEN a user presses the create task shortcut, THE Desktop_App SHALL convert the current Note_Entry to a Task_Marker
3. WHEN a user presses the open search shortcut, THE Desktop_App SHALL display the search interface with focus on the search input
4. WHEN a user presses the open calendar shortcut, THE Desktop_App SHALL display the calendar navigation view
5. WHEN a user presses the open AI chat shortcut, THE Desktop_App SHALL display the AI_Assistant interface
6. THE Desktop_App SHALL display available keyboard shortcuts in a help menu or documentation
7. THE Desktop_App SHALL use standard keyboard conventions that don't conflict with browser shortcuts

### Requirement 16: Authentication and Security

**User Story:** As a user, I want password protection and encryption, so that my personal journal entries remain private and secure.

#### Acceptance Criteria

1. WHEN a user first launches the application, THE Desktop_App SHALL prompt for password creation
2. WHEN a user returns to the application, THE Desktop_App SHALL require password authentication before displaying content
3. WHEN a user enters an incorrect password, THE Desktop_App SHALL deny access and provide feedback
4. THE Storage_Backend SHALL encrypt all Note_Entry content before persisting to storage
5. THE Storage_Backend SHALL encrypt all Task_Marker data before persisting to storage
6. THE Storage_Backend SHALL encrypt all AI_Assistant conversation history before persisting to storage
7. WHEN data is retrieved from storage, THE Storage_Backend SHALL decrypt it using the user's password
8. THE Desktop_App SHALL use industry-standard encryption algorithms for data protection
9. WHEN the user's password is changed, THE Storage_Backend SHALL re-encrypt all data with the new password

### Requirement 17: Undo and Redo

**User Story:** As a user, I want to undo and redo my actions, so that I can easily correct mistakes or revert changes.

#### Acceptance Criteria

1. WHEN a user presses the undo keyboard shortcut, THE Desktop_App SHALL revert the most recent action
2. WHEN a user presses the redo keyboard shortcut, THE Desktop_App SHALL reapply the most recently undone action
3. THE Desktop_App SHALL maintain an undo history for text edits, note creation, divider insertion, and task operations
4. WHEN a user performs a new action after undoing, THE Desktop_App SHALL clear the redo history
5. THE Desktop_App SHALL use standard keyboard shortcuts for undo and redo (Cmd+Z for undo, Cmd+Shift+Z for redo on macOS)
6. THE Desktop_App SHALL persist undo history across sessions where feasible
7. WHEN the undo history reaches a maximum size, THE Desktop_App SHALL remove the oldest actions

### Requirement 18: Visual Design and User Experience

**User Story:** As a user, I want a clean and minimal interface with a soft pastel color palette, so that I can focus on my thoughts without visual distractions.

#### Acceptance Criteria

1. THE Desktop_App SHALL use sans-serif fonts for all text content
2. THE Desktop_App SHALL use a soft pastel color palette throughout the interface
3. THE Desktop_App SHALL display content on an off-white background with dark gray text
4. THE Desktop_App SHALL use pastel green to indicate created notes in the calendar view
5. WHEN a Task_Marker has a due date within 1 day, THE Desktop_App SHALL display the due date in pastel yellow
6. WHEN a Task_Marker has a past due date, THE Desktop_App SHALL display the due date in pastel red or pink
7. THE Desktop_App SHALL minimize visual weight through simple, uncluttered layouts
8. THE Desktop_App SHALL use subtle visual elements for Divider items and UI controls
9. WHEN displaying the Journal_Stream, THE Desktop_App SHALL prioritize content readability over decorative elements
