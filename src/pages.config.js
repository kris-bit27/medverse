import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Demo from './pages/Demo';
import Dashboard from './pages/Dashboard';
import Atestace from './pages/Atestace';
import OkruhDetail from './pages/OkruhDetail';
import QuestionDetail from './pages/QuestionDetail';
import ReviewToday from './pages/ReviewToday';
import ReviewQueue from './pages/ReviewQueue';
import TestGenerator from './pages/TestGenerator';
import TestSession from './pages/TestSession';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';
import Tools from './pages/Tools';
import ToolDetail from './pages/ToolDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Landing": Landing,
    "Pricing": Pricing,
    "Demo": Demo,
    "Dashboard": Dashboard,
    "Atestace": Atestace,
    "OkruhDetail": OkruhDetail,
    "QuestionDetail": QuestionDetail,
    "ReviewToday": ReviewToday,
    "ReviewQueue": ReviewQueue,
    "TestGenerator": TestGenerator,
    "TestSession": TestSession,
    "Articles": Articles,
    "ArticleDetail": ArticleDetail,
    "Tools": Tools,
    "ToolDetail": ToolDetail,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};