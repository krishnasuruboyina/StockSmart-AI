import {
  createContext,
  useContext,
  useState,
} from "react";

import { loginUser } from "../services/authService";

const AuthContext = createContext(null);

// Get saved user from localStorage
const getSavedUser = () => {
  try {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      return null;
    }

    const parsedUser = JSON.parse(savedUser);

    if (!parsedUser || !parsedUser.role) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }

    return parsedUser;
  } catch (error) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser);
  const [loading, setLoading] = useState(false);

  // LOGIN FUNCTION
  const login = async (credentials) => {
    setLoading(true);

    try {
      const response = await loginUser(credentials);

      // authService returns response.data directly
      const token = response?.token;

      const loggedUser = response?.data?.user;

      if (!token) {
        throw new Error("Authentication token missing.");
      }

      if (!loggedUser || !loggedUser.role) {
        throw new Error("User details missing in login response.");
      }

      const normalizedUser = {
        ...loggedUser,
        role: String(loggedUser.role).toLowerCase(),
      };

      // Save authentication details
      localStorage.setItem("token", token);

      localStorage.setItem(
        "user",
        JSON.stringify(normalizedUser)
      );

      setUser(normalizedUser);

      return normalizedUser;

    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);

      throw error;

    } finally {
      setLoading(false);
    }
  };

  // LOGOUT FUNCTION
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        loading,
        isAuthenticated: Boolean(user),
        role: user?.role || null,
        companyId: user?.company?.companyId || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// CUSTOM AUTH HOOK
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}