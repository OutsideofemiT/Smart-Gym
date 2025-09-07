import React from "react";
import { Outlet } from "react-router-dom";
import MemberNavbar from "./memberNavbar";
import type { MemberNavItem } from "./memberNavbar";
import Footer from "../layout/footer";


const navItems: MemberNavItem[] = [
  { label: "Home", to: "/member" },
  { label: "Classes", to: "/member/classes" },
  { label: "Cafe", to: "/member/cafe-ordering" },
  { label: "Profile", to: "/member/profile"},
   { label: "Log Out", action: "logout" },
];

const MemberLayout: React.FC = () => {
  return (
    <div className="app-shell">
      <MemberNavbar navItems={navItems} />
      <main className="app-main">
        <Outlet />
      </main>
       <Footer />
    </div>
  );
};

export default MemberLayout;
