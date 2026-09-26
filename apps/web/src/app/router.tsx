import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout.js";
import { HomePage } from "../pages/HomePage.js";
import { NotFoundPage } from "../pages/NotFoundPage.js";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
