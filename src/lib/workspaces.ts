export type AccessibleWorkspace = {
  slug: string;
  name: string;
  mode: "personal" | "organization";
  clerkOrgId?: string;
  role?: string;
  isBootstrapped: boolean;
};
