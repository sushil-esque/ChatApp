import { AppLayout } from "@/components/layout/AppLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Chat from "@/pages/Chat";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { PublicRoute } from "./components/PublicRoute";
import { SocketProvider } from "./context/socketProvider";
import { useInitAuth } from "./hooks/useInitAuth";
import { useSocketNotifications } from "./hooks/useSocketNotifications";
import Home from "./pages/Home";
import { useAuthStore } from "./store/authStore";

const queryClient = new QueryClient();

function AppInner() {
  useInitAuth();

  useSocketNotifications();

  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:conversationId" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <>
      <Toaster theme="dark" />
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <BrowserRouter>
            <AppInner />
          </BrowserRouter>
        </SocketProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
