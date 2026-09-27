import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AppPage from './pages/AppPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AppPage />} />
    </Routes>
  );
}

export default App;
