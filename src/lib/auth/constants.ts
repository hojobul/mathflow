// Shared between client and server auth helpers — no server-only imports
// here, so client components can pull it in safely.

/** Matches prisma/seed.ts's fixed "demo-user" row. */
export const GUEST_USER_ID_CLIENT = "demo-user";
export const GUEST_EMAIL_CLIENT = "demo@mathflow.app";
