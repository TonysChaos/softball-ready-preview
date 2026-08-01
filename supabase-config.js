import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ydmyvrueejaeuuefwffi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WU2fcMzrNLO_s0K7G0lmdQ_lFo5rJbc";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
