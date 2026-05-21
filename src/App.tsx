import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Login } from "@/components/Login";
import { Layout } from "@/components/Layout";
import { LawyerDashboard } from "@/components/dashboards/LawyerDashboard";
import { JudgeDashboard } from "@/components/dashboards/JudgeDashboard";
import { ClerkDashboard } from "@/components/dashboards/ClerkDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { ProsecutorDashboard } from "@/components/dashboards/ProsecutorDashboard";
import { UserManagement } from "@/components/UserManagement";
import { CaseManagement } from "@/components/CaseManagement";
import { CaseRegistration } from "@/components/CaseRegistration";
import { SchedulingSystem } from "@/components/SchedulingSystem";
import { ReportsSystem } from "@/components/ReportsSystem";
import { CaseDetailView } from "@/components/CaseDetailView";
import { DocumentViewer } from "@/components/DocumentViewer";
import SettingsPage from '@/components/SettingsPage';
import BackupPage from '@/components/BackupPage';
import AlertsPage from '@/components/AlertsPage';
import SearchResults from '@/components/SearchResults';
import UploadPage from '@/components/UploadPage';
import AuditLogs from '@/components/AuditLogs';
import SecuritySettings from '@/components/SecuritySettings';
import ProsecutionQueue from '@/components/ProsecutionQueue';
import EvidenceCenter from '@/components/EvidenceCenter';
import GovReports from '@/components/GovReports';
import PublicHearing from '@/pages/PublicHearing';
import PrisonJoin from '@/pages/PrisonJoin';
import CitizenPortal from '@/pages/CitizenPortal';
import PartnerAnalytics from '@/pages/PartnerAnalytics';
import ReferralWorkbench from '@/pages/ReferralWorkbench';

const queryClient = new QueryClient();

function RoleBasedDashboard() {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'lawyer':
      return <LawyerDashboard />;
    case 'judge':
      return <JudgeDashboard />;
    case 'prosecutor':
      return <ProsecutorDashboard />;
    case 'paralegal':
    case 'legal_aid_officer':
      return <ReferralWorkbench />;
    case 'partner_admin':
    case 'data_analyst':
      return <PartnerAnalytics />;
    case 'citizen':
      return <Navigate to="/citizen" replace />;
    case 'clerk':
      return <ClerkDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function RoleProtected({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect unauthorized users back to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Public links (no auth) */}
            <Route path="/citizen" element={<CitizenPortal />} />
            <Route path="/public/hearing/:token" element={<PublicHearing />} />
            <Route path="/prison/join/:token" element={<PrisonJoin />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleBasedDashboard />
              </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <RoleProtected allowedRoles={["admin"]}>
                  <UserManagement />
                </RoleProtected>
              }
            />
            <Route
              path="/cases"
              element={
                <ProtectedRoute>
                  <CaseManagementWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/case/:id"
              element={
                <ProtectedRoute>
                  <CaseDetailWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register-case"
              element={
                <RoleProtected allowedRoles={["clerk", "admin"]}>
                  <RegisterCaseWrapper />
                </RoleProtected>
              }
            />
            <Route
              path="/scheduling"
              element={
                <ProtectedRoute>
                  <SchedulingWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleProtected allowedRoles={["admin", "clerk", "prosecutor", "data_analyst", "partner_admin", "legal_aid_officer"]}>
                  <ReportsWrapper />
                </RoleProtected>
              }
            />
            <Route
              path="/referrals"
              element={
                <RoleProtected allowedRoles={["admin", "clerk", "paralegal", "legal_aid_officer", "partner_admin", "data_analyst"]}>
                  <ReferralWorkbench />
                </RoleProtected>
              }
            />
            <Route
              path="/partner-analytics"
              element={
                <RoleProtected allowedRoles={["admin", "clerk", "partner_admin", "data_analyst", "legal_aid_officer"]}>
                  <PartnerAnalytics />
                </RoleProtected>
              }
            />
            <Route
              path="/prosecution-queue"
              element={
                <RoleProtected allowedRoles={["prosecutor"]}>
                  <ProsecutionQueue />
                </RoleProtected>
              }
            />
            <Route
              path="/evidence"
              element={
                <RoleProtected allowedRoles={["prosecutor"]}>
                  <EvidenceCenter />
                </RoleProtected>
              }
            />
            <Route
              path="/gov-reports"
              element={
                <RoleProtected allowedRoles={["prosecutor"]}>
                  <GovReports />
                </RoleProtected>
              }
            />
            <Route
              path="/audit"
              element={
                <RoleProtected allowedRoles={["admin"]}>
                  <AuditWrapper />
                </RoleProtected>
              }
            />
            <Route
              path="/security"
              element={
                <RoleProtected allowedRoles={["admin"]}>
                  <SecurityWrapper />
                </RoleProtected>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <DocumentViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <SearchResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backup"
              element={
                <ProtectedRoute>
                  <BackupWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <AlertsWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/dashboard" replace />}
            />
          </Routes>
        </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

export default App;

// Wrapper components to bridge react-router hooks into existing component props
function CaseDetailWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) return <Navigate to="/cases" replace />;

  return <CaseDetailView caseId={id} onBack={() => navigate(-1)} />;
}

function RegisterCaseWrapper() {
  const navigate = useNavigate();

  return <CaseRegistration onBack={() => navigate(-1)} onSuccess={() => navigate('/cases')} />;
}

function SchedulingWrapper() {
  const navigate = useNavigate();
  return <SchedulingSystem onBack={() => navigate(-1)} />;
}

function ReportsWrapper() {
  const navigate = useNavigate();
  return <ReportsSystem onBack={() => navigate(-1)} />;
}

function CaseManagementWrapper() {
  const navigate = useNavigate();
  return <CaseManagement onViewCase={(id: string) => navigate(`/case/${id}`)} onBack={() => navigate(-1)} />;
}

function SettingsWrapper() {
  const navigate = useNavigate();
  return <SettingsPage onBack={() => navigate(-1)} />;
}

function BackupWrapper() {
  const navigate = useNavigate();
  return <BackupPage onBack={() => navigate(-1)} />;
}

function AlertsWrapper() {
  const navigate = useNavigate();
  return <AlertsPage onBack={() => navigate(-1)} />;
}

function AuditWrapper() {
  const navigate = useNavigate();
  return <AuditLogs onBack={() => navigate(-1)} />;
}

function SecurityWrapper() {
  const navigate = useNavigate();
  return <SecuritySettings onBack={() => navigate(-1)} />;
}
