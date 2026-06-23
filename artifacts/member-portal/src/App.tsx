import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider, useAuth } from "@/contexts/auth-context";
import Login from "@/pages/login";
import Layout from "./components/layout";
import Dashboard from "./pages/dashboard";
import Members from "./pages/members";
import MemberNew from "./pages/member-new";
import MemberDetail from "./pages/member-detail";
import Payments from "./pages/payments";
import Expenses from "./pages/expenses";
import Reports from "./pages/reports";
import Tax from "./pages/tax";
import MemberReport from "./pages/member-report";
import Contributions from "./pages/contributions";
import Users from "./pages/users";
import Backup from "./pages/backup";
import Settings from "./pages/settings";

const queryClient = new QueryClient();

function ProtectedRouter() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/members" component={Members} />
        <Route path="/members/new" component={MemberNew} />
        <Route path="/members/:id" component={MemberDetail} />
        <Route path="/payments" component={Payments} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/reports" component={Reports} />
        <Route path="/tax" component={Tax} />
        <Route path="/member-report" component={MemberReport} />
        <Route path="/contributions" component={Contributions} />
        <Route path="/users" component={Users} />
        <Route path="/backup" component={Backup} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <ProtectedRouter />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
