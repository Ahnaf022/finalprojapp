import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { decodeJwtPayload } from '@/utils/jwtPayload';

export type AuthUser = {
  sub: string;
  email: string | null;
  username: string | null;
};

export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
};

function userFromTokenClaims(payload: Record<string, unknown> | null): AuthUser | null {
  if (!payload || typeof payload.sub !== 'string') return null;

  const cognitoUsername = payload['cognito:username'];
  const preferred = payload.preferred_username;

  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    username:
      (typeof cognitoUsername === 'string' ? cognitoUsername : null) ??
      (typeof preferred === 'string' ? preferred : null),
  };
}

function deriveUser(idToken: string | null, accessToken: string | null): AuthUser | null {
  if (idToken) {
    const user = userFromTokenClaims(decodeJwtPayload(idToken));
    if (user) return user;
  }

  if (accessToken) {
    const user = userFromTokenClaims(decodeJwtPayload(accessToken));
    if (user) return user;
  }

  return null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  idToken: null,
  refreshToken: null,
  status: 'unauthenticated',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string;
        idToken?: string | null;
        refreshToken?: string | null;
      }>
    ) => {
      const { accessToken, idToken, refreshToken } = action.payload;
      state.accessToken = accessToken;
      state.idToken = idToken ?? null;
      state.refreshToken = refreshToken ?? null;
      state.error = null;
      state.status = 'authenticated';
      state.user = deriveUser(state.idToken, state.accessToken);
    },
    clearSession: (state) => {
      state.user = null;
      state.accessToken = null;
      state.idToken = null;
      state.refreshToken = null;
      state.status = 'unauthenticated';
      state.error = null;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload) {
        state.status = 'loading';
        return;
      }

      state.status = state.user && state.accessToken ? 'authenticated' : 'unauthenticated';
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.status = 'unauthenticated';
      }
    },
  },
});

export const { setCredentials, clearSession, setAuthLoading, setAuthError } = authSlice.actions;

export const selectAuth = (state: { auth: AuthState }): AuthState => state.auth;
export const selectCurrentUser = (state: { auth: AuthState }): AuthUser | null => state.auth.user;
export const selectAccessToken = (state: { auth: AuthState }): string | null =>
  state.auth.accessToken;
export const selectIsAuthenticated = (state: { auth: AuthState }): boolean =>
  state.auth.status === 'authenticated' && !!state.auth.accessToken && !!state.auth.user?.sub;

/**
 * Human-readable label for a user `sub` when listing events/items.
 * Prefer server-provided display strings when the API adds them (`*_display_name`).
 */
export function displayNameForSub(
  sub: string,
  currentUser: AuthUser | null,
  serverDisplayName?: string | null
): string {
  if (serverDisplayName?.trim()) return serverDisplayName.trim();

  if (currentUser?.sub === sub) {
    return currentUser.email ?? currentUser.username ?? shortenSub(sub);
  }

  return shortenSub(sub);
}

function shortenSub(sub: string): string {
  if (sub.length <= 14) return sub;
  return `${sub.slice(0, 8)}…${sub.slice(-4)}`;
}

export function authHeaders(accessToken: string | null): Record<string, string> {
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
}

export default authSlice.reducer;
