import { createClient } from '@supabase/supabase-js';
import { loadConfig } from '@tekupvault/vault-core';

const config = loadConfig();

// Create Supabase client with fallback to placeholder values
// (Worker uses DATABASE_URL directly via postgres, Supabase client is optional)
export const supabase = createClient(
  config.SUPABASE_URL || 'https://placeholder.supabase.co',
  config.SUPABASE_SERVICE_KEY || 'placeholder_key'
);
