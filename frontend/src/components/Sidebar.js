import { Link } from "react-router-dom";
import "../App.css";

function Sidebar() {

  return (

    <div className="sidebar">

      <h2 className="logo">PENNYWISE</h2>

      <Link to="/">Records</Link>
      <Link to="/analytics">Charts</Link>
      <Link to="/budget">Budget</Link>
      <Link to="/alerts">Alerts</Link>
      <Link to="/profile">Profile</Link>

    </div>

  );

}

export default Sidebar;