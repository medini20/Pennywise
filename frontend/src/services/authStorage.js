const USER_KEY = "user";
const TOKEN_KEY = "token";

const readStorageValue = (key) => {
  const sessionValue = sessionStorage.getItem(key);
  if (sessionValue) {
    return sessionValue;
  }

  const legacyLocalValue = localStorage.getItem(key);
  if (legacyLocalValue) {
    sessionStorage.setItem(key, legacyLocalValue);
    localStorage.removeItem(key);
    return legacyLocalValue;
  }

  return null;
};

export const getStoredToken = () => readStorageValue(TOKEN_KEY);
export const setStoredToken = (token) => {
  if (typeof token !== "string" || !token.trim()) {
    return;
  }

  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(TOKEN_KEY);
};

const parseJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    return JSON.parse(atob(payload));
  } catch (error) {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = parseJwtPayload(token);

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
};

export const getStoredUser = () => {
  const rawUser = readStorageValue(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    clearStoredSession();
    return null;
  }
};

export const clearStoredSession = () => {
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

export const hasValidSession = () => {
  const token = readStorageValue(TOKEN_KEY);
  const rawUser = readStorageValue(USER_KEY);
  let user = null;

  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch (error) {
      clearStoredSession();
      return false;
    }
  }

  if (token && user && !isTokenExpired(token)) {
    return true;
  }

  if (token || rawUser) {
    clearStoredSession();
  }

  return false;
};

export const saveStoredSession = ({ user, token }) => {
  if (!user || typeof token !== "string" || !token.trim()) {
    clearStoredSession();
    return false;
  }

  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  return true;
};

export const updateStoredUser = (nextFields) => {
  const currentUser = getStoredUser();

  if (!currentUser) {
    return;
  }

  sessionStorage.setItem(
    USER_KEY,
    JSON.stringify({
      ...currentUser,
      ...nextFields
    })
  );
  localStorage.removeItem(USER_KEY);
};
