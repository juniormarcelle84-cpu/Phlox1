import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cukyxbvwixzpinzgpsjw.supabase.co';

// Anonymous publishable key for public RLS select access (safe on the client)
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a3l4Ynd3aXh6cGluemdwc2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQzNDU2MDB9.placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
