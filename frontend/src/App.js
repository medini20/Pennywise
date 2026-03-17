import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Records from "./pages/records";
import Transactions from "./pages/Transactions";
import Category from "./pages/Category";
import Budget from "./pages/Budget";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Alerts from "./pages/Alerts";

function App() {

return (

<BrowserRouter>

<div style={{display:"flex"}}>

<Sidebar />

<div className="page-content">

<Routes>

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

</BrowserRouter>

);

}

export default App;