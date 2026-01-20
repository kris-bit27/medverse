import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Demo from './pages/Demo';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Landing": Landing,
    "Pricing": Pricing,
    "Demo": Demo,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};