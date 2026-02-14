// Permission helpers for role-based access control

export const ROLES = {
  STUDENT: 'student',
  EDITOR: 'editor', 
  ADMIN: 'admin'
};

export const PLANS = {
  FREE: 'free',
  PREMIUM: 'premium'
};

export const VISIBILITY = {
  PUBLIC: 'public',
  MEMBERS_ONLY: 'members_only',
  PREMIUM: 'premium'
};

// Permission definitions for each role
export const PERMISSIONS = {
  // Student permissions
  [ROLES.STUDENT]: {
    viewContent: true,
    viewQuestions: true,
    viewArticles: true,
    viewTools: true,
    createNotes: true,
    createBookmarks: true,
    createStudyPlans: true,
    createLogbookEntries: true,
    createForumPosts: true,
    createStudyPackages: true,
    shareStudyPackages: true,
    // Cannot edit content
    editContent: false,
    deleteContent: false,
    manageUsers: false,
    viewAudit: false,
    accessAdmin: false
  },
  // Editor permissions
  [ROLES.EDITOR]: {
    viewContent: true,
    viewQuestions: true,
    viewArticles: true,
    viewTools: true,
    createNotes: true,
    createBookmarks: true,
    createStudyPlans: true,
    createLogbookEntries: true,
    createForumPosts: true,
    createStudyPackages: true,
    shareStudyPackages: true,
    // Can edit content
    editContent: true,
    createQuestions: true,
    editQuestions: true,
    deleteQuestions: true,
    createArticles: true,
    editArticles: true,
    deleteArticles: true,
    createTools: true,
    editTools: true,
    deleteTools: true,
    manageTaxonomy: true,
    reviewContent: true,
    publishContent: true,
    accessAdmin: true,
    // Cannot manage users
    manageUsers: false,
    viewAudit: false
  },
  // Admin permissions - all permissions
  [ROLES.ADMIN]: {
    viewContent: true,
    viewQuestions: true,
    viewArticles: true,
    viewTools: true,
    createNotes: true,
    createBookmarks: true,
    createStudyPlans: true,
    createLogbookEntries: true,
    createForumPosts: true,
    createStudyPackages: true,
    shareStudyPackages: true,
    editContent: true,
    createQuestions: true,
    editQuestions: true,
    deleteQuestions: true,
    createArticles: true,
    editArticles: true,
    deleteArticles: true,
    createTools: true,
    editTools: true,
    deleteTools: true,
    manageTaxonomy: true,
    reviewContent: true,
    publishContent: true,
    accessAdmin: true,
    manageUsers: true,
    viewAudit: true,
    deleteUsers: true,
    changeUserRoles: true
  }
};

// Check if user has specific permission
export function hasPermission(user, permission) {
  if (!user || !user.role) return false;
  const rolePermissions = PERMISSIONS[user.role];
  if (!rolePermissions) return false;
  return rolePermissions[permission] === true;
}

// Convenience functions for common permission checks
export function canAccessContent(user, visibility) {
  if (!visibility || visibility === VISIBILITY.PUBLIC) return true;
  if (!user) return false;
  
  if (visibility === VISIBILITY.MEMBERS_ONLY) return true;
  if (visibility === VISIBILITY.PREMIUM) return user.plan === PLANS.PREMIUM;
  
  return false;
}

export function canEditContent(user) {
  return hasPermission(user, 'editContent');
}

export function canManageTaxonomy(user) {
  return hasPermission(user, 'manageTaxonomy');
}

export function canManageUsers(user) {
  return hasPermission(user, 'manageUsers');
}

export function canAccessAdmin(user) {
  return hasPermission(user, 'accessAdmin');
}

export function canViewAudit(user) {
  return hasPermission(user, 'viewAudit');
}

export function canReviewContent(user) {
  return hasPermission(user, 'reviewContent');
}

export function canPublishContent(user) {
  return hasPermission(user, 'publishContent');
}

export function isAdmin(user) {
  if (!user) return false;
  return user.role === ROLES.ADMIN;
}

export function isEditor(user) {
  if (!user) return false;
  return user.role === ROLES.EDITOR;
}

export function isStudent(user) {
  if (!user) return false;
  return user.role === ROLES.STUDENT;
}

// Filter content array based on user's access
export function filterAccessibleContent(items, user) {
  return items.filter(item => canAccessContent(user, item.visibility));
}

// Get upgrade prompt for locked content
export function getUpgradePrompt(visibility) {
  if (visibility === VISIBILITY.PREMIUM) {
    return {
      title: 'Premium obsah',
      description: 'Tento obsah je dostupný pouze pro Premium uživatele.',
      action: 'Upgradovat na Premium'
    };
  }
  return null;
}

// Get role display name
export function getRoleDisplayName(role) {
  const roleNames = {
    [ROLES.STUDENT]: 'Student',
    [ROLES.EDITOR]: 'Editor',
    [ROLES.ADMIN]: 'Administrátor'
  };
  return roleNames[role] || role;
}

// Get role badge color
export function getRoleBadgeColor(role) {
  const colors = {
    [ROLES.STUDENT]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    [ROLES.EDITOR]: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    [ROLES.ADMIN]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  return colors[role] || 'bg-slate-100 text-slate-700';
}