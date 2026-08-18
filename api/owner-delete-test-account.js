import { createClient } from "@supabase/supabase-js";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return json(res, 500, {
        error: "Server configuration is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
      });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json(res, 401, { error: "Owner login is required." });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: requesterData, error: requesterError } = await admin.auth.getUser(token);
    if (requesterError || !requesterData?.user) {
      return json(res, 401, { error: "Owner session could not be verified." });
    }

    const requesterId = requesterData.user.id;
    const { data: requesterProfile, error: rpError } = await admin
      .from("profiles")
      .select("id,account_type")
      .eq("id", requesterId)
      .single();

    if (rpError || requesterProfile?.account_type !== "admin") {
      return json(res, 403, { error: "Only the owner/admin account can delete test accounts." });
    }

    const userId = String(req.body?.user_id || "").trim();
    if (!userId) return json(res, 400, { error: "A test account ID is required." });

    if (userId === requesterId) {
      return json(res, 400, { error: "The owner/admin account is protected and cannot delete itself." });
    }

    const { data: targetProfile, error: tpError } = await admin
      .from("profiles")
      .select("id,full_name,email,account_type")
      .eq("id", userId)
      .maybeSingle();

    if (tpError) throw tpError;
    if (!targetProfile) return json(res, 404, { error: "That account was not found." });

    if (targetProfile.account_type === "admin") {
      return json(res, 400, { error: "Admin accounts are protected and cannot be deleted here." });
    }

    // Delete the Supabase Auth user. App rows that reference auth.users with
    // ON DELETE CASCADE are removed by the database. Stripe history is separate
    // and is intentionally not touched by this endpoint.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return json(res, 200, {
      ok: true,
      deleted_user_id: userId,
      deleted_name: targetProfile.full_name || targetProfile.email || "Test account"
    });
  } catch (error) {
    console.error("owner-delete-test-account error:", error);
    return json(res, 500, { error: error?.message || "Test account deletion failed." });
  }
}
