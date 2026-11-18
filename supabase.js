const SUPABASE_URL = "https://fdbvuzcgdmcmdqhumfdo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_Hh3RRQq1kI7IDzQ5FGRckA_vReTuQnI";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
