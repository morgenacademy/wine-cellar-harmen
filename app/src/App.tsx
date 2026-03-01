import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './pages/Dashboard'
import Locations from './pages/Locations'
import Wines from './pages/Wines'
import WineDetail from './pages/WineDetail'
import AddWine from './pages/AddWine'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-stone-50 text-stone-900">
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex justify-around py-2 md:static md:border-b md:border-t-0">
            <NavLink to="/" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Dashboard</NavLink>
            <NavLink to="/locations" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Locaties</NavLink>
            <NavLink to="/wines" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Wijnen</NavLink>
            <NavLink to="/add" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Toevoegen</NavLink>
          </nav>
          <main className="pb-20 md:pb-0 p-4 max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/locations/*" element={<Locations />} />
              <Route path="/wines" element={<Wines />} />
              <Route path="/wines/:id" element={<WineDetail />} />
              <Route path="/add" element={<AddWine />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
