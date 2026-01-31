import {
  authenticateRequest,
  getAuthConfig,
} from "@every-app/sdk/tanstack/server";

type Session = Awaited<ReturnType<typeof authenticateRequest>>;

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export async function requireApiAuth(request: Request): Promise<{
  session: Session | null;
  response: Response | null;
}> {
  const authConfig = getAuthConfig();
  const session = await authenticateRequest(authConfig, request);

  if (!session || !session.sub) {
    return { session: null, response: unauthorizedResponse() };
  }

  return { session, response: null };
}
