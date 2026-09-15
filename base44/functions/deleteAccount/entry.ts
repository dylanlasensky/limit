import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { deleteAccountData } from "../../shared/accountData.js";

export default async function (req) {
  if (req.method !== "POST")
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await req.json().catch(() => ({}));
    if (payload.dryRun === true) return Response.json({ ok: true, authenticated: true });
    if (payload.confirm !== true)
      return Response.json({ error: "Confirmation required" }, { status: 400 });
    await deleteAccountData(base44, user.id);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error?.status || error?.response?.status;
    return Response.json(
      {
        error:
          status === 401
            ? "Sign in again to delete your account."
            : "Account deletion did not finish. Please retry before signing out.",
      },
      { status: status === 401 ? 401 : 500 }
    );
  }
}
