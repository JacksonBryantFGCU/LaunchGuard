import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout.js";
import { ProtectedRoute } from "./ProtectedRoute.js";
import { LandingPage } from "../pages/LandingPage.js";
import { SignInPage } from "../pages/SignInPage.js";
import { SignUpPage } from "../pages/SignUpPage.js";
import { ScenarioLibraryPage } from "../pages/ScenarioLibraryPage.js";
import { ReviewHistoryPage } from "../pages/ReviewHistoryPage.js";
import { LeaderboardPage } from "../pages/LeaderboardPage.js";
import { ArchitectureReviewLayout } from "../pages/ArchitectureReviewLayout.js";
import { ArchitectureReviewPage } from "../pages/ArchitectureReviewPage.js";
import { ReviewSummaryPage } from "../pages/ReviewSummaryPage.js";
import { SubmittedReviewPage } from "../pages/SubmittedReviewPage.js";
import { StressTestSimulatorPage } from "../pages/StressTestSimulatorPage.js";
import { PracticeSystemLayout } from "../pages/PracticeSystemLayout.js";
import { PracticeOverviewPage } from "../pages/PracticeOverviewPage.js";
import { PracticeScenarioLayout } from "../pages/PracticeScenarioLayout.js";
import { PracticeScenarioBriefPage } from "../pages/PracticeScenarioBriefPage.js";
import { PracticeInvestigationPage } from "../pages/PracticeInvestigationPage.js";
import { StressLabPage } from "../pages/StressLabPage.js";
import { PracticeResultPage } from "../pages/PracticeResultPage.js";
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
          { path: "leaderboard", element: <LeaderboardPage /> },
          {
            path: "practice/:systemSlug",
            element: <PracticeSystemLayout />,
            children: [
              { index: true, element: <PracticeOverviewPage /> },
              {
                path: ":practiceScenarioId",
                element: <PracticeScenarioLayout />,
                children: [
                  { index: true, element: <PracticeScenarioBriefPage /> },
                  { path: "investigate", element: <PracticeInvestigationPage /> },
                  { path: "stress-lab", element: <StressLabPage /> },
                  { path: "result", element: <PracticeResultPage /> },
                ],
              },
            ],
          },
          {
            // Legacy full-architecture-review flow, retained for backward
            // compatibility (old history links, direct URLs) but no longer
            // linked from primary navigation - see Phase 3 report.
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
