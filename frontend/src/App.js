import { BrowserRouter, Routes, Route } from "react-router-dom";
import Alerts from "./pages/Alerts";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Alerts />} />
        <Route path="/alerts" element={<Alerts />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;