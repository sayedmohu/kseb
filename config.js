// Supabase configuration.
// Replace ONLY these two values with your Supabase Project URL and Publishable key.
// Never put your Supabase Secret key here.

const SUPABASE_URL = "https://xbtvfzmnpsocwaecuohp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_L4ude82Mrj8IywEGJzs0Mw_t_vq6xUH";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
