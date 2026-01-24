/**
 * Role-based feature access control a monetizační limity
 */

// Denní limity pro free vs premium
const AI_LIMITS = {
  free: 10,
  premium: Infinity
};

/**
 * Zkontroluje, zda uživatel může použít danou funkci
 * @param {Object} user - User objekt
 * @param {string} feature - Název funkce (ai_answer, quiz_generator, pdf_export, flashcards)
 * @returns {Object} { allowed: boolean, reason?: string }
 */
export function canUseFeature(user, feature) {
  if (!user) {
    return { allowed: false, reason: 'Přihlaste se pro přístup k této funkci.' };
  }

  const plan = user.plan || 'free';
  const role = user.role || 'student';

  // Admin/Editor vždy plný přístup
  if (role === 'admin' || role === 'editor') {
    return { allowed: true };
  }

  // Feature-specific checks
  switch (feature) {
    case 'ai_answer':
      // AI odpovědi - limit denně
      const today = new Date().toISOString().split('T')[0];
      const resetDate = user.ai_usage_reset_date?.split('T')[0];
      const usage = resetDate === today ? (user.ai_usage_today || 0) : 0;
      
      const limit = AI_LIMITS[plan];
      
      if (usage >= limit) {
        return {
          allowed: false,
          reason: plan === 'free' 
            ? `Dosáhli jste denního limitu ${limit} AI odpovědí. Upgradujte na Premium pro neomezený přístup.`
            : 'Dosažen denní limit AI odpovědí.'
        };
      }
      return { allowed: true };

    case 'quiz_generator':
      // Quiz generátor - pouze premium
      if (plan !== 'premium') {
        return {
          allowed: false,
          reason: 'Quiz generátor je dostupný pouze pro Premium uživatele.'
        };
      }
      return { allowed: true };

    case 'flashcards':
      // Flashcards - pouze premium
      if (plan !== 'premium') {
        return {
          allowed: false,
          reason: 'Flashcards jsou dostupné pouze pro Premium uživatele.'
        };
      }
      return { allowed: true };

    case 'pdf_export':
      // PDF export - pouze premium
      if (plan !== 'premium') {
        return {
          allowed: false,
          reason: 'Export do PDF je dostupný pouze pro Premium uživatele.'
        };
      }
      return { allowed: true };

    case 'unlimited_notes':
      // Neomezené poznámky - pouze premium
      if (plan !== 'premium') {
        return {
          allowed: false,
          reason: 'Neomezené poznámky jsou dostupné pouze pro Premium uživatele.'
        };
      }
      return { allowed: true };

    default:
      return { allowed: true };
  }
}

/**
 * Zkontroluje, zda má uživatel premium
 */
export function isPremium(user) {
  return user?.plan === 'premium' || user?.role === 'admin' || user?.role === 'editor';
}

/**
 * Vrátí zbývající AI credity pro dnes
 */
export function getRemainingAICredits(user) {
  if (!user) return 0;
  
  const plan = user.plan || 'free';
  const limit = AI_LIMITS[plan];
  
  if (limit === Infinity) return Infinity;
  
  const today = new Date().toISOString().split('T')[0];
  const resetDate = user.ai_usage_reset_date?.split('T')[0];
  const usage = resetDate === today ? (user.ai_usage_today || 0) : 0;
  
  return Math.max(0, limit - usage);
}

/**
 * Soft upsell zprávy pro monetizaci
 */
export const UPSELL_MESSAGES = {
  ai_limit: {
    title: 'Získejte neomezené AI odpovědi',
    description: 'Upgradujte na Premium a využívejte AI asistenta bez limitů pro přípravu na atestace.',
    cta: 'Upgradovat na Premium'
  },
  quiz: {
    title: 'Procvičujte si s AI kvízy',
    description: 'Premium uživatelé mohou generovat MCQ kvízy pro testování znalostí.',
    cta: 'Odemknout Premium'
  },
  flashcards: {
    title: 'Efektivní opakování s flashcards',
    description: 'Vytvářejte si AI flashcards pro rychlé opakování klíčových konceptů.',
    cta: 'Získat Premium'
  },
  pdf: {
    title: 'Exportujte své studijní materiály',
    description: 'S Premium můžete exportovat otázky a odpovědi do PDF pro offline studium.',
    cta: 'Aktivovat Premium'
  }
};