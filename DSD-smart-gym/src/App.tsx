import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import NonMemberLayout from "./layout/NonMemberLayout";
import MemberLayout from "./layout/memberLayout"; 
import Footer from "./layout/Footer";


// Pages
import Homepage from "./pages/Homepage";
import MemberPortal from "./pages/MemberPortal";
import Classes from "./pages/Classes";
import CafeOrdering from "./pages/CafeOrdering";
import AdminDashboard from "./pages/AdminDashboard";
import AdminClasses from "./pages/AdminClasses";
import Membership from "./pages/Membership";
import JoinToday from "./components/join/JoinToday";
import MemberProfile from "./pages/memberProfile";


import '../src/App.css';





// ------- Auth helpers -------
const isAuthed = () => !!localStorage.getItem("authToken");
const getRole = () => (localStorage.getItem("role") || "").toLowerCase();
const isAdminOrTrainer = () => {
  const role = getRole();
  return role === "admin" || role === "trainer";
};

// ------- Route Guards -------
function RequireAuth({ children }: { children: React.ReactNode }) {
  return isAuthed() ? <>{children}</> : <Navigate to="/" replace />;
}
function RequireAdminOrTrainer({ children }: { children: React.ReactNode }) {
  return isAdminOrTrainer() ? <>{children}</> : <Navigate to="/member" replace />;
}

// Public nav items
const nonMemberNav = [
  { label: "Home", to: "/" },
  { label: "Membership", to: "/nonmember/membership" },
  { label: "Classes", to: "/nonmember/classes" },
  { label: "Join Today", to: "/nonmember/join" },
];
const adminNav = [{ label: "Dashboard", to: "/admin/dashboard" }];

export default function App() {
  return (
    <>
      <Routes>
        {/* ---------- Public / Non-Member routes (with NonMember layout) ---------- */}
        <Route element={<NonMemberLayout navItems={nonMemberNav} />}>
          <Route index element={<Homepage />} />
          <Route path="nonmember/membership" element={<Membership />} />
          <Route path="nonmember/classes" element={<Classes />} />
          <Route path="nonmember/join" element={<JoinToday />} />
        </Route>

        {/* ---------- Members (with Member layout) ---------- */}
        <Route element={<RequireAuth><MemberLayout /></RequireAuth>}>
          <Route path="member" element={<MemberPortal />} />
          <Route path="member/classes" element={<Classes />} />
          <Route path="member/cafe-ordering" element={<CafeOrdering />} />
          <Route path="member/profile" element={<MemberProfile />} />
        </Route>

        {/* ---------- Admin / Trainer (reuse NonMember layout, different nav) ---------- */}
        <Route element={<RequireAdminOrTrainer><NonMemberLayout navItems={adminNav} /></RequireAdminOrTrainer>}>
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/classes" element={<AdminClasses />} />
        </Route>

        {/* Aliases / redirects */}
        <Route path="user" element={<Navigate to="/member" replace />} />
        <Route path="classes" element={<Navigate to="/member/classes" replace />} />
        <Route path="cafe" element={<Navigate to="/member/cafe-ordering" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer copyrightText={`Smart Gym ${new Date().getFullYear()}`} />
    </>
  );
}
