import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import AgentTest from "./pages/AgentTest";
import Landing from "./pages/Landing";
import PublicTest from "./pages/PublicTest";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VoiceClone from "./pages/VoiceClone";
import Settings from "./pages/Settings";
import { AuthProvider } from "./context/authContext";
import { FinanceProvider } from "@/context/financeContext";
import { VoiceProvider } from "@/contexts/VoiceContext";
import PlanSelection from "./pages/PlanSelection";
import PlanPurchase from "./pages/PlanPurchase";
import UsageDashboard from "./pages/UsageDashboard";
import AddOnPurchase from "./pages/AddOnPurchase";
import Inference from "./pages/Inference";
import PublicInference from "./pages/PublicInference";
import LiveKitTest from "./pages/LiveKitTest";
import Tools from "./pages/Tools";
import ApiKeys from "./pages/ApiKeys";

const queryClient = new QueryClient();

const App = () => {
  return (
    <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <FinanceProvider>
        <VoiceProvider>
          <TooltipProvider> 
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              {/* Landing and marketing pages */}
              <Route path="/" element={<Landing />} /> 
              <Route path="/landing" element={<Landing />} />
              {/* Public purchase flow */}
              <Route path="/plan-selection" element={<PlanSelection />} />
              <Route path="/plan-purchase" element={<PlanPurchase />} />
              {/* Public routes */}
              <Route path="/test" element={<PublicTest />} />
              {/* Public shared agent inference */}
              <Route path="/share/:agentId" element={<PublicInference />} />
              {/* Auth routes */}
              <Route path="/auth/signin" element={<SignIn />} />
              <Route path="/auth/signup" element={<SignUp />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              {/* App routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/agents" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Agents />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/agents/:id/test" element={
                <ProtectedRoute>
                  <AppLayout>
                    <AgentTest />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/voice-clone" element={
                <ProtectedRoute>
                  <AppLayout>
                    <VoiceClone />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/usage" element={
                <ProtectedRoute>
                  <AppLayout>
                    <UsageDashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/addons" element={
                <ProtectedRoute>
                  <AppLayout>
                    <AddOnPurchase />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/inference" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Inference />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/inference/:agentId" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Inference />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/livekit-test" element={<LiveKitTest />} />
              <Route path="/tools" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Tools />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/api" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ApiKeys />
                  </AppLayout>
                </ProtectedRoute>
              } />
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </VoiceProvider>
      </FinanceProvider>
    </QueryClientProvider>
    </AuthProvider>
  );
};

export default App;

