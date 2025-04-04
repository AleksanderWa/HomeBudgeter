/**
 * Handles redirecting to external OAuth providers (like TrueLayer)
 * with proper state parameter for security
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a random state parameter and store it for verification
 */
export const generateAndStoreState = (): string => {
  const state = uuidv4();
  sessionStorage.setItem('truelayer_state', state);
  return state;
};

/**
 * Verify that the returned state matches the stored state
 */
export const verifyState = (returnedState: string): boolean => {
  const storedState = sessionStorage.getItem('truelayer_state');
  
  // Clean up after checking
  sessionStorage.removeItem('truelayer_state');
  
  return storedState === returnedState;
}; 