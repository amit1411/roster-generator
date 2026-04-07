import ProfilePage from "../components/ProfilePage";

export default function ProfileRoute({ auth }) {
  return (
    <ProfilePage
      currentUser={auth.currentUser}
      activeWorkspace={auth.activeWorkspace}
      workspaces={auth.workspaces}
      authLoading={auth.authLoading}
      onSelectWorkspace={auth.handleSelectWorkspace}
      onLogout={auth.handleLogout}
    />
  );
}
