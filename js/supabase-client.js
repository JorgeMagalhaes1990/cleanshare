import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const PLACEHOLDER_KEY = "__SUPABASE_PUBLISHABLE_KEY__";

export const isSupabaseConfigured = Boolean(
    SUPABASE_URL
    && SUPABASE_PUBLISHABLE_KEY
    && SUPABASE_PUBLISHABLE_KEY !== PLACEHOLDER_KEY
);

let clientPromise = null;

export async function getSupabaseClient() {
    if (!isSupabaseConfigured) return null;
    if (!clientPromise) {
        clientPromise = import(SUPABASE_CDN)
            .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }))
            .catch((error) => {
                clientPromise = null;
                throw error;
            });
    }
    return clientPromise;
}
