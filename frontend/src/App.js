import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// Components
import Sidebar from "./components/Sidebar";

// Pages
import Records from "./pages/records";
import Transactions from "./pages/Transactions";
import Category from "./pages/Category";
import Budget from "./pages/Budget";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Alerts from "./pages/Alerts";

// Auth Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";

function AppLayout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAuthRoute = ["/login", "/signup", "/forgot-password"].includes(location.pathname);

  // This defines the EXACT space the sidebar takes
  const sidebarWidth = isCollapsed ? "70px" : "260px";

  return (
    <div style={{ display: "flex", backgroundColor: "#050a15", minHeight: "100vh", width: "100%" }}>
      {!isAuthRoute && (
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      )}

      <div 
        className="page-content" 
        style={{ 
          flex: 1, 
          marginLeft: isAuthRoute ? "0px" : sidebarWidth,
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          width: "100%",
          display: "block",
          boxSizing: "border-box" // CRITICAL: Prevents padding from adding to width
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={<Records />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/category" element={<Category />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/profile" element={<Profile />} />
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