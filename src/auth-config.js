// Public browser configuration. Never put a service-role key or OAuth secret here.
// Configure provider secrets only in the Supabase dashboard.
export const authConfig = {
  url: 'https://ocftoznoinuvdrfayhpf.supabase.co',
  publishableKey: 'sb_publishable_lKDm7Vdlh3SrZ84GtzNmPg_Twusk5E3',
  // Available: google, facebook, apple, azure (Microsoft).
  // Add providers only once their credentials have been enabled in Supabase.
  providers: [],
  // Email sign-in sends a one-time link through Supabase Auth (no password is stored here).
  // Supabase must have email authentication and the site redirect enabled.
  emailEnabled: true,
};
