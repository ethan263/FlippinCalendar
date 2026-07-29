/**
 * Customer-facing labels: Clerk “organization” = the customer’s business.
 * Keep technical IDs / DB columns as organization under the hood.
 */
export const clerkBusinessLocalization = {
  organizationSwitcher: {
    action__createOrganization: "Add business",
    action__manageOrganization: "Manage business",
    action__invitationAccept: "Join",
    action__suggestionsAccept: "Request to join",
    subtitle: "Select a business",
    title: "Businesses",
  },
  organizationList: {
    action__createOrganization: "Create business",
    action__invitationAccept: "Join",
    action__suggestionsAccept: "Request to join",
    createOrganization: "Create business",
    title: "Choose a business",
    titleWithoutPersonal: "Choose a business",
  },
  createOrganization: {
    formButtonSubmit: "Create business",
    title: "Create your business",
  },
  organizationProfile: {
    navbar: {
      title: "Business",
      description: "Manage your business",
    },
    start: {
      headerTitle__members: "Members",
      headerTitle__general: "General",
      profileSection: {
        primaryButton: "Update business",
        title: "Business profile",
      },
    },
    profilePage: {
      successMessage: "Business updated.",
      title: "Update business",
    },
  },
} as const;
