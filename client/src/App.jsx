import { Routes, Route } from 'react-router-dom';
import SystemStatusPage from './pages/SystemStatusPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<SystemStatusPage />} />
    </Routes>
  );
}
