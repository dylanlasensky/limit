import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { exportAccountData } from "../../shared/accountData.js";

export default async function (req) {
  if (req.method !== "POST")
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req),
      user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    // Request parameters never select an account. User authentication + RLS stay active.
    const exported = await exportAccountData(base44, user);
    return Response.json(exported, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch (error) {
    const status = error?.status || error?.response?.status;
    return Response.json(
      { error: "Couldn’t export your complete data. Nothing was changed; please retry." },
      { status: status === 401 ? 401 : 500 }
    );
  }
}
