/**
 * pages.config.js - Page routing configuration
 * Uses React.lazy for route-level code splitting
 * 
 * DEDUP: Old routes are aliased to consolidated versions
 */
import { lazy } from 'react';

import __Layout from './Layout.jsx';

const L = (fn) => lazy(fn);

export const PAGES = {
  // === Core ===
  "Dashboard":          L(() => import('./pages/DashboardV2')),
  "DashboardV2":        L(() => import('./pages/DashboardV2')),
  "Studium":            L(() => import('./pages/StudiumV3')),       // alias → StudiumV3
  "StudiumV2":          L(() => import('./pages/StudiumV3')),       // alias → StudiumV3
  "StudiumV3":          L(() => import('./pages/StudiumV3')),
  "ReviewToday":        L(() => import('./pages/ReviewToday')),
  "TopicDetail":        L(() => import('./pages/TopicDetailV5')),
  "TopicDetailV2":      L(() => import('./pages/TopicDetailV5')),   // alias → V5
  "TopicDetailV4":      L(() => import('./pages/TopicDetailV5')),   // alias → V5
  "TopicDetailV5":      L(() => import('./pages/TopicDetailV5')),

  // === Public ===
  "Landing":            L(() => import('./pages/Landing')),
  "Demo":               L(() => import('./pages/Demo')),
  "Pricing":            L(() => import('./pages/Pricing')),

  // === Study ===
  "OkruhDetail":        L(() => import('./pages/OkruhDetail')),
  "QuestionDetail":     L(() => import('./pages/QuestionDetail')),
  "FlashcardReviewV2":  L(() => import('./pages/FlashcardReviewV2')),
  "StudyPackages":      L(() => import('./pages/StudyPackages')),
  "StudyPackageDetail": L(() => import('./pages/StudyPackageDetail')),
  "StudyPackageCreate": L(() => import('./pages/StudyPackageCreate')),

  // === Tests (consolidated) ===
  "TestGenerator":      L(() => import('./pages/TestGeneratorV2')), // alias → V2
  "TestGeneratorV2":    L(() => import('./pages/TestGeneratorV2')),
  "TestSession":        L(() => import('./pages/TestSession')),     // V1 (Supabase-migrated)
  "TestSessionV2":      L(() => import('./pages/TestSession')),     // alias → V1
  "TestResults":        L(() => import('./pages/TestResultsV2')),   // alias → V2
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

  // === User (consolidated) ===
  "Profile":            L(() => import('./pages/MyProfile')),       // alias → MyProfile
  "MyProfile":          L(() => import('./pages/MyProfile')),
  "AccountSettings":    L(() => import('./pages/AccountSettings')),
  "UserSettings":       L(() => import('./pages/AccountSettings')), // alias → AccountSettings
  "AICredits":          L(() => import('./pages/AICredits')),

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

  // === Admin ===
  "Admin":              L(() => import('./pages/Admin')),
  "AdminAnalytics":     L(() => import('./pages/AdminAnalytics')),
  "AdminArticleEdit":   L(() => import('./pages/AdminArticleEdit')),
  "AdminArticles":      L(() => import('./pages/AdminArticles')),
  "AdminAudit":         L(() => import('./pages/AdminAudit')),
  "AdminBatchMonitor":  L(() => import('./pages/AdminBatchMonitor')),
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
