// Permission helpers for role-based access control

export const ROLES = {
  USER: 'user',
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

// Check if user can access content based on visibility and plan
export function canAccessContent(user, visibility) {
  if (!visibility || visibility === VISIBILITY.PUBLIC) return true;
  if (!user) return false;
  
  if (visibility === VISIBILITY.MEMBERS_ONLY) return true;
  if (visibility === VISIBILITY.PREMIUM) return user.plan === PLANS.PREMIUM;
  
  return false;
}

// Check if user has editor or admin role
export function canEditContent(user) {
  if (!user) return false;
  return user.role === ROLES.EDITOR || user.role === ROLES.ADMIN;
}

// Check if user is admin
export function isAdmin(user) {
  if (!user) return false;
  return user.role === ROLES.ADMIN;
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