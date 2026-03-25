import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";

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

const PrivateRoute = ({ children }) => {
  const user = localStorage.getItem("user");

  return user ? children : <Navigate to="/login" />;
};

function AppLayout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Identify auth routes to remove sidebar and margins
  const isAuthRoute = ["/login", "/signup", "/forgot-password"].includes(location.pathname);

  // Define sidebar width to match your CSS exactly
  const sidebarWidth = isCollapsed ? "70px" : "260px";

  return (
    <div style={{ display: "flex", backgroundColor: "#050a15", minHeight: "100vh", width: "100%" }}>
      {/* Sidebar only shows on app pages */}
      {!isAuthRoute && (
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      )}

      <div 
        className="page-content" 
        style={{ 
          flex: 1, 
          // CRITICAL: 0px for login, sidebarWidth for app
          marginLeft: isAuthRoute ? "0px" : sidebarWidth,
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          width: isAuthRoute ? "100%" : `calc(100% - ${sidebarWidth})`,
          display: "block",
          boxSizing: "border-box"
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
<Route path="/signup" element={<Signup />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
         <Route path="/" element={<PrivateRoute><Records /></PrivateRoute>} />
<Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
<Route path="/category" element={<PrivateRoute><Category /></PrivateRoute>} />
<Route path="/budget" element={<PrivateRoute><Budget /></PrivateRoute>} />
<Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
<Route path="/alerts" element={<PrivateRoute><Alerts /></PrivateRoute>} />
<Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
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