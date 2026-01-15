/**
 * ApiClient - HTTP client for backend communication
 * 
 * Provides fetch wrappers for all backend API endpoints with authentication,
 * error handling, and network error recovery.
 * 
 * Requirements: 7.2
 */

import type { NoteEntry, TaskMetadata, ListOptions } from '../types';

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Login request/response types
 */
interface LoginResponse {
  session_token: string;
  message: string;
}

/**
 * Note request types
 */
interface CreateNoteRequest {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  divider_position: number;
  is_task: boolean;
  task_metadata?: TaskMetadata;
}

interface UpdateNoteRequest {
  title?: string;
  content?: string;
  updated_at?: string;
  divider_position?: number;
  is_task?: boolean;
  task_metadata?: TaskMetadata;
}

/**
 * API Client configuration
 */
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * API Client for backend communication
 */
export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private sessionToken: string | null = null;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:8000';
    this.timeout = config.timeout || 30000; // 30 seconds
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second
  }

  /**
   * Set the session token for authenticated requests
   * @param token - Session token from login
   */
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  /**
   * Get the current session token
   * @returns Session token or null
   */
  getSessionToken(): string | null {
    return this.sessionToken;
  }

  /**
   * Clear the session token (logout)
   */
  clearSessionToken(): void {
    this.sessionToken = null;
  }

  /**
   * Check if user is authenticated
   * @returns True if session token exists
   */
  isAuthenticated(): boolean {
    return this.sessionToken !== null;
  }

  /**
   * Login to the backend
   * @param password - User password
   * @returns Login response with session token
   */
  async login(password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      skipAuth: true
    });

    if (response.data) {
      this.setSessionToken(response.data.session_token);
      return response.data;
    }

    throw new Error(response.error || 'Login failed');
  }

  /**
   * Setup initial password
   * @param password - User password
   * @returns Login response with session token
   */
  async setupPassword(password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
      skipAuth: true
    });

    if (response.data) {
      this.setSessionToken(response.data.session_token);
      return response.data;
    }

    throw new Error(response.error || 'Password setup failed');
  }

  /**
   * Logout from the backend
   */
  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST'
      });
    } finally {
      this.clearSessionToken();
    }
  }

  /**
   * Create a new note
   * @param note - Note entry to create
   * @returns Created note entry
   */
  async createNote(note: NoteEntry): Promise<NoteEntry> {
    const request: CreateNoteRequest = {
      id: note.id,
      title: note.title,
      content: note.content,
      created_at: note.createdAt.toISOString(),
      updated_at: note.updatedAt.toISOString(),
      divider_position: note.dividerPosition,
      is_task: note.isTask,
      task_metadata: note.taskMetadata
    };

    const response = await this.request<any>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(request)
    });

    if (response.data) {
      return this.deserializeNote(response.data);
    }

    throw new Error(response.error || 'Failed to create note');
  }

  /**
   * Get a note by ID
   * @param id - Note ID
   * @returns Note entry or null if not found
   */
  async getNote(id: string): Promise<NoteEntry | null> {
    const response = await this.request<any>(`/api/notes/${id}`, {
      method: 'GET'
    });

    if (response.status === 404) {
      return null;
    }

    if (response.data) {
      return this.deserializeNote(response.data);
    }

    throw new Error(response.error || 'Failed to get note');
  }

  /**
   * Update a note
   * @param id - Note ID
   * @param updates - Partial note updates
   * @returns Updated note entry
   */
  async updateNote(id: string, updates: Partial<NoteEntry>): Promise<NoteEntry> {
    const request: UpdateNoteRequest = {};

    if (updates.title !== undefined) request.title = updates.title;
    if (updates.content !== undefined) request.content = updates.content;
    if (updates.updatedAt !== undefined) request.updated_at = updates.updatedAt.toISOString();
    if (updates.dividerPosition !== undefined) request.divider_position = updates.dividerPosition;
    if (updates.isTask !== undefined) request.is_task = updates.isTask;
    if (updates.taskMetadata !== undefined) request.task_metadata = updates.taskMetadata;

    const response = await this.request<any>(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request)
    });

    if (response.data) {
      return this.deserializeNote(response.data);
    }

    throw new Error(response.error || 'Failed to update note');
  }

  /**
   * Delete a note
   * @param id - Note ID
   * @returns True if deleted, false if not found
   */
  async deleteNote(id: string): Promise<boolean> {
    const response = await this.request<void>(`/api/notes/${id}`, {
      method: 'DELETE'
    });

    if (response.status === 204) {
      return true;
    }

    if (response.status === 404) {
      return false;
    }

    throw new Error(response.error || 'Failed to delete note');
  }

  /**
   * List notes with optional filtering
   * @param options - List options for filtering
   * @returns Array of note entries
   */
  async listNotes(options?: ListOptions): Promise<NoteEntry[]> {
    const params = new URLSearchParams();

    if (options) {
      if (options.limit !== undefined) params.append('limit', options.limit.toString());
      if (options.offset !== undefined) params.append('offset', options.offset.toString());
      if (options.startDate) params.append('start_date', options.startDate.toISOString());
      if (options.endDate) params.append('end_date', options.endDate.toISOString());
      if (options.isTask !== undefined) params.append('is_task', options.isTask.toString());
    }

    const url = `/api/notes${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.request<any[]>(url, {
      method: 'GET'
    });

    if (response.data) {
      return response.data.map(note => this.deserializeNote(note));
    }

    throw new Error(response.error || 'Failed to list notes');
  }

  /**
   * Check backend health
   * @returns True if backend is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.request<{ status: string }>('/health', {
        method: 'GET',
        skipAuth: true,
        skipRetry: true
      });

      return response.status === 200 && response.data?.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Generic request method with error handling and retries
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns API response
   */
  private async request<T>(
    endpoint: string,
    options: {
      method: string;
      body?: string;
      skipAuth?: boolean;
      skipRetry?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    const attempts = options.skipRetry ? 1 : this.retryAttempts;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };

        // Add authentication header if not skipped
        if (!options.skipAuth && this.sessionToken) {
          headers['Authorization'] = `Bearer ${this.sessionToken}`;
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(url, {
            method: options.method,
            headers,
            body: options.body,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          // Handle different status codes
          if (response.ok) {
            // 204 No Content
            if (response.status === 204) {
              return { status: 204 };
            }

            // Parse JSON response
            const data = await response.json();
            return { data, status: response.status };
          }

          // Handle error responses
          let errorMessage: string;
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || 'Request failed';
          } catch {
            errorMessage = `Request failed with status ${response.status}`;
          }

          // Don't retry on authentication errors or client errors
          if (response.status === 401 || response.status === 403 || response.status === 404) {
            return { error: errorMessage, status: response.status };
          }

          // Retry on server errors
          if (response.status >= 500) {
            lastError = new Error(errorMessage);
            if (attempt < attempts - 1) {
              await this.delay(this.retryDelay * (attempt + 1));
              continue;
            }
          }

          return { error: errorMessage, status: response.status };
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Check if it's a network error or timeout
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = new Error('Request timeout');
          } else if (error.message.includes('fetch')) {
            lastError = new Error('Network error: Unable to reach server');
          }
        }

        // Retry on network errors
        if (attempt < attempts - 1) {
          await this.delay(this.retryDelay * (attempt + 1));
          continue;
        }
      }
    }

    // All retries failed
    return {
      error: lastError?.message || 'Request failed after multiple attempts',
      status: 0
    };
  }

  /**
   * Delay helper for retries
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Deserialize a note from API response (convert ISO strings to Dates)
   */
  private deserializeNote(data: any): NoteEntry {
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      createdAt: new Date(data.created_at || data.createdAt),
      updatedAt: new Date(data.updated_at || data.updatedAt),
      dividerPosition: data.divider_position || data.dividerPosition,
      isTask: data.is_task || data.isTask,
      taskMetadata: data.task_metadata || data.taskMetadata ? {
        priority: (data.task_metadata || data.taskMetadata).priority,
        tags: (data.task_metadata || data.taskMetadata).tags,
        dueDate: (data.task_metadata || data.taskMetadata).due_date || (data.task_metadata || data.taskMetadata).dueDate
          ? new Date((data.task_metadata || data.taskMetadata).due_date || (data.task_metadata || data.taskMetadata).dueDate)
          : undefined,
        completed: (data.task_metadata || data.taskMetadata).completed,
        completedAt: (data.task_metadata || data.taskMetadata).completed_at || (data.task_metadata || data.taskMetadata).completedAt
          ? new Date((data.task_metadata || data.taskMetadata).completed_at || (data.task_metadata || data.taskMetadata).completedAt)
          : undefined
      } : undefined
    };
  }
}
