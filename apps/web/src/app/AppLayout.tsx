import { Outlet } from "react-router-dom";
import { Header } from "../components/layout/Header.js";

export function AppLayout() {
  return (
    <div className="min-h-svh bg-slate-950 text-slate-100">
      <Header />
      <Outlet />
    </div>
  );
}
