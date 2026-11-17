import NextAuth from "next-auth";
import { authOptions } from "@/lib/admin";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
