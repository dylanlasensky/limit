import BrandLoading from "@/components/limit/BrandLoading";
import { Toaster } from "@/components/ui/toaster";
import { lazy, Suspense } from "react";
import { MotionConfig } from "framer-motion";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import AppTheme from "@/components/limit/AppTheme";
import ScreenState from "@/components/limit/ScreenState";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ScrollToTop from "./components/ScrollToTop";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Entry from "@/pages/Entry";
const PublicInfo = lazy(() => import("@/pages/PublicInfo"));
const PublicExercises = lazy(() => import("@/pages/PublicExercises"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Home = lazy(() => import("@/pages/Home"));
const Workout = lazy(() => import("@/pages/Workout"));
const LiveWorkout = lazy(() => import("@/pages/LiveWorkout"));
const WorkoutDetail = lazy(() => import("@/pages/WorkoutDetail"));
const ImportWorkout = lazy(() => import("@/pages/ImportWorkout"));
const Nutrition = lazy(() => import("@/pages/Nutrition"));
const Progress = lazy(() => import("@/pages/Progress"));
const Profile = lazy(() => import("@/pages/Profile"));
const OAuthConsent = lazy(() => import("@/pages/OAuthConsent"));
import LimitShell from "@/components/limit/LimitShell";
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, checkAppState } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <BrandLoading />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type !== "auth_required") {
      return (
        <div className="mx-auto max-w-md px-4 py-12">
          <ScreenState
            title="Couldn’t connect to LIMIT"
            description="Check your connection and try again. Your saved data hasn’t been changed."
            onAction={() => void checkAppState()}
          />
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth-consent" element={<OAuthConsent />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<Entry />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/live-workout/:workoutDayId" element={<LiveWorkout />} />
        <Route path="/live-workout" element={<Navigate to="/workout" replace />} />
        <Route element={<LimitShell />}>
          <Route path="/home" element={<Home />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/workout/import" element={<ImportWorkout />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/workout/history/:id" element={<WorkoutDetail />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AppErrorBoundary>
      <AppTheme />
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <ScrollToTop />
              <Suspense fallback={<BrandLoading />}>
                <Routes>
                  <Route path="/privacy" element={<PublicInfo kind="privacy" />} />
                  <Route path="/terms" element={<PublicInfo kind="terms" />} />
                  <Route path="/support" element={<PublicInfo kind="support" />} />
                  <Route path="/exercises" element={<PublicExercises />} />
                  <Route path="*" element={<AuthenticatedApp />} />
                </Routes>
              </Suspense>
            </Router>
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </MotionConfig>
    </AppErrorBoundary>
  );
}

export default App;
