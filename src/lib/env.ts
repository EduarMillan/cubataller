function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabasePublicEnv() {
  return {
    supabaseUrl: requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSupabaseServiceRoleKey() {
  return requiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");
}
