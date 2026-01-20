import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Demo from './pages/Demo';
import Dashboard from './pages/Dashboard';
import Atestace from './pages/Atestace';
import OkruhDetail from './pages/OkruhDetail';
import QuestionDetail from './pages/QuestionDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Landing": Landing,
    "Pricing": Pricing,
    "Demo": Demo,
    "Dashboard": Dashboard,
    "Atestace": Atestace,
    "OkruhDetail": OkruhDetail,
    "QuestionDetail": QuestionDetail,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};