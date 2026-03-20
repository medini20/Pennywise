import React, { useState } from "react"; // Added useState
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Records from "./pages/records";
import Transactions from "./pages/Transactions";
import Category from "./pages/Category";
import Budget from "./pages/Budget";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Alerts from "./pages/Alerts";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";

function AppLayout() {
  const location = useLocation();
  
  // State to manage whether the sidebar is tucked away
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAuthRoute =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/forgot-password";

  // This function handles the horizontal enlargement of the layout
  const getMarginLeft = () => {
    if (isAuthRoute) return "0px";
    // When collapsed, margin becomes 0, allowing the layout to fill the screen
    return isCollapsed ? "0px" : "220px";
  };

  return (
    <div style={{ display: "flex" }}>
      {/* Pass the state and the setter to the Sidebar */}
      {!isAuthRoute && (
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      )}

      <div 
        className="page-content" 
        style={{ 
          flex: 1, 
          marginLeft: getMarginLeft(),
          transition: "margin-left 0.3s ease-in-out", // Creates the smooth enlarging effect
          minHeight: "100vh"
        }}
      >
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Main Routes */}
          <Route path="/" element={<Records />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/category" element={<Category />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/alerts" element={<Alerts />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;