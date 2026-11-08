import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import Index from "./pages/Index";
import Generate from "./pages/Generate";
import TimetableView from "./pages/TimetableView";
import Dashboard from "./pages/Dashboard";
import Today from "./pages/Today";
import SharedPlan from "./pages/SharedPlan";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/today" element={<Today />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/timetable/:id" element={<TimetableView />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/plans" element={<Navigate to="/dashboard" replace />} />
            <Route path="/shared" element={<SharedPlan />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
