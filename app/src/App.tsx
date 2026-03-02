import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Locations from './pages/Locations'
import Wines from './pages/Wines'
import WineDetail from './pages/WineDetail'
import AddWine from './pages/AddWine'
import BulkPlace from './pages/BulkPlace'
import WineList from './pages/WineList'

const queryClient = new QueryClient()
const PASS = 'ikhebdorst'
const AUTH_KEY = 'wijnkelder_auth'

function LoginGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === 'true')
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (authed) return <>{children}</>

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === PASS) {
      localStorage.setItem(AUTH_KEY, 'true')
      setAuthed(true)
    } else {
      setError(true)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 shadow-sm border border-stone-200 w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Wijnkelder</h1>
        <p className="text-stone-500 text-sm text-center">Voer het wachtwoord in om door te gaan</p>
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false) }}
          placeholder="Wachtwoord"
          className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-800"
          autoFocus
        />
        {error && <p className="text-red-600 text-sm">Onjuist wachtwoord</p>}
        <button
          type="submit"
          className="w-full py-3 bg-red-800 text-white rounded-lg font-medium hover:bg-red-900"
        >
          Inloggen
        </button>
      </form>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoginGate>
        <BrowserRouter>
          <div className="min-h-screen bg-stone-50 text-stone-900">
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex justify-around py-2 md:static md:border-b md:border-t-0">
              <NavLink to="/dashboard" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Dashboard</NavLink>
              <NavLink to="/wines" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Wijnen</NavLink>
              <NavLink to="/" end className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Lijst</NavLink>
              <NavLink to="/locations" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Locaties</NavLink>
              <NavLink to="/add" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Toevoegen</NavLink>
            </nav>
            <main className="pb-20 md:pb-0 p-4 max-w-6xl mx-auto">
              <Routes>
                <Route path="/" element={<WineList />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/locations/*" element={<Locations />} />
                <Route path="/wines" element={<Wines />} />
                <Route path="/wines/:id" element={<WineDetail />} />
                <Route path="/add" element={<AddWine />} />
                <Route path="/winelist" element={<WineList />} />
                <Route path="/place" element={<BulkPlace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </LoginGate>
    </QueryClientProvider>
  )
}

export default App
