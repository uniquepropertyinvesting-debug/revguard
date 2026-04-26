"use client"

import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface LoginFormProps {
  onSuccess?: () => void
  className?: string
  onSwitchToSignup?: () => void
}

export function LoginForm({ onSuccess, className, onSwitchToSignup }: LoginFormProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <h2>Sign In</h2>

      {error && <div data-error>{error}</div>}

      <div>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="Your password"
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      {onSwitchToSignup && (
        <p>
          Don&apos;t have an account?{' '}
          <button type="button" onClick={onSwitchToSignup}>
            Sign up
          </button>
        </p>
      )}
    </form>
  )
}
