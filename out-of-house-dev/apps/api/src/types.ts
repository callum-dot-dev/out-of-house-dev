// Authorization primitives. Every repository function takes a Viewer and scopes
// its SQL accordingly (A2 — this replaces Supabase RLS).
export type Role = 'client' | 'developer' | 'admin';

export type Viewer = {
  id: string;
  role: Role;
  email: string;
};

export const isAdmin = (v: Viewer): boolean => v.role === 'admin';
export const isStaff = (v: Viewer): boolean => v.role === 'developer' || v.role === 'admin';

declare module 'fastify' {
  interface FastifyRequest {
    viewer?: Viewer;
  }
}
