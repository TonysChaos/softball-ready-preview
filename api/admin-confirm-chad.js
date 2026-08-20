import { createClient } from "@supabase/supabase-js";

const CHAD_USER_ID = "bb606c76-af52-4da7-a59a-3939c4165db6";
const CHAD_EMAIL = "chad.floyd@artech.com";

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return send(res, 500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." });
  }

  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return send(res, 401, { error: "Admin login required." });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) return send(res, 401, { error: "Admin session could not be verified." });

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("account_type")
    .eq("id", authData.user.id)
    .single();

  if (profileError || String(profile?.account_type || "").toLowerCase() !== "admin") {
    return send(res, 403, { error: "Only the SoftballReady admin can do this." });
  }

  const { data: beforeData, error: beforeError } = await admin.auth.admin.getUserById(CHAD_USER_ID);
  if (beforeError || !beforeData?.user) return send(res, 404, { error: "Chad's user record was not found." });

  if (String(beforeData.user.email || "").toLowerCase() !== CHAD_EMAIL) {
    return send(res, 409, { error: "Safety check failed: Chad's email does not match." });
  }

  if (beforeData.user.email_confirmed_at) {
    return send(res, 200, {
      ok: true,
      alreadyConfirmed: true,
      confirmedAt: beforeData.user.email_confirmed_at,
      message: "Chad is already confirmed."
    });
  }

  const { data, error } = await admin.auth.admin.updateUserById(
    CHAD_USER_ID,
    { email_confirm: true }
  );

  if (error) return send(res, 500, { error: error.message || "Could not confirm Chad." });

  return send(res, 200, {
    ok: true,
    alreadyConfirmed: false,
    confirmedAt: data.user?.email_confirmed_at || null,
    message: "Chad Floyd's email is now confirmed."
  });
}
