import { Outlet, useLocation } from "react-router-dom";

export function AuthLayout() {
  const location = useLocation();
  const showBranding =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="dark min-h-screen w-full bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {showBranding && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">GuffVerse</h1>
            <p className="text-sm text-muted-foreground">
              Chat with your friends
            </p>
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}
