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
  "FlashcardReviewV2":  L(() => import('./pages/ReviewToday')),
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
  "ToolsHub":           L(() => import('./pages/ToolsHub')),
  "Tools":              L(() => import('./pages/ToolsHub')),          // alias → ToolsHub
  "AIConsultant":       L(() => import('./pages/AIConsultant')),
  "ClinicalCalculators": L(() => import('./pages/ClinicalCalculatorsV2')),
  "DrugDatabase":       L(() => import('./pages/DrugDatabaseV2')),
  "ClinicalGuidelines": L(() => import('./pages/ClinicalAlgorithmsV2')),
  "ClinicalAlgorithms": L(() => import('./pages/ClinicalAlgorithmsV2')),
  "ToolDetail":         L(() => import('./pages/ToolsHub')),          // alias → ToolsHub

  // === Social ===
  "Community":          L(() => import('./pages/Community')),
  "Forum":              L(() => import('./pages/Community')),          // alias → Community
  "ForumThread":        L(() => import('./pages/ForumThread')),
  "StudyGroup":         L(() => import('./pages/StudyGroup')),
  "StudyGroups":        L(() => import('./pages/Community')),          // alias → Community
  "Leaderboards":       L(() => import('./pages/Leaderboards')),

  // === User (consolidated) ===
  "Profile":            L(() => import('./pages/MyProfile')),       // alias → MyProfile
  "MyProfile":          L(() => import('./pages/MyProfile')),
  "AccountSettings":    L(() => import('./pages/AccountSettings')),
  "UserSettings":       L(() => import('./pages/AccountSettings')), // alias → AccountSettings
  "AICredits":          L(() => import('./pages/AICredits')),

  // === AI Academy ===
  "AcademyDashboard":   L(() => import('./pages/AcademyDashboard')),
  "AcademyLevel":       L(() => import('./pages/AcademyLevel')),
  "AcademyCourse":      L(() => import('./pages/AcademyCourse')),
  "AcademyLesson":      L(() => import('./pages/AcademyLesson')),
  "AcademySandbox":     L(() => import('./pages/AcademySandbox')),
  "AcademyCertificates": L(() => import('./pages/AcademyCertificates')),
  "AcademyBuilder":     L(() => import('./pages/AcademyBuilder')),
  "BuilderDashboard":   L(() => import('./pages/BuilderDashboard')),
  "AcademyPromptLibrary": L(() => import('./pages/AcademyPromptLibrary')),

  // === Logbook ===
  "Logbook":            L(() => import('./pages/LogbookV2')),

  // === Search ===
  "Search":             L(() => import('./pages/Search')),
  "ScholarSearch":      L(() => import('./pages/MedSearch')),       // consolidated → MedSearch
  "MedSearch":          L(() => import('./pages/MedSearch')),

  // === Articles (redirected to MedSearch) ===
  "ArticleDetail":      L(() => import('./pages/MedSearch')),
  "Articles":           L(() => import('./pages/MedSearch')),
  "ReviewQueue":        L(() => import('./pages/ReviewQueue')),

  // === Admin ===
  "AdminPanel":         L(() => import('./pages/AdminPanel')),
  "Admin":              L(() => import('./pages/AdminPanel')),       // alias → AdminPanel
  "AdminAnalytics":     L(() => import('./pages/AdminAnalytics')),
  "AdminArticleEdit":   L(() => import('./pages/AdminArticleEdit')),
  "AdminArticles":      L(() => import('./pages/AdminArticles')),
  "AdminAudit":         L(() => import('./pages/AdminAudit')),
  "AdminBatchMonitor":  L(() => import('./pages/AdminBatchMonitor')),
  "AdminConsole":       L(() => import('./pages/AdminConsole')),
  "AdminContentReview": L(() => import('./pages/AdminContentReview')),
  "AdminCostAnalytics": L(() => import('./pages/AdminCostAnalytics')),
  "AdminFeedback":      L(() => import('./pages/AdminFeedback')),
  "AdminPortalFeedback": L(() => import('./pages/AdminPortalFeedback')),
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
