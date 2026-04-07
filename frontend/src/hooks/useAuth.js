import { useEffect, useState } from "react";
import {
  fetchAuthSession,
  loginWithGoogle,
  loginWithPassword,
  logoutAuthSession,
  selectActiveWorkspace,
  signupWithPassword,
} from "../api";
import { AUTH_STORAGE_KEY, readStorage, writeStorage } from "./appStateUtils";

function normalizeAuthResponse(response) {
  return {
    authToken: response?.auth_token || null,
    user: response?.user || null,
    activeWorkspace: response?.active_workspace || null,
    workspaces: Array.isArray(response?.workspaces) ? response.workspaces : [],
    googleClientId: response?.google_client_id || null,
  };
}

export default function useAuth() {
  const savedAuth = readStorage(AUTH_STORAGE_KEY, {
    authToken: null,
    user: null,
    activeWorkspace: null,
    workspaces: [],
  });
  const [authToken, setAuthToken] = useState(savedAuth?.authToken || null);
  const [currentUser, setCurrentUser] = useState(savedAuth?.user || null);
  const [activeWorkspace, setActiveWorkspace] = useState(savedAuth?.activeWorkspace || null);
  const [workspaces, setWorkspaces] = useState(savedAuth?.workspaces || []);
  const [googleClientId, setGoogleClientId] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  useEffect(() => {
    writeStorage(AUTH_STORAGE_KEY, { authToken, user: currentUser, activeWorkspace, workspaces });
  }, [authToken, currentUser, activeWorkspace, workspaces]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthSession() {
      setAuthLoading(true);
      try {
        const response = normalizeAuthResponse(await fetchAuthSession());
        if (cancelled) return;
        setCurrentUser(response.user);
        setActiveWorkspace(response.activeWorkspace);
        setWorkspaces(response.workspaces);
        setGoogleClientId(response.googleClientId);
        if (!response.user) {
          setAuthToken(null);
          setActiveWorkspace(null);
          setWorkspaces([]);
        }
      } catch {
        if (cancelled) return;
        setCurrentUser(null);
        setAuthToken(null);
        setActiveWorkspace(null);
        setWorkspaces([]);
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    void loadAuthSession();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyAuthResponse(response) {
    const normalized = normalizeAuthResponse(response);
    writeStorage(AUTH_STORAGE_KEY, {
      authToken: normalized.authToken,
      user: normalized.user,
      activeWorkspace: normalized.activeWorkspace,
      workspaces: normalized.workspaces,
    });
    setAuthToken(normalized.authToken);
    setCurrentUser(normalized.user);
    setActiveWorkspace(normalized.activeWorkspace);
    setWorkspaces(normalized.workspaces);
    setGoogleClientId(normalized.googleClientId);
    setAuthError(null);
    setAuthDialogOpen(false);
    return normalized.user;
  }

  async function handleSignup(payload) {
    setAuthLoading(true);
    setAuthError(null);
    try {
      return applyAuthResponse(await signupWithPassword({
        display_name: payload.displayName,
        email: payload.email,
        password: payload.password,
      }));
    } catch (error) {
      setAuthError(error.message);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(payload) {
    setAuthLoading(true);
    setAuthError(null);
    try {
      return applyAuthResponse(await loginWithPassword(payload));
    } catch (error) {
      setAuthError(error.message);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleGoogleLogin(credential) {
    setAuthLoading(true);
    setAuthError(null);
    try {
      return applyAuthResponse(await loginWithGoogle({ credential }));
    } catch (error) {
      setAuthError(error.message);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = normalizeAuthResponse(await logoutAuthSession());
      writeStorage(AUTH_STORAGE_KEY, { authToken: null, user: null, activeWorkspace: null, workspaces: [] });
      setAuthToken(null);
      setCurrentUser(null);
      setActiveWorkspace(null);
      setWorkspaces([]);
      setGoogleClientId(response.googleClientId);
      setAuthDialogOpen(false);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function openAuthDialog(mode = "login") {
    setAuthMode(mode);
    setAuthDialogOpen(true);
  }

  function closeAuthDialog() {
    if (authLoading) return;
    setAuthDialogOpen(false);
    setAuthError(null);
  }

  async function handleSelectWorkspace(workspaceId) {
    if (!workspaceId) return null;
    setAuthLoading(true);
    setAuthError(null);
    try {
      return applyAuthResponse(await selectActiveWorkspace({ workspace_id: workspaceId }));
    } catch (error) {
      setAuthError(error.message);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }

  return {
    currentUser,
    authToken,
    activeWorkspace,
    workspaces,
    googleClientId,
    authLoading,
    authError,
    authDialogOpen,
    authMode,
    isOrganizer: Boolean(activeWorkspace?.is_organizer || currentUser?.is_organizer),
    setAuthMode,
    setAuthError,
    openAuthDialog,
    closeAuthDialog,
    handleSignup,
    handleLogin,
    handleGoogleLogin,
    handleLogout,
    handleSelectWorkspace,
  };
}
