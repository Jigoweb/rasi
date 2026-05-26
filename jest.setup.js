import '@testing-library/jest-dom';

// Default Supabase env vars for tests — modules that import supabase-client
// at top-level throw without these. Real values are mocked per-test where
// the client is actually exercised.
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
