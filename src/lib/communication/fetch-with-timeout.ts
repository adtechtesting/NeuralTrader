// src/lib/communication/fetch-with-timeout.ts
/**
 * Enhanced fetch with timeout and abort handling
 * This utility helps prevent race conditions and memory leaks
 * when using AbortController with fetch
 */
export async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeoutMs: number = 32000  // Increased from 8000ms to 15000ms
): Promise<Response> {
  // Create abort controller for this request
  const controller = new AbortController();
  
  // Set up timeout that will abort the request
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  try {
    // Add cache headers to improve performance
    const headers = new Headers(options.headers || {});
    headers.set('Cache-Control', 'max-age=60');
    
    // Merge the abort signal with any existing options
    const fetchOptions: RequestInit = {
      ...options,
      headers,
      signal: controller.signal,
    };
    
    // Execute fetch with the abort signal
    const response = await fetch(url, fetchOptions);
    
    // Request succeeded, clear the timeout
    clearTimeout(timeoutId);
    
    return response;
  } catch (error) {
    // Clear timeout to prevent memory leaks
    clearTimeout(timeoutId);
    
    // Re-throw the original error
    throw error;
  }
}

/**
 * Utility function for JSON fetch with timeout
 * Returns the parsed JSON response or throws an error with clear message
 */
export async function fetchJsonWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 45000  // Increased from 8000ms to 15000ms
): Promise<T> {
  try {
    const response = await fetchWithTimeout(url, options, timeoutMs);
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    // Add more context to the error
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
      }
    }
    throw error;
  }
}
