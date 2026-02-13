/**
 * pages.config.js - Page routing configuration
 * Uses React.lazy for route-level code splitting
 */
import { lazy } from 'react';

// Layout is eagerly loaded (always needed)
import __Layout from './Layout.jsx';

// Helper for cleaner lazy imports
const L = (fn) => lazy(fn);

export const PAGES = {
  // === Core pages (most visited) ===
  "Dashboard":          L(() => import('./pages/DashboardV2')),
  "DashboardV2":        L(() => import('./pages/DashboardV2')),
  "StudiumV2":          L(() => import('./pages/StudiumV2')),
  "ReviewToday":        L(() => import('./pages/ReviewToday')),
  "TopicDetail":        L(() => import('./pages/TopicDetail')),
  "TopicDetailV2":      L(() => import('./pages/TopicDetail')),
  "TopicDetailV4":      L(() => import('./pages/TopicDetail')),

  // === Public pages ===
  "Landing":            L(() => import('./pages/Landing')),
  "Demo":               L(() => import('./pages/Demo')),
  "Pricing":            L(() => import('./pages/Pricing')),

  // === Study ===
  "Studium":            L(() => import('./pages/Studium')),
  "OkruhDetail":        L(() => import('./pages/OkruhDetail')),
  "QuestionDetail":     L(() => import('./pages/QuestionDetail')),
  "FlashcardReviewV2":  L(() => import('./pages/FlashcardReviewV2')),
  "StudyPackages":      L(() => import('./pages/StudyPackages')),
  "StudyPackageDetail": L(() => import('./pages/StudyPackageDetail')),
  "StudyPackageCreate": L(() => import('./pages/StudyPackageCreate')),

  // === Tests ===
  "TestGenerator":      L(() => import('./pages/TestGenerator')),
  "TestGeneratorV2":    L(() => import('./pages/TestGeneratorV2')),
  "TestSession":        L(() => import('./pages/TestSession')),
  "TestSessionV2":      L(() => import('./pages/TestSessionV2')),
  "TestResults":        L(() => import('./pages/TestResults')),
  "TestResultsV2":      L(() => import('./pages/TestResultsV2')),

  // === Plans ===
  "StudyPlansV2":       L(() => import('./pages/StudyPlansV2')),
  "StudyPlanAI":        L(() => import('./pages/StudyPlanAI')),
  "StudyPlanCreate":    L(() => import('./pages/StudyPlanCreate')),
  "StudyPlanDetail":    L(() => import('./pages/StudyPlanDetail')),
  "StudyPlanner":       L(() => import('./pages/StudyPlanner')),

  // === Tools ===
  "ClinicalCalculators": L(() => import('./pages/ClinicalCalculators')),
  "DrugDatabase":       L(() => import('./pages/DrugDatabase')),
  "ClinicalGuidelines": L(() => import('./pages/ClinicalGuidelines')),
  "ToolDetail":         L(() => import('./pages/ToolDetail')),
  "Tools":              L(() => import('./pages/Tools')),

  // === Social ===
  "Forum":              L(() => import('./pages/Forum')),
  "ForumThread":        L(() => import('./pages/ForumThread')),
  "StudyGroups":        L(() => import('./pages/StudyGroups')),
  "Leaderboards":       L(() => import('./pages/Leaderboards')),

  // === User ===
  "Profile":            L(() => import('./pages/Profile')),
  "MyProfile":          L(() => import('./pages/MyProfile')),
  "AccountSettings":    L(() => import('./pages/AccountSettings')),
  "AICredits":          L(() => import('./pages/AICredits')),
  "UserSettings":       L(() => import('./pages/UserSettings')),

  // === Logbook / Atestace ===
  "Logbook":            L(() => import('./pages/LogbookV2')),
  "Atestace":           L(() => import('./pages/Atestace')),

  // === Search ===
  "Search":             L(() => import('./pages/Search')),
  "ScholarSearch":      L(() => import('./pages/ScholarSearch')),

  // === Articles ===
  "ArticleDetail":      L(() => import('./pages/ArticleDetail')),
  "Articles":           L(() => import('./pages/Articles')),
  "ReviewQueue":        L(() => import('./pages/ReviewQueue')),

  // === Admin (heavy, rarely loaded) ===
  "Admin":              L(() => import('./pages/Admin')),
  "AdminAnalytics":     L(() => import('./pages/AdminAnalytics')),
  "AdminArticleEdit":   L(() => import('./pages/AdminArticleEdit')),
  "AdminArticles":      L(() => import('./pages/AdminArticles')),
  "AdminAudit":         L(() => import('./pages/AdminAudit')),
  "AdminConsole":       L(() => import('./pages/AdminConsole')),
  "AdminCostAnalytics": L(() => import('./pages/AdminCostAnalytics')),
  "AdminQuestionEdit":  L(() => import('./pages/AdminQuestionEdit')),
  "AdminQuestions":     L(() => import('./pages/AdminQuestions')),
  "AdminTaxonomy":      L(() => import('./pages/AdminTaxonomy')),
  "AdminToolEdit":      L(() => import('./pages/AdminToolEdit')),
  "AdminTools":         L(() => import('./pages/AdminTools')),
  "AdminUsers":         L(() => import('./pages/AdminUsers')),

  // === Org ===
  "OrganizationManagement": L(() => import('./pages/OrganizationManagement')),
  "TeamAnalytics":      L(() => import('./pages/TeamAnalytics')),
};

export const pagesConfig = {
  mainPage: "Landing",
  Pages: PAGES,
  Layout: __Layout,
};
