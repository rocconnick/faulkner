import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock IndexedDB
beforeEach(() => {
  // Create a simple mock for IndexedDB
  const mockIndexedDB = {
    open: vi.fn(() => {
      const request = {
        result: {
          objectStoreNames: { contains: () => false },
          createObjectStore: vi.fn(() => ({
            createIndex: vi.fn()
          })),
          transaction: vi.fn(() => ({
            objectStore: vi.fn(() => ({
              getAll: vi.fn(() => {
                const getAllRequest = {
                  result: [],
                  onsuccess: null as any,
                  onerror: null as any
                };
                setTimeout(() => {
                  if (getAllRequest.onsuccess) {
                    getAllRequest.onsuccess({ target: getAllRequest } as any);
                  }
                }, 0);
                return getAllRequest;
              }),
              get: vi.fn(() => ({
                onsuccess: null,
                onerror: null
              })),
              put: vi.fn(() => {
                const putRequest = {
                  onsuccess: null as any,
                  onerror: null as any
                };
                setTimeout(() => {
                  if (putRequest.onsuccess) {
                    putRequest.onsuccess({ target: putRequest } as any);
                  }
                }, 0);
                return putRequest;
              })
            })),
            oncomplete: null as any,
            onerror: null as any
          }))
        },
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any
      };
      
      // Simulate successful open
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess({ target: request } as any);
        }
      }, 0);
      
      return request;
    })
  };
  
  (global as any).indexedDB = mockIndexedDB;
});

describe('App', () => {
  it('renders loading state initially', () => {
    render(<App />);
    expect(screen.getByText(/Loading Journal Notes/i)).toBeDefined();
  });

  it('renders journal stream after initialization', async () => {
    render(<App />);
    
    // Wait for initialization - should show add divider button
    await waitFor(() => {
      const button = screen.queryByRole('button', { name: /add divider/i });
      expect(button).not.toBeNull();
    }, { timeout: 2000 });
    
    // Component should be rendered
    const button = screen.getByRole('button', { name: /add divider/i });
    expect(button).toBeDefined();
  });
});
