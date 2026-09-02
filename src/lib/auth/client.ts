"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/** Client-side Neon Auth instance: sign-in/up/out + `useSession()`. */
export const authClient = createAuthClient();
export const useSession = authClient.useSession;
