import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { decodeJwt } from "jose";
import { forbidden, redirect } from "next/navigation";

type KeycloakClaims = {
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
};

function rolesFromAccessToken(accessToken: string | undefined): string[] {
  if (!accessToken) return [];
  try {
    const claims = decodeJwt(accessToken) as KeycloakClaims;
    const realm = claims.realm_access?.roles ?? [];
    const client = claims.resource_access?.[process.env.KEYCLOAK_CLIENT_ID ?? ""]?.roles ?? [];
    return [...realm, ...client];
  } catch {
    return [];
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      issuer: process.env.KEYCLOAK_ISSUER,
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? "",
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? "",
      checks: ["pkce", "state"],
    }),
  ],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        const roles = rolesFromAccessToken(account.access_token);
        token.idToken = account.id_token;
        token.isAdmin = Boolean(process.env.ADMIN_ROLE) && roles.includes(process.env.ADMIN_ROLE as string);
      }
      return token;
    },
    async session({ session, token }) {
      session.isAdmin = Boolean(token.isAdmin);
      return session;
    },
  },
};

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin-login");
  if (!session.isAdmin) forbidden();
  return session;
}
