import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ScoreboardPage from './pages/ScoreboardPage'
import RefereePage from './pages/RefereePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScoreboardPage />} />
        <Route path="/referee" element={<RefereePage />} />
      </Routes>
    </BrowserRouter>
  )
}
