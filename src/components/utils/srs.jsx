// Spaced Repetition System (SRS) algorithm helpers

export const RATINGS = {
  EASY: 'easy',
  MEDIUM: 'medium', 
  HARD: 'hard'
};

export const STATUS = {
  NEW: 'new',
  LEARNING: 'learning',
  MASTERED: 'mastered'
};

// Calculate next review date based on rating
export function calculateNextReview(progress, rating) {
  const now = new Date();
  let { ease_factor = 2.5, interval_days = 0, repetitions = 0 } = progress;
  
  let newEase = ease_factor;
  let newInterval = interval_days;
  let newRepetitions = repetitions;
  let newStatus = progress.status || STATUS.NEW;
  
  switch (rating) {
    case RATINGS.EASY:
      newRepetitions = repetitions + 1;
      newInterval = Math.max(3, Math.round(interval_days * 2));
      newEase = Math.min(3.0, ease_factor + 0.1);
      if (newRepetitions >= 3) newStatus = STATUS.MASTERED;
      else newStatus = STATUS.LEARNING;
      break;
      
    case RATINGS.MEDIUM:
      newRepetitions = repetitions + 1;
      newInterval = Math.max(2, Math.round(interval_days * 1.5));
      // Ease factor unchanged
      if (newRepetitions >= 5) newStatus = STATUS.MASTERED;
      else newStatus = STATUS.LEARNING;
      break;
      
    case RATINGS.HARD:
      newRepetitions = Math.max(0, repetitions - 1);
      newInterval = 1;
      newEase = Math.max(1.3, ease_factor - 0.2);
      newStatus = STATUS.LEARNING;
      break;
  }
  
  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
  
  return {
    ease_factor: newEase,
    interval_days: newInterval,
    repetitions: newRepetitions,
    status: newStatus,
    last_reviewed_at: now.toISOString(),
    next_review_at: nextReviewAt.toISOString()
  };
}

// Get questions due for review today
export function getDueQuestions(progressList, dailyGoal = 15) {
  const now = new Date();
  
  // Get questions that are due or new
  const due = progressList.filter(p => {
    if (p.status === STATUS.NEW) return true;
    if (!p.next_review_at) return true;
    return new Date(p.next_review_at) <= now;
  });
  
  // Sort: learning first, then by due date
  due.sort((a, b) => {
    if (a.status === STATUS.LEARNING && b.status !== STATUS.LEARNING) return -1;
    if (b.status === STATUS.LEARNING && a.status !== STATUS.LEARNING) return 1;
    const aDate = a.next_review_at ? new Date(a.next_review_at) : new Date(0);
    const bDate = b.next_review_at ? new Date(b.next_review_at) : new Date(0);
    return aDate - bDate;
  });
  
  return due.slice(0, dailyGoal);
}

// Calculate overall progress stats
export function calculateProgressStats(progressList) {
  const total = progressList.length;
  if (total === 0) return { new: 0, learning: 0, mastered: 0, total: 0, percentage: 0 };
  
  const stats = {
    new: progressList.filter(p => p.status === STATUS.NEW || !p.status).length,
    learning: progressList.filter(p => p.status === STATUS.LEARNING).length,
    mastered: progressList.filter(p => p.status === STATUS.MASTERED).length,
    total
  };
  
  stats.percentage = Math.round((stats.mastered / total) * 100);
  return stats;
}