import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout.js";
import { ScenarioLibraryPage } from "../pages/ScenarioLibraryPage.js";
import { ReviewScenarioLayout } from "../pages/ReviewScenarioLayout.js";
import { ReviewSessionPage } from "../pages/ReviewSessionPage.js";
import { SubmitReviewPage } from "../pages/SubmitReviewPage.js";
import { SubmittedReviewPage } from "../pages/SubmittedReviewPage.js";
import { NotFoundPage } from "../pages/NotFoundPage.js";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <ScenarioLibraryPage /> },
      {
        path: "/review/:scenarioSlug",
        element: <ReviewScenarioLayout />,
        children: [
          { index: true, element: <ReviewSessionPage /> },
          { path: "submit", element: <SubmitReviewPage /> },
          { path: "submitted", element: <SubmittedReviewPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
