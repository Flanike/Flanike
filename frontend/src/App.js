import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import FormEditor from "@/pages/FormEditor";
import Catalogo from "@/pages/Catalogo";
import Resumo from "@/pages/Resumo";
import Semanal from "@/pages/Semanal";
import Fechadas from "@/pages/Fechadas";
import PrintD1 from "@/pages/PrintD1";
import "@/lib/offlineBootstrap"; // dispara pré-cache agressivo na carga

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/form/new" element={<FormEditor />} />
        <Route path="/form/:id" element={<FormEditor />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/resumo" element={<Resumo />} />
        <Route path="/semanal" element={<Semanal />} />
        <Route path="/fechadas" element={<Fechadas />} />
        <Route path="/print/:id" element={<PrintD1 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
