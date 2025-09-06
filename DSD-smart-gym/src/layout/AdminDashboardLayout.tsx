interface AdminDashboardProps {
  main: React.ReactElement;
  sideBar: React.ReactElement;
}

const AdminDashboardLayout: React.FC<AdminDashboardProps> = ({
  main,
  sideBar,
}) => {
  return (
    <>
      <div className="admin-dashboard-body">
        <div className="admin-dashboard-main">{main}</div>
      </div>
      {sideBar}
    </>
  );
};

export default AdminDashboardLayout;
