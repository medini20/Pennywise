const USER_KEY = "user";
const TOKEN_KEY = "token";

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

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
  const rawUser = localStorage.getItem(USER_KEY);

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
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

export const hasValidSession = () => {
  const token = getStoredToken();
  const user = getStoredUser();

  if (token && user && !isTokenExpired(token)) {
    return true;
  }

  if (token || localStorage.getItem(USER_KEY)) {
    clearStoredSession();
  }

  return false;
};

export const saveStoredSession = ({ user, token }) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
};

export const updateStoredUser = (nextFields) => {
  const currentUser = getStoredUser();

  if (!currentUser) {
    return;
  }

  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      ...currentUser,
      ...nextFields
    })
  );
};
