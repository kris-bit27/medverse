/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AICopilot from './pages/AICopilot';
import Admin from './pages/Admin';
import AdminArticleEdit from './pages/AdminArticleEdit';
import AdminArticles from './pages/AdminArticles';
import AdminAudit from './pages/AdminAudit';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminQuestionEdit from './pages/AdminQuestionEdit';
import AdminQuestions from './pages/AdminQuestions';
import AdminTaxonomy from './pages/AdminTaxonomy';
import AdminToolEdit from './pages/AdminToolEdit';
import AdminTools from './pages/AdminTools';
import AdminUsers from './pages/AdminUsers';
import ArticleDetail from './pages/ArticleDetail';
import Articles from './pages/Articles';
import Atestace from './pages/Atestace';
import Dashboard from './pages/Dashboard';
import Demo from './pages/Demo';
import Forum from './pages/Forum';
import ForumThread from './pages/ForumThread';
import Landing from './pages/Landing';
import Logbook from './pages/Logbook';
import OkruhDetail from './pages/OkruhDetail';
import Pricing from './pages/Pricing';
import Profile from './pages/Profile';
import QuestionDetail from './pages/QuestionDetail';
import ReviewQueue from './pages/ReviewQueue';
import ReviewToday from './pages/ReviewToday';
import ScholarSearch from './pages/ScholarSearch';
import Search from './pages/Search';
import StudyPackageCreate from './pages/StudyPackageCreate';
import StudyPackageDetail from './pages/StudyPackageDetail';
import StudyPackages from './pages/StudyPackages';
import StudyPlanAI from './pages/StudyPlanAI';
import StudyPlanCreate from './pages/StudyPlanCreate';
import StudyPlanDetail from './pages/StudyPlanDetail';
import StudyPlanner from './pages/StudyPlanner';
import TestGenerator from './pages/TestGenerator';
import TestSession from './pages/TestSession';
import ToolDetail from './pages/ToolDetail';
import Tools from './pages/Tools';
import TopicDetail from './pages/TopicDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AICopilot": AICopilot,
    "Admin": Admin,
    "AdminArticleEdit": AdminArticleEdit,
    "AdminArticles": AdminArticles,
    "AdminAudit": AdminAudit,
    "AdminAnalytics": AdminAnalytics,
    "AdminQuestionEdit": AdminQuestionEdit,
    "AdminQuestions": AdminQuestions,
    "AdminTaxonomy": AdminTaxonomy,
    "AdminToolEdit": AdminToolEdit,
    "AdminTools": AdminTools,
    "AdminUsers": AdminUsers,
    "ArticleDetail": ArticleDetail,
    "Articles": Articles,
    "Atestace": Atestace,
    "Dashboard": Dashboard,
    "Demo": Demo,
    "Forum": Forum,
    "ForumThread": ForumThread,
    "Landing": Landing,
    "Logbook": Logbook,
    "OkruhDetail": OkruhDetail,
    "Pricing": Pricing,
    "Profile": Profile,
    "QuestionDetail": QuestionDetail,
    "ReviewQueue": ReviewQueue,
    "ReviewToday": ReviewToday,
    "ScholarSearch": ScholarSearch,
    "Search": Search,
    "StudyPackageCreate": StudyPackageCreate,
    "StudyPackageDetail": StudyPackageDetail,
    "StudyPackages": StudyPackages,
    "StudyPlanAI": StudyPlanAI,
    "StudyPlanCreate": StudyPlanCreate,
    "StudyPlanDetail": StudyPlanDetail,
    "StudyPlanner": StudyPlanner,
    "TestGenerator": TestGenerator,
    "TestSession": TestSession,
    "ToolDetail": ToolDetail,
    "Tools": Tools,
    "TopicDetail": TopicDetail,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};
