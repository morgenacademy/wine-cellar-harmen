import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders navigation', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Locaties' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Wijnen' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Toevoegen' })).toBeInTheDocument()
  })
})
