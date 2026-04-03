import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CompoundCalculator from './pages/CompoundCalculator';
import KellyCalculator from './pages/KellyCalculator';
import MartingaleSimulator from './pages/MartingaleSimulator';
import VIPStrategy from './pages/VIPStrategy';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/compound" element={<CompoundCalculator />} />
        <Route path="/kelly" element={<KellyCalculator />} />
        <Route path="/martingale" element={<MartingaleSimulator />} />
        <Route path="/vip" element={<VIPStrategy />} />
      </Routes>
    </BrowserRouter>
  );
}
