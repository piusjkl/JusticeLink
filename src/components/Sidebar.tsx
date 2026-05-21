import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Calendar, 
  Upload, 
  Users, 
  FileText, 
  BarChart, 
  Settings, 
  Gavel,
  UserPlus,
  Shield,
  Activity,
  HeartHandshake
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['lawyer', 'judge', 'clerk', 'admin', 'prosecutor', 'paralegal', 'legal_aid_officer', 'partner_admin', 'data_analyst']
  },
  {
    title: 'Cases',
    href: '/cases',
    icon: FolderOpen,
    roles: ['lawyer', 'judge', 'clerk', 'prosecutor']
  },
  {
    title: 'Calendar',
    href: '/scheduling',
    icon: Calendar,
    roles: ['lawyer', 'judge', 'clerk', 'prosecutor']
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
    roles: ['lawyer', 'judge', 'clerk', 'prosecutor']
  },
  {
    title: 'Register Case',
    href: '/register-case',
    icon: UserPlus,
    roles: ['clerk']
  },
  {
    title: 'Assignments',
    href: '/cases',
    icon: Gavel,
    roles: ['clerk']
  },
  {
    title: 'Upload Files',
    href: '/upload',
    icon: Upload,
    roles: ['lawyer', 'prosecutor']
  },
  {
    title: 'User Management',
    href: '/users',
    icon: Users,
    roles: ['admin']
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart,
    roles: ['admin', 'clerk', 'prosecutor', 'data_analyst']
  },
  {
    title: 'Justice Link Referrals',
    href: '/referrals',
    icon: HeartHandshake,
    roles: ['admin', 'clerk', 'paralegal', 'legal_aid_officer', 'partner_admin', 'data_analyst']
  },
  {
    title: 'Partner Analytics',
    href: '/partner-analytics',
    icon: BarChart,
    roles: ['admin', 'clerk', 'legal_aid_officer', 'partner_admin', 'data_analyst']
  },
  // Prosecutor-specific
  {
    title: 'Prosecution Queue',
    href: '/prosecution-queue',
    icon: Gavel,
    roles: ['prosecutor']
  },
  {
    title: 'Evidence Center',
    href: '/evidence',
    icon: FileText,
    roles: ['prosecutor']
  },
  {
    title: 'Demo Reports',
    href: '/gov-reports',
    icon: BarChart,
    roles: ['prosecutor']
  },
  {
    title: 'Audit Logs',
    href: '/audit',
    icon: Activity,
    roles: ['admin']
  },
  {
    title: 'Security',
    href: '/security',
    icon: Shield,
    roles: ['admin']
  }
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-card border-r border-border shadow-card overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
                           (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.title}
              </NavLink>
            );
          })}
        </nav>

        {/* Role Badge */}
        <div className="mt-8 p-3 bg-gradient-subtle rounded-md">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gold rounded-full"></div>
            <span className="text-xs font-medium text-foreground">
              {user?.role?.toUpperCase()} ACCESS
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Authorized for {user?.role} operations
          </p>
        </div>
      </div>
    </aside>
  );
}
