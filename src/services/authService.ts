const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'nurse' | 'admin' | 'support' | 'patient';
  patientId?: string;
  userType?: 'provider' | 'patient';
  lastLogin?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
}

const TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

/**
 * Store tokens in localStorage
 */
function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get refresh token from localStorage
 */
function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store user in localStorage
 */
function storeUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get user from localStorage
 */
export function getUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Get authorization header
 */
export function getAuthHeader(): string | null {
  const token = getAccessToken();
  return token ? `Bearer ${token}` : null;
}

/**
 * Login (Provider - admin/doctor/nurse)
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Invalid email or password');
  }

  const data: LoginResponse = await response.json();
  
  // Store tokens and user
  storeTokens(data.accessToken, data.refreshToken);
  storeUser(data.user);

  return data;
}

/**
 * Patient Login
 */
export async function patientLogin(patientId: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/patient/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patientId, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Invalid Patient ID or password');
  }

  const data: LoginResponse = await response.json();
  
  // Store tokens and user
  storeTokens(data.accessToken, data.refreshToken);
  storeUser(data.user);

  return data;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const token = getAccessToken();
  
  // Try to call logout endpoint (but don't fail if it fails)
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
  }

  // Clear local storage
  clearAuth();
}

/**
 * Get current user from API
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = getAccessToken();
  if (!token) {
    console.warn('No access token found');
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        console.log('Token expired, attempting refresh...');
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry with new token
          return getCurrentUser();
        }
        console.warn('Token refresh failed, clearing auth');
        clearAuth();
        return null;
      }
      const errorText = await response.text();
      console.error('Failed to get user:', response.status, errorText);
      throw new Error('Failed to get user');
    }

    const user: User = await response.json();
    console.log('User fetched from API:', user);
    storeUser(user);
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    // Return user from localStorage as fallback
    const localUser = getUser();
    if (localUser) {
      console.log('Using user from localStorage as fallback');
      return localUser;
    }
    return null;
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearAuth();
      return false;
    }

    const data = await response.json();
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    return true;
  } catch (error) {
    console.error('Refresh token error:', error);
    clearAuth();
    return false;
  }
}

/**
 * Make authenticated API request
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If token expired, try to refresh
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry with new token
      const newToken = getAccessToken();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    } else {
      clearAuth();
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
}

