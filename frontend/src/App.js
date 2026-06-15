import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import FormEditor from "@/pages/FormEditor";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/form/new" element={<FormEditor />} />
        <Route path="/form/:id" element={<FormEditor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
