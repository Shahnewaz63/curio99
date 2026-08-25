import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import TrackOrder from "./pages/TrackOrder";
const Home = lazy(() => import("./pages/Home"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));

function RouteLoadingFallback() {
  return <main className="flex min-h-screen items-center justify-center bg-[#07111F] px-6 text-[#F4F0E8]" aria-live="polite"><div className="flex flex-col items-center gap-4 text-center"><span className="h-9 w-9 animate-spin rounded-full border-2 border-[#55E6E0]/25 border-t-[#55E6E0]" /><p className="font-display text-sm font-extrabold uppercase tracking-[.16em] text-[#B8FFFA]">Loading Curio…</p></div></main>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/order-success" component={OrderSuccess} />
      <Route path="/track-order" component={TrackOrder} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
