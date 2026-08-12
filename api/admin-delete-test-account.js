import { admin, user } from "./_server-helpers.js";

const IGNORABLE_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

function ignorable(error) {
  if (!error) return false;
  if (IGNORABLE_CODES.has(error.code)) return true;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the") && msg.includes("column")
  );
}

async function deleteEq(s, table, column, value) {
  if (value === undefined || value === null || value === "") return;
  const { error } = await s.from(table).delete().eq(column, value);
  if (error && !ignorable(error)) throw error;
}

async function deleteIn(s, table, column, values) {
  if (!Array.isArray(values) || !values.length) return;
  const { error } = await s.from(table).delete().in(column, values);
  if (error && !ignorable(error)) throw error;
}

async function safeSelectIds(s, table, ownerColumn, ownerId) {
  const { data, error } = await s.from(table).select("id").eq(ownerColumn, ownerId);
  if (error) {
    if (ignorable(error)) return [];
    throw error;
  }
  return (data || []).map(row => row.id).filter(v => v !== null && v !== undefined);
}

async function removePlayerPhotoFolder(s, userId) {
  const bucket = s.storage.from("player-photos");
  const { data: playerFolders, error } = await bucket.list(userId, { limit: 1000 });
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("bucket") && msg.includes("not found")) return;
    // Storage cleanup should not prevent database cleanup.
    console.warn("Player photo folder listing skipped:", error.message);
    return;
  }

  for (const folder of playerFolders || []) {
    const playerFolder = `${userId}/${folder.name}`;
    const { data: files, error:fileError } = await bucket.list(playerFolder, { limit: 1000 });
    if (fileError) {
      console.warn("Player photo listing skipped:", fileError.message);
      continue;
    }
    const paths = (files || [])
      .filter(item => item.name && item.id)
      .map(item => `${playerFolder}/${item.name}`);
    if (paths.length) {
      const { error:removeError } = await bucket.remove(paths);
      if (removeError) console.warn("Some player photos could not be removed:", removeError.message);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const s = admin();
    const caller = await user(req, s);

    const { data:callerProfile, error:callerError } = await s
      .from("profiles")
      .select("account_type")
      .eq("id", caller.id)
      .single();

    if (callerError) throw callerError;
    if (callerProfile?.account_type !== "admin") {
      return res.status(403).json({ error: "Owner/admin access is required." });
    }

    const targetId = String(req.body?.target_user_id || "").trim();
    if (!targetId) return res.status(400).json({ error: "A target account is required." });
    if (targetId === caller.id) {
      return res.status(400).json({ error: "Your owner/admin account is protected and cannot delete itself." });
    }

    const { data:targetProfile, error:targetError } = await s
      .from("profiles")
      .select("id,full_name,email,account_type")
      .eq("id", targetId)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!targetProfile) return res.status(404).json({ error: "That account could not be found." });
    if (targetProfile.account_type === "admin") {
      return res.status(400).json({ error: "Admin accounts are protected from test cleanup." });
    }

    const [playerIds, needIds] = await Promise.all([
      safeSelectIds(s, "players", "owner_id", targetId),
      safeSelectIds(s, "team_needs", "owner_id", targetId)
    ]);

    // Remove uploaded player photos first while their folder IDs are still easy to locate.
    await removePlayerPhotoFolder(s, targetId);

    // Child records first.
    await deleteEq(s, "pickup_interests", "player_owner_id", targetId);
    await deleteIn(s, "pickup_interests", "player_id", playerIds);
    await deleteIn(s, "pickup_interests", "team_need_id", needIds);

    // Messaging / tryout tables can vary by build. Missing tables or columns are safely ignored.
    await deleteEq(s, "messages", "sender_id", targetId);
    await deleteEq(s, "conversation_participants", "user_id", targetId);
    await deleteEq(s, "conversations", "coach_id", targetId);
    await deleteEq(s, "conversations", "player_owner_id", targetId);
    await deleteEq(s, "tryouts", "owner_id", targetId);
    await deleteEq(s, "tryouts", "user_id", targetId);

    // Core SoftballReady.net records.
    await deleteEq(s, "team_needs", "owner_id", targetId);
    await deleteEq(s, "players", "owner_id", targetId);
    await deleteEq(s, "teams", "owner_id", targetId);
    await deleteEq(s, "memberships", "user_id", targetId);
    await deleteEq(s, "profiles", "id", targetId);

    // Finally remove the Supabase Auth login itself.
    const { error:authDeleteError } = await s.auth.admin.deleteUser(targetId, false);
    if (authDeleteError) throw authDeleteError;

    return res.status(200).json({
      ok: true,
      deleted_name: targetProfile.full_name || targetProfile.email || "Test account",
      stripe_history_preserved: true
    });
  } catch (error) {
    console.error("admin-delete-test-account:", error);
    return res.status(400).json({ error: error.message || "The test account could not be deleted." });
  }
}
