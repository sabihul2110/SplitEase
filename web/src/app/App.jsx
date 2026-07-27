// web/src/app/App.jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";
import ErrorBoundary from "../components/ErrorBoundary";

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}