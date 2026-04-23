/**
 * User Management Component
 * Admin module for managing users, assigning roles, and approving registrations
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Avatar,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  TablePagination,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  ChatBubble as ChatIcon,
  Logout as LogoutIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as ApproveIcon,
  ManageAccounts as ManageAccountsIcon,
  Block as BlockIcon,
  PersonAdd as PersonAddIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  SupervisorAccount as SupervisorIcon,
  AdminPanelSettings as AdminIcon,
  SupportAgent as AgentIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material'
import { useAuth } from '../../services/authService'
import { adminAPI } from '../../services/apiService'
import DashboardShell, { type DashboardShellNavSection, toInitials } from '../dashboard/DashboardShell'

interface User {
  id: string
  name: string
  email: string
  phone_number?: string
  role: string
  is_active: boolean
  is_verified: boolean
  department?: string
  specialization?: string
  languages?: string
  status?: string
  created_at: string
  last_login?: string
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 1 }}>{children}</Box>}
    </div>
  )
}

const ROLES = [
  { value: 'customer', label: 'Customer', icon: <PersonIcon />, color: 'default' },
  { value: 'agent', label: 'Agent', icon: <AgentIcon />, color: 'info' },
  { value: 'supervisor', label: 'Supervisor', icon: <SupervisorIcon />, color: 'warning' },
  { value: 'admin', label: 'Admin', icon: <AdminIcon />, color: 'error' },
]

const DEPARTMENTS = [
  'Customer Support',
  'Technical Support',
  'Billing Department',
  'Complaints & Escalations',
  'VIP Services',
]

const SPECIALIZATIONS = [
  'General Support',
  'Billing & Payments',
  'Technical Support',
  'Account Management',
  'Mobile Money (EcoCash)',
  'Transfers (ZIPIT/RTGS)',
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sn', label: 'Shona' },
  { value: 'nd', label: 'Ndebele' },
]

const USERS_TABLE_ROWS_PER_PAGE = 6

export default function UserManagement() {
  const navigate = useNavigate()
  const { user: currentUser, logout } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [allUsersPage, setAllUsersPage] = useState(0)
  const [allUsersRowsPerPage, setAllUsersRowsPerPage] = useState(USERS_TABLE_ROWS_PER_PAGE)
  const [pendingUsersPage, setPendingUsersPage] = useState(0)
  const [pendingUsersRowsPerPage, setPendingUsersRowsPerPage] = useState(USERS_TABLE_ROWS_PER_PAGE)

  // Dialog states
  const [assignRoleDialog, setAssignRoleDialog] = useState(false)
  const [editUserDialog, setEditUserDialog] = useState(false)
  const [createUserDialog, setCreateUserDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Form states
  const [roleForm, setRoleForm] = useState({
    role: 'customer',
    department: '',
    specialization: '',
    languages: '',
  })

  const [editForm, setEditForm] = useState({
    name: '',
    phone_number: '',
    preferred_language: 'en',
    department: '',
    specialization: '',
    languages: '',
    is_active: true,
  })

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    role: 'customer',
    preferred_language: 'en',
    department: '',
    specialization: '',
    languages: '',
  })

  useEffect(() => {
    fetchUsers()
    fetchPendingUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getUsers()
      setUsers(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingUsers = async () => {
    try {
      const response = await adminAPI.getPendingUsers()
      setPendingUsers(response.data)
    } catch (err: any) {
      console.error('Failed to load pending users:', err)
    }
  }

  const handleAssignRole = async () => {
    if (!selectedUser) return
    try {
      await adminAPI.assignRole(selectedUser.id, roleForm)
      setSuccess(`Role assigned to ${selectedUser.name} successfully`)
      setAssignRoleDialog(false)
      fetchUsers()
      fetchPendingUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to assign role')
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return
    try {
      await adminAPI.updateUser(selectedUser.id, editForm)
      setSuccess(`User ${selectedUser.name} updated successfully`)
      setEditUserDialog(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user')
    }
  }

  const handleCreateUser = async () => {
    try {
      await adminAPI.createUser(createForm)
      setSuccess('User created successfully')
      setCreateUserDialog(false)
      setCreateForm({
        name: '',
        email: '',
        password: '',
        phone_number: '',
        role: 'customer',
        preferred_language: 'en',
        department: '',
        specialization: '',
        languages: '',
      })
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    try {
      await adminAPI.deleteUser(selectedUser.id)
      setSuccess(`User ${selectedUser.name} deleted successfully`)
      setDeleteDialog(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user')
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      await adminAPI.toggleUserStatus(user.id)
      setSuccess(`User ${user.name} ${user.is_active ? 'deactivated' : 'activated'}`)
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to toggle user status')
    }
  }

  const openAssignRoleDialog = (user: User) => {
    setSelectedUser(user)
    setRoleForm({
      role: user.role === 'pending' ? 'customer' : user.role,
      department: user.department || '',
      specialization: user.specialization || '',
      languages: user.languages || '',
    })
    setAssignRoleDialog(true)
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name,
      phone_number: user.phone_number || '',
      preferred_language: 'en',
      department: user.department || '',
      specialization: user.specialization || '',
      languages: user.languages || '',
      is_active: user.is_active,
    })
    setEditUserDialog(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setDeleteDialog(true)
  }

  const getRoleChip = (role: string) => {
    const roleConfig = ROLES.find(r => r.value === role) || { label: role, color: 'default' }
    if (role === 'pending') {
      return <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" variant="outlined" />
    }
    return <Chip label={roleConfig.label} color={roleConfig.color as any} size="small" />
  }

  const filteredUsers = useMemo(() => users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = !roleFilter || user.role === roleFilter
    return matchesSearch && matchesRole
  }), [users, searchTerm, roleFilter])

  const paginatedFilteredUsers = useMemo(() => {
    const start = allUsersPage * allUsersRowsPerPage
    return filteredUsers.slice(start, start + allUsersRowsPerPage)
  }, [filteredUsers, allUsersPage, allUsersRowsPerPage])

  const paginatedPendingUsers = useMemo(() => {
    const start = pendingUsersPage * pendingUsersRowsPerPage
    return pendingUsers.slice(start, start + pendingUsersRowsPerPage)
  }, [pendingUsers, pendingUsersPage, pendingUsersRowsPerPage])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredUsers.length / allUsersRowsPerPage) - 1)
    if (allUsersPage > maxPage) {
      setAllUsersPage(maxPage)
    }
  }, [filteredUsers.length, allUsersPage, allUsersRowsPerPage])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(pendingUsers.length / pendingUsersRowsPerPage) - 1)
    if (pendingUsersPage > maxPage) {
      setPendingUsersPage(maxPage)
    }
  }, [pendingUsers.length, pendingUsersPage, pendingUsersRowsPerPage])

  const handleAllUsersPageChange = (_event: unknown, page: number) => {
    setAllUsersPage(page)
  }

  const handleAllUsersRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setAllUsersRowsPerPage(Number.parseInt(event.target.value, 10))
    setAllUsersPage(0)
  }

  const handlePendingUsersPageChange = (_event: unknown, page: number) => {
    setPendingUsersPage(page)
  }

  const handlePendingUsersRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPendingUsersRowsPerPage(Number.parseInt(event.target.value, 10))
    setPendingUsersPage(0)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleRefresh = () => {
    fetchUsers()
    fetchPendingUsers()
  }

  const isStaffRole = (role: string) => ['agent', 'supervisor', 'admin'].includes(role)

  const displayName = currentUser?.name || currentUser?.email || 'Admin User'

  const sidebarSections: DashboardShellNavSection[] = [
    {
      id: 'main',
      title: 'User Management',
      items: [
        {
          id: 'all-users',
          label: 'All Users',
          icon: <ManageAccountsIcon sx={{ fontSize: 13 }} />,
          active: tabValue === 0,
          onClick: () => setTabValue(0),
        },
        {
          id: 'pending-users',
          label: 'Pending Approval',
          icon: <PendingIcon sx={{ fontSize: 13 }} />,
          active: tabValue === 1,
          onClick: () => setTabValue(1),
        },
      ],
    },
    {
      id: 'operations',
      title: 'Operations',
      items: [
        {
          id: 'admin-overview',
          label: 'Admin Overview',
          icon: <DashboardIcon sx={{ fontSize: 13 }} />,
          onClick: () => navigate('/admin'),
        },
        {
          id: 'agent-console',
          label: 'Agent Console',
          icon: <AgentIcon sx={{ fontSize: 13 }} />,
          onClick: () => navigate('/agent/console'),
        },
        {
          id: 'chat',
          label: 'Chat',
          icon: <ChatIcon sx={{ fontSize: 13 }} />,
          onClick: () => navigate('/chat'),
        },
      ],
    },
    {
      id: 'account',
      title: 'Account',
      items: [
        {
          id: 'logout',
          label: 'Logout',
          icon: <LogoutIcon sx={{ fontSize: 13 }} />,
          onClick: handleLogout,
        },
      ],
    },
  ]

  const topActions = (
    <>
      <FormControl
        size="small"
        sx={{
          minWidth: 140,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            height: 38,
          },
        }}
      >
        <InputLabel id="topbar-role-filter-label">Role</InputLabel>
        <Select
          labelId="topbar-role-filter-label"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          label="Role"
        >
          <MenuItem value="">All Roles</MenuItem>
          {ROLES.map((role) => (
            <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
          ))}
          <MenuItem value="pending">Pending</MenuItem>
        </Select>
      </FormControl>
      <button type="button" className="btn" onClick={() => navigate('/admin')}>
        <DashboardIcon sx={{ fontSize: 12 }} /> Admin Panel
      </button>
      <button type="button" className="btn" onClick={() => setCreateUserDialog(true)}>
        <PersonAddIcon sx={{ fontSize: 12 }} /> Create User
      </button>
      <button type="button" className="btn" onClick={handleRefresh}>
        <RefreshIcon sx={{ fontSize: 12 }} /> Refresh
      </button>
      <button type="button" className="btn" onClick={handleLogout}>
        <LogoutIcon sx={{ fontSize: 12 }} /> Logout
      </button>
    </>
  )

  return (
    <DashboardShell
      roleClassName="role-dashboard-admin"
      brandLabel="Taur.ai Admin"
      brandIcon={<DashboardIcon sx={{ fontSize: 13 }} />}
      sidebarSections={sidebarSections}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search users by name or email..."
      topActions={topActions}
      userName={displayName}
      userMeta="Full user management"
      userInitials={toInitials(displayName, 'AD')}
      onUserCardClick={() => setCreateUserDialog(true)}
    >
      <Box sx={{ p: { xs: 0.5, md: 0.75 } }}>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} md={2}>
        <Card sx={{ borderRadius: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="primary">{users.length}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
        <Card sx={{ borderRadius: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="warning.main">{pendingUsers.length}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
        <Card sx={{ borderRadius: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="info.main">
                {users.filter(u => u.role === 'agent').length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agents</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
        <Card sx={{ borderRadius: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="success.main">
                {users.filter(u => u.role === 'customer').length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
        <Card sx={{ borderRadius: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="secondary.main">
                {users.filter(u => u.role === 'supervisor').length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supervisors</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
        <Card sx={{ borderRadius: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="error.main">
                {users.filter(u => u.role === 'admin').length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admins</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* All Users Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Users Table */}
        <TableContainer component={Paper} sx={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 0 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFilteredUsers.map(user => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: user.is_active ? 'primary.main' : 'grey.400' }}>
                          {user.name[0].toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography fontWeight="medium">{user.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{getRoleChip(user.role)}</TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                        variant={user.is_active ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Role">
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<ManageAccountsIcon />}
                          onClick={() => openAssignRoleDialog(user)}
                          sx={{ mr: 1 }}
                        >
                          Edit Role
                        </Button>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => openEditDialog(user)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={user.is_active ? 'Deactivate' : 'Activate'}>
                        <IconButton onClick={() => handleToggleStatus(user)} color={user.is_active ? 'warning' : 'success'}>
                          <BlockIcon />
                        </IconButton>
                      </Tooltip>
                      {currentUser?.role === 'admin' && (
                        <Tooltip title="Delete">
                          <IconButton onClick={() => openDeleteDialog(user)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredUsers.length}
          page={allUsersPage}
          onPageChange={handleAllUsersPageChange}
          rowsPerPage={allUsersRowsPerPage}
          onRowsPerPageChange={handleAllUsersRowsPerPageChange}
          rowsPerPageOptions={[USERS_TABLE_ROWS_PER_PAGE]}
          showFirstButton
          showLastButton
        />
      </TabPanel>

      {/* Pending Users Tab */}
      <TabPanel value={tabValue} index={1}>
        <Alert severity="info" sx={{ mb: 2 }}>
          These users have registered and are waiting for role assignment. Assign a role to allow them to log in.
        </Alert>
        <TableContainer component={Paper} sx={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 0 }}>
          <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '44%' }}>User</TableCell>
                <TableCell sx={{ width: '20%' }}>Phone</TableCell>
                <TableCell sx={{ width: '22%' }}>Registered</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary" py={3}>
                      No pending users
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPendingUsers.map(user => (
                  <TableRow key={user.id} hover sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2} sx={{ minWidth: 0 }}>
                        <Avatar sx={{ bgcolor: 'warning.main' }}>
                          {user.name[0].toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight="medium" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.name}
                          </Typography>
                          <Tooltip title={user.email}>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {user.email}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.phone_number || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(user.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<ApproveIcon />}
                        onClick={() => openAssignRoleDialog(user)}
                      >
                        Assign Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pendingUsers.length}
          page={pendingUsersPage}
          onPageChange={handlePendingUsersPageChange}
          rowsPerPage={pendingUsersRowsPerPage}
          onRowsPerPageChange={handlePendingUsersRowsPerPageChange}
          rowsPerPageOptions={[USERS_TABLE_ROWS_PER_PAGE]}
          showFirstButton
          showLastButton
        />
      </TabPanel>

      {/* Assign Role Dialog */}
      <Dialog open={assignRoleDialog} onClose={() => setAssignRoleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Role to {selectedUser?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleForm.role}
                onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
                label="Role"
              >
                {ROLES.map(role => (
                  <MenuItem key={role.value} value={role.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {role.icon}
                      {role.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {isStaffRole(roleForm.role) && (
              <>
                <Divider sx={{ my: 2 }}>Staff Details</Divider>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={roleForm.department}
                    onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value })}
                    label="Department"
                  >
                    {DEPARTMENTS.map(dept => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Specialization</InputLabel>
                  <Select
                    value={roleForm.specialization}
                    onChange={(e) => setRoleForm({ ...roleForm, specialization: e.target.value })}
                    label="Specialization"
                  >
                    {SPECIALIZATIONS.map(spec => (
                      <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Languages (comma-separated: en,sn,nd)"
                  value={roleForm.languages}
                  onChange={(e) => setRoleForm({ ...roleForm, languages: e.target.value })}
                  placeholder="en,sn,nd"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignRoleDialog(false)}>Cancel</Button>
          <Button onClick={handleAssignRole} variant="contained" color="primary">
            Assign Role
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialog} onClose={() => setEditUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User: {selectedUser?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={editForm.phone_number}
              onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                label="Department"
              >
                <MenuItem value="">None</MenuItem>
                {DEPARTMENTS.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Specialization</InputLabel>
              <Select
                value={editForm.specialization}
                onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                label="Specialization"
              >
                <MenuItem value="">None</MenuItem>
                {SPECIALIZATIONS.map(spec => (
                  <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateUser} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createUserDialog} onClose={() => setCreateUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              required
              label="Name"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              required
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              required
              label="Password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={createForm.phone_number}
              onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                label="Role"
              >
                {ROLES.map(role => (
                  <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Preferred Language</InputLabel>
              <Select
                value={createForm.preferred_language}
                onChange={(e) => setCreateForm({ ...createForm, preferred_language: e.target.value })}
                label="Preferred Language"
              >
                {LANGUAGES.map(lang => (
                  <MenuItem key={lang.value} value={lang.value}>{lang.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {isStaffRole(createForm.role) && (
              <>
                <Divider sx={{ my: 2 }}>Staff Details</Divider>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    label="Department"
                  >
                    {DEPARTMENTS.map(dept => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Specialization</InputLabel>
                  <Select
                    value={createForm.specialization}
                    onChange={(e) => setCreateForm({ ...createForm, specialization: e.target.value })}
                    label="Specialization"
                  >
                    {SPECIALIZATIONS.map(spec => (
                      <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateUserDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained" color="primary">
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedUser?.name}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </DashboardShell>
  )
}
