import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout.js";
import { ProtectedRoute } from "./ProtectedRoute.js";
import { LandingPage } from "../pages/LandingPage.js";
import { SignInPage } from "../pages/SignInPage.js";
import { SignUpPage } from "../pages/SignUpPage.js";
import { ScenarioLibraryPage } from "../pages/ScenarioLibraryPage.js";
import { ReviewHistoryPage } from "../pages/ReviewHistoryPage.js";
import { ArchitectureReviewLayout } from "../pages/ArchitectureReviewLayout.js";
import { ArchitectureReviewPage } from "../pages/ArchitectureReviewPage.js";
import { ReviewSummaryPage } from "../pages/ReviewSummaryPage.js";
import { SubmittedReviewPage } from "../pages/SubmittedReviewPage.js";
import { StressTestSimulatorPage } from "../pages/StressTestSimulatorPage.js";
import { NotFoundPage } from "../pages/NotFoundPage.js";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/sign-in/*", element: <SignInPage /> },
  { path: "/sign-up/*", element: <SignUpPage /> },
  {
    path: "/app",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <ScenarioLibraryPage /> },
          { path: "history", element: <ReviewHistoryPage /> },
          {
            path: "review/:scenarioSlug",
            element: <ArchitectureReviewLayout />,
            children: [
              { index: true, element: <ArchitectureReviewPage /> },
              { path: "submit", element: <ReviewSummaryPage /> },
              { path: "submitted", element: <SubmittedReviewPage /> },
              { path: "stress-tests", element: <StressTestSimulatorPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
