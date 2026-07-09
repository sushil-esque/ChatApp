import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import Chat from "@/pages/Chat";
import Home from "./pages/Home";
import { useInitAuth } from "./hooks/useInitAuth";
import { useAuthStore } from "./store/authStore";
import { PublicRoute } from "./components/PublicRoute";
import { useSocket } from "./hooks/useSocket";
import { SocketContext } from "@/context/SocketContext";

const queryClient = new QueryClient();

function AppInner() {
  useInitAuth();
  const socket = useSocket();
  console.log(socket, "socket ");

  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <SocketContext.Provider value={socket}>
      <BrowserRouter>
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
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketContext.Provider>
  );
}

function App() {
  return (
    <>
      <Toaster theme="dark" />
      <QueryClientProvider client={queryClient}>
        <AppInner />
      </QueryClientProvider>
    </>
  );
}

export default App;
