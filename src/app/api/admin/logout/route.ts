import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { appUrl } from "@/lib/codes";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const base = (process.env.NEXTAUTH_URL || appUrl()).replace(/\/$/, "");
  let target = `${base}/admin`;
  if (process.env.KEYCLOAK_ISSUER) {
    const url = new URL(`${process.env.KEYCLOAK_ISSUER.replace(/\/$/, "")}/protocol/openid-connect/logout`);
    url.searchParams.set("post_logout_redirect_uri", `${base}/`);
    if (token?.idToken) url.searchParams.set("id_token_hint", token.idToken);
    else url.searchParams.set("client_id", process.env.KEYCLOAK_CLIENT_ID ?? "");
    target = url.toString();
  }
  const response = NextResponse.redirect(target);
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.includes("next-auth.session-token")) {
      response.cookies.set(cookie.name, "", { path: "/", maxAge: 0, secure: cookie.name.startsWith("__Secure-") });
    }
  }
  return response;
}
