export interface User {
  id: string;
  email: string;
  name: string;
  role: 'lawyer' | 'judge' | 'clerk' | 'admin' | 'prosecutor' | 'citizen' | 'paralegal' | 'legal_aid_officer' | 'partner_admin' | 'data_analyst';
  avatar?: string;
  lastLogin?: string;
  status?: 'active' | 'inactive';
  department?: string;
  // PII
  dateOfBirth?: string | null;
  address?: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}
