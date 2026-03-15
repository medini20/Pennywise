import React from "react";
import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div>
      <h2>PENNYWISE</h2>

      <nav>
        <Link to="/records">Records</Link><br/>
        <Link to="/charts">Charts</Link><br/>
        <Link to="/budget">Budget</Link><br/>
        <Link to="/alerts">Alerts</Link><br/>
        <Link to="/profile">Profile</Link>
      </nav>
    </div>
  );
}

export default Sidebar;