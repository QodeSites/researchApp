'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleMicrosoftLogin = async () => {
    setIsLoading(true)
    try {
      // Redirect to your Microsoft OAuth endpoint
      window.location.href = '/api/auth/microsoft' 
    } catch (err) {
      console.error('Microsoft login failed', err)
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background gap-8">
      <h1 className="font-serif text-4xl md:text-5xl text-primary font-bold text-center tracking-tight">
        Qode360
      </h1>

      <div className="w-full max-w-sm rounded-lg bg-card p-6 card-shadow">
        <button
          onClick={handleMicrosoftLogin}
          disabled={isLoading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm md:text-lg font-semibold bg-primary text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {isLoading ? 'Redirecting…' : 'Sign in with Microsoft'}
        </button>
      </div>

      <div className="text-xs md:text-sm text-wrap m-2 text-center">
        © 2025 Qode Advisors LLP | SEBI Registered PMS No: INP000008914 | All Rights Reserved
      </div>
    </main>
  )
}
