// web/src/app/App.jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";

const router = createBrowserRouter(routes);

export default function App() {
  return <RouterProvider router={router} />;
}