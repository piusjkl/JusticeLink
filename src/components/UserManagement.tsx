import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createUser as apiCreateUser, getUsers, updateUser as apiUpdateUser, deleteUser as apiDeleteUser } from '@/lib/api';
import { User } from '@/types/auth';
import { UserPlus, Edit, Trash2, Shield, Users, Key, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RotateCw } from 'lucide-react';

interface NewUser {
  name: string;
  email: string;
  role: string;
  department: string;
  password: string;
  dateOfBirth: string;
  address: string;
}

interface UserPermissions {
  canCreateCases: boolean;
  canEditCases: boolean;
  canDeleteCases: boolean;
  canViewAllCases: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canManageSystem: boolean;
  canAccessAuditLogs: boolean;
}

const defaultPermissions: Record<string, UserPermissions> = {
  lawyer: {
    canCreateCases: true,
    canEditCases: true,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: false,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  judge: {
    canCreateCases: false,
    canEditCases: true,
    canDeleteCases: false,
    canViewAllCases: true,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  clerk: {
    canCreateCases: true,
    canEditCases: true,
    canDeleteCases: false,
    canViewAllCases: true,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  admin: {
    canCreateCases: true,
    canEditCases: true,
    canDeleteCases: true,
    canViewAllCases: true,
    canManageUsers: true,
    canViewReports: true,
    canManageSystem: true,
    canAccessAuditLogs: true,
  },
  prosecutor: {
    canCreateCases: false,
    canEditCases: true,
    canDeleteCases: false,
    canViewAllCases: true,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  paralegal: {
    canCreateCases: false,
    canEditCases: false,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  legal_aid_officer: {
    canCreateCases: false,
    canEditCases: false,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  partner_admin: {
    canCreateCases: false,
    canEditCases: false,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  data_analyst: {
    canCreateCases: false,
    canEditCases: false,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: true,
  },
};

interface UserManagementProps {
  onBack?: () => void;
}

export function UserManagement({ onBack }: UserManagementProps = {}) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    getUsers()
      .then((data) => { setUsers(data); setError(null); })
      .catch((e) => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<{ name: string; role: User['role']; department?: string } | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, UserPermissions>>({});
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    email: '',
    role: '',
    department: '',
    password: '',
    dateOfBirth: '',
    address: '',
  });

  const allowedRoles = ['lawyer', 'judge', 'clerk', 'admin', 'prosecutor', 'paralegal', 'legal_aid_officer', 'partner_admin', 'data_analyst'] as const;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'judge': return 'bg-primary text-primary-foreground';
      case 'lawyer': return 'bg-success text-success-foreground';
      case 'clerk': return 'bg-gold text-gold-foreground';
      case 'admin': return 'bg-destructive text-destructive-foreground';
      case 'prosecutor': return 'bg-primary/80 text-primary-foreground';
      case 'paralegal': return 'bg-secondary text-secondary-foreground';
      case 'legal_aid_officer': return 'bg-success text-success-foreground';
      case 'partner_admin': return 'bg-primary text-primary-foreground';
      case 'data_analyst': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-success text-success-foreground' 
      : 'bg-warning text-warning-foreground';
  };

  const handleRegisterUser = async () => {
    if (isRegistering) return;
    const name = newUser.name.trim();
    const email = newUser.email.trim();
    const role = newUser.role.trim();
    const department = newUser.department.trim();
    const password = newUser.password;

    if (!name || !email || !role || !password || !newUser.dateOfBirth || !newUser.address) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (including DOB and Address)",
        variant: "destructive",
      });
      return;
    }

    const emailOk = /.+@.+\..+/.test(email);
    if (!emailOk) {
      toast({ title: 'Invalid email', description: 'Please provide a valid email address.', variant: 'destructive' });
      return;
    }
    if (!allowedRoles.includes(role as any)) {
      toast({ title: 'Invalid role', description: 'Please choose a valid role.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Weak password', description: 'Password should be at least 6 characters.', variant: 'destructive' });
      return;
    }

    try {
      setIsRegistering(true);
      const created = await apiCreateUser({
        email,
        name,
        role,
        department: department || undefined,
        password,
        dateOfBirth: new Date(newUser.dateOfBirth).toISOString(),
        address: newUser.address,
      });
      setUsers([...users, created]);
      setUserPermissions(prev => ({
        ...prev,
        [created.id]: defaultPermissions[role] || defaultPermissions.lawyer
      }));

  setNewUser({ name: '', email: '', role: '', department: '', password: '', dateOfBirth: '', address: '' });
      setIsRegisterDialogOpen(false);

      toast({
        title: "Success",
        description: `User ${name} has been registered successfully`,
      });
    } catch (e: any) {
      toast({
        title: 'Registration failed',
        description: e?.response?.data?.error || e.message,
        variant: 'destructive',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePermissionChange = (userId: string, permission: keyof UserPermissions, value: boolean) => {
    setUserPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [permission]: value
      }
    }));

    toast({
      title: "Permission Updated",
      description: "User permissions have been saved",
    });
  };

  const handleToggleUserStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await apiUpdateUser(userId, { status: newStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, status: updated.status } : u));
      toast({
        title: "Status Updated",
        description: `${user.name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      });
    } catch (e: any) {
      toast({
        title: 'Update failed',
        description: e?.response?.data?.error || e.message,
        variant: 'destructive',
      });
    }
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setEditDraft({ name: user.name, role: user.role, department: user.department });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedUser || !editDraft) return;
    try {
      const updated = await apiUpdateUser(selectedUser.id, {
        name: editDraft.name,
        role: editDraft.role,
        department: editDraft.department || ''
      } as any);
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...updated } : u));
      setIsEditOpen(false);
      setSelectedUser(null);
      toast({ title: 'User updated', description: `${updated.name} has been updated.` });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  const deleteUserHandler = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const confirmed = window.confirm(`Delete user ${user.name}? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      await apiDeleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      toast({ title: 'User deleted', description: `${user.name} has been removed.` });
      if (selectedUser?.id === userId) {
        setIsEditOpen(false);
        setSelectedUser(null);
      }
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  const getUserPermissions = (userId: string): UserPermissions => {
    return userPermissions[userId] || defaultPermissions.lawyer;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Register new users and manage permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RotateCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-navy text-primary-foreground hover:opacity-90">
              <UserPlus className="w-4 h-4 mr-2" />
              Register User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Register New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="role">Role *</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lawyer">Lawyer</SelectItem>
                    <SelectItem value="judge">Judge</SelectItem>
                    <SelectItem value="clerk">Clerk</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="prosecutor">Prosecutor</SelectItem>
                    <SelectItem value="paralegal">Paralegal</SelectItem>
                    <SelectItem value="legal_aid_officer">Legal Aid Officer</SelectItem>
                    <SelectItem value="partner_admin">Partner Admin</SelectItem>
                    <SelectItem value="data_analyst">Data Analyst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={newUser.department}
                  onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Enter department"
                />
              </div>
              <div>
                <Label htmlFor="password">Temporary Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter temporary password"
                />
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input id="dob" type="date" value={newUser.dateOfBirth} onChange={(e) => setNewUser(prev => ({ ...prev, dateOfBirth: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="address">Address *</Label>
                <Input id="address" value={newUser.address} onChange={(e) => setNewUser(prev => ({ ...prev, address: e.target.value }))} placeholder="Street, City" />
              </div>
              <Button onClick={handleRegisterUser} className="w-full">
                Register User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{users.length}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {users.filter(u => u.status === 'active').length}
            </div>
            <p className="text-xs text-success">Currently active</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <p className="text-xs text-destructive">Admin access</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reviews</CardTitle>
            <XCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">0</div>
            <p className="text-xs text-warning">Need approval</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">User Directory</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" />
                User Directory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.department || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openEdit(user)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteUserHandler(user.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                          <Button 
                            size="sm" 
                            variant={user.status === 'active' ? 'destructive' : 'default'}
                            onClick={() => handleToggleUserStatus(user.id)}
                          >
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif flex items-center">
                <Key className="w-5 h-5 mr-2 text-primary" />
                User Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {users.map((user) => (
                  <div key={user.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{user.name}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className={getRoleColor(user.role)}>
                              {user.role}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(getUserPermissions(user.id)).map(([permission, enabled]) => (
                        <div key={permission} className="flex items-center justify-between p-2 bg-gradient-subtle rounded">
                          <Label 
                            htmlFor={`${user.id}-${permission}`}
                            className="text-xs cursor-pointer"
                          >
                            {permission.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                          </Label>
                          <Switch
                            id={`${user.id}-${permission}`}
                            checked={enabled}
                            onCheckedChange={(value) => 
                              handlePermissionChange(user.id, permission as keyof UserPermissions, value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setSelectedUser(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit User</DialogTitle>
          </DialogHeader>
          {editDraft && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input id="edit-name" value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editDraft.role} onValueChange={(value) => setEditDraft({ ...editDraft, role: value as User['role'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lawyer">Lawyer</SelectItem>
                    <SelectItem value="judge">Judge</SelectItem>
                    <SelectItem value="clerk">Clerk</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="prosecutor">Prosecutor</SelectItem>
                    <SelectItem value="paralegal">Paralegal</SelectItem>
                    <SelectItem value="legal_aid_officer">Legal Aid Officer</SelectItem>
                    <SelectItem value="partner_admin">Partner Admin</SelectItem>
                    <SelectItem value="data_analyst">Data Analyst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-dept">Department</Label>
                <Input id="edit-dept" value={editDraft.department || ''} onChange={(e) => setEditDraft({ ...editDraft, department: e.target.value })} />
              </div>
              <div className="flex justify-between">
                {selectedUser && (
                  <Button variant="destructive" onClick={() => deleteUserHandler(selectedUser.id)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                )}
                <div className="ml-auto space-x-2">
                  <Button variant="outline" onClick={() => { setIsEditOpen(false); setSelectedUser(null); }}>Cancel</Button>
                  <Button onClick={saveEdit}>Save</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
