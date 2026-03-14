import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Category from "./pages/Category";
import Budget from "./pages/Budget";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";

function App(){

return(

<BrowserRouter>

<Routes>

<Route path="/" element={<Dashboard />} />

<Route path="/transactions" element={<Transactions />} />

<Route path="/category" element={<Category />} />

<Route path="/budget" element={<Budget />} />

<Route path="/analytics" element={<Analytics />} />

<Route path="/profile" element={<Profile />} />

</Routes>

</BrowserRouter>

)

}

export default App;