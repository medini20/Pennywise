import { Link, useLocation } from "react-router-dom";
//import { Receipt, PieChart, BarChart3, User, Bell, LayoutDashboard } from 'lucide-react';
import "../App.css";

function Sidebar(){

const location = useLocation();

return(

<div className="sidebar">

<div className="logo">
<span className="logo-icon">📊</span>
<span>PENNYWISE</span>
</div>


<Link className={location.pathname === "/" ? "active" : ""} to="/">
Records
</Link>

<Link className={location.pathname === "/analytics" ? "active" : ""} to="/analytics">
Charts
</Link>

<Link className={location.pathname === "/budget" ? "active" : ""} to="/budget">
Budget
</Link>

<Link className={location.pathname === "/alerts" ? "active" : ""} to="/alerts">
Alerts
</Link>

<Link className={location.pathname === "/profile" ? "active" : ""} to="/profile">
Profile
</Link>

</div>

);

}

export default Sidebar;