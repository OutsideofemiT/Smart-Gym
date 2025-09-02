import * as React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./navbar";   

interface NavItem { label: string; to: string; }
type Props = { navItems?: NavItem[] };

const NonMemberLayout: React.FC<Props> = ({ navItems }) => {
  return (
    <div className="app-shell">
      <Navbar navItem={navItems ?? []} />
      <main className="page-main">
        <Outlet />
      </main>
    </div>
  );
};

export default NonMemberLayout;
