import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./db";
import { signInSchema } from "./zodSchemas";
import { v4 as uuid } from "uuid";
import { encode as defaultEncode } from "next-auth/jwt";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // Validate the input credentials using zod schema
          const { email, password } = await signInSchema.parseAsync(
            credentials
          );

          // Fetch the user from the database
          const user = await prisma.user.findFirstOrThrow({
            where: {
              email: email,
              password: password,
            },
          });

          // Return the user object
          return user;
        } catch (error) {
          console.error("Authorization error:", error);
          throw new Error("Invalid credentials.");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      // Include user ID in the session object
      if (token) {
        session.user.id = token.sub; // Assuming the user ID is stored in token.sub
      }
      return session;
    },
    async jwt({ token, user }) {
      // Store user ID in the token when the user logs in
      if (user) {
        token.sub = user.id; // Store the user ID in the token
      }
      return token;
    },
  },
});
