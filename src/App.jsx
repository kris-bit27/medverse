import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { user, isAuthenticated, isLoadingAuth, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  const publicPaths = new Set([
    '/',
    '/login',
    '/auth/callback',
    '/Landing',
    '/Pricing',
    '/Demo'
  ]);

  const isPublicRoute = publicPaths.has(location.pathname);

  // Show loading spinner while checking auth on private routes
  if (isLoadingAuth && !isPublicRoute) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[hsl(var(--mn-border))] border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated on private route
  if (!isAuthenticated && !isPublicRoute && !isLoadingAuth) {
    navigateToLogin();
    return null;
  }

  // Handle specific authentication errors
  if (authError && !isPublicRoute) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  const PageFallback = () => (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[hsl(var(--mn-border))] border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );

  // Render the main app
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <Suspense fallback={<PageFallback />}>
              <MainPage />
            </Suspense>
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Suspense fallback={<PageFallback />}>
                  <Page />
                </Suspense>
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
