import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CaseManagement } from './CaseManagement';
import { CaseDetailView } from './CaseDetailView';
import { CaseRegistration } from './CaseRegistration';
import { SchedulingSystem } from './SchedulingSystem';
import { ReportsSystem } from './ReportsSystem';
import { UserManagement } from './UserManagement';

type ViewType = 
  | 'case-management' 
  | 'case-detail' 
  | 'case-registration' 
  | 'scheduling' 
  | 'reports' 
  | 'user-management'
  | null;

interface NavigationState {
  view: ViewType;
  data?: any;
}

export function NavigationManager({ initialView = null }: { initialView?: ViewType }) {
  const { user } = useAuth();
  const [navigation, setNavigation] = useState<NavigationState>({
    view: initialView,
    data: null
  });

  const navigateTo = (view: ViewType, data?: any) => {
    setNavigation({ view, data });
  };

  const goBack = () => {
    setNavigation({ view: null, data: null });
  };

  // If no specific view is selected, return null so dashboard shows
  if (!navigation.view) {
    return null;
  }

  switch (navigation.view) {
    case 'case-management':
      return (
        <CaseManagement 
          onViewCase={(caseId) => navigateTo('case-detail', { caseId })}
          onBack={goBack}
        />
      );

    case 'case-detail':
      return (
        <CaseDetailView 
          caseId={navigation.data?.caseId}
          onBack={goBack}
        />
      );

    case 'case-registration':
      return (
        <CaseRegistration 
          onBack={goBack}
          onSuccess={goBack}
        />
      );

    case 'scheduling':
      return (
        <SchedulingSystem 
          onBack={goBack}
        />
      );

    case 'reports':
      return (
        <ReportsSystem 
          onBack={goBack}
        />
      );

    case 'user-management':
      return (
        <UserManagement 
          onBack={goBack}
        />
      );

    default:
      return null;
  }
}

// Export navigation functions for use in dashboards
import { useNavigate } from 'react-router-dom';

export const useNavigation = () => {
  const navigate = useNavigate();

  return {
    navigateToCase: (caseId: string) => navigate(`/case/${caseId}`),
    navigateToCaseManagement: () => navigate('/cases'),
    navigateToRegistration: () => navigate('/register-case'),
    navigateToScheduling: () => navigate('/scheduling'),
    navigateToReports: () => navigate('/reports'),
    navigateToUserManagement: () => navigate('/users')
  };
};