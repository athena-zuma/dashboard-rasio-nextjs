'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#1B4332 0%,#2D6A4F 40%,#1a3a2a 100%)',
      position: 'relative', overflow: 'hidden', padding: '24px',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 70% 30%,rgba(168,124,42,0.15) 0%,transparent 60%), radial-gradient(ellipse at 20% 80%,rgba(44,74,138,0.1) 0%,transparent 50%)',
      }} />
      <div style={{
        background: 'rgba(255,255,255,0.97)', borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.6)',
        padding: '52px 44px', width: '100%', maxWidth: 440,
        boxShadow: '0 8px 48px rgba(0,0,0,0.25)', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, marginBottom: 28,
          background: 'linear-gradient(135deg,#1B4332,#2D6A4F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(27,67,50,0.3)',
        }}>
          <span style={{ color: 'white', fontFamily: 'var(--font-fraunces)', fontSize: 18, fontWeight: 700 }}>DDD</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 30, fontWeight: 700, marginBottom: 6 }}>
          Rasio Keuangan
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>
          Zuma Indonesia Group · Analisa Neraca & Laba Rugi
        </p>

        <form onSubmit={handleLogin}>
          {(['email','password'] as const).map((field) => (
            <div key={field} style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {field === 'email' ? 'Email' : 'Password'}
              </label>
              <input
                type={field} required
                value={field === 'email' ? email : password}
                onChange={e => field === 'email' ? setEmail(e.target.value) : setPassword(e.target.value)}
                placeholder={field === 'email' ? 'email@zuma.co.id' : '••••••••'}
                style={{
                  width: '100%', padding: '13px 16px', border: '1.5px solid var(--border)',
                  borderRadius: 10, fontSize: 15, background: 'var(--bg)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </div>
          ))}

          {error && <p style={{ color: 'var(--negative)', fontSize: 13, marginBottom: 8 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 15, marginTop: 8,
            background: 'linear-gradient(135deg,#1B4332,#2D6A4F)',
            color: 'white', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? .7 : 1, boxShadow: '0 4px 16px rgba(27,67,50,0.25)',
          }}>
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
