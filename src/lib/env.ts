function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// All env vars are lazy — only validated when actually accessed at runtime.
// This avoids build failures when env vars aren't available during static analysis.

export function getSupabaseUrl(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL')
}

export function getSupabaseAnonKey(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export function getServiceRoleKey(): string {
  return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
}

export function getAnthropicKey(): string {
  return requireEnv('ANTHROPIC_API_KEY')
}
