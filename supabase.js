const SUPABASE_URL = "https://uchkzxhliytfhuumdhwm.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_dGubFB0M5cFc5j_qOjimgA_qDoQCNR4";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);