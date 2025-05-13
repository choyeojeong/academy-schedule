import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import StudentDashboard from './components/StudentDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/schedule/:week" element={<SchedulePage />} />
        <Route path="/students/:id" element={<StudentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
