import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { adminAPI } from '../../services/apiService'
import AdminPageChrome from './AdminPageChrome'

type LocationType = 'atm' | 'bank' | 'econet_shop' | 'netone_shop' | 'cashout_agent' | 'innbucks_outlet' | 'telecash_shop' | 'agency_banking'

interface LocationItem {
  id: string
  location_type: LocationType
  name: string
  address?: string
  contact?: string
  opening_hours?: string
  latitude: number
  longitude: number
  provider?: string
  is_active: boolean
}

interface ImportPreviewRow {
  row: number
  errors: string[]
  data: Record<string, any>
}

interface ImportPreviewData {
  total: number
  valid: number
  invalid: number
  invalid_rows: ImportPreviewRow[]
}

const LOCATION_TYPE_OPTIONS: Array<{ value: LocationType; label: string }> = [
  { value: 'atm', label: 'ATM' },
  { value: 'bank', label: 'Bank / Branch' },
  { value: 'econet_shop', label: 'Econet Shop' },
  { value: 'netone_shop', label: 'NetOne Shop' },
  { value: 'cashout_agent', label: 'Cash-out Agent' },
  { value: 'innbucks_outlet', label: 'InnBucks Outlet' },
  { value: 'telecash_shop', label: 'Telecash Shop' },
  { value: 'agency_banking', label: 'Agency Banking' },
]

const initialForm = {
  location_type: 'atm' as LocationType,
  name: '',
  address: '',
  contact: '',
  opening_hours: '',
  latitude: '',
  longitude: '',
  provider: '',
  is_active: true,
}

export default function LocationManagement() {
  const [items, setItems] = useState<LocationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(6)

  const [openDialog, setOpenDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<LocationItem | null>(null)
  const [form, setForm] = useState(initialForm)
  const [importing, setImporting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null)

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return items.filter((item) => {
      const matchesType = !typeFilter || item.location_type === typeFilter
      if (!matchesType) {
        return false
      }

      if (!query) {
        return true
      }

      const typeLabel = LOCATION_TYPE_OPTIONS.find((entry) => entry.value === item.location_type)?.label || item.location_type

      const searchable = [
        item.name,
        item.address || '',
        item.contact || '',
        item.provider || '',
        typeLabel,
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [items, typeFilter, searchQuery])

  const paginatedFilteredItems = useMemo(() => {
    const start = page * rowsPerPage
    return filteredItems.slice(start, start + rowsPerPage)
  }, [filteredItems, page, rowsPerPage])

  const fetchItems = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await adminAPI.getLocations(typeFilter || undefined)
      setItems(response.data?.items || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load location directory')
    } finally {
      setLoading(false)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setError('')
      const response = await adminAPI.exportLocations(format, typeFilter || undefined)
      const suffix = typeFilter || 'all'
      const filename = `location_directory_${suffix}.${format}`
      downloadBlob(response.data, filename)
      setSuccess(`Location directory exported as ${format.toUpperCase()}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to export locations')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      setError('')
      const response = await adminAPI.downloadLocationTemplate()
      downloadBlob(response.data, 'location_directory_template.csv')
      setSuccess('Template downloaded successfully')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to download template')
    }
  }

  const handleDownloadInvalidRows = () => {
    if (!previewData || !previewData.invalid_rows || previewData.invalid_rows.length === 0) {
      return
    }

    const headers = [
      'row',
      'errors',
      'location_type',
      'name',
      'address',
      'contact',
      'opening_hours',
      'latitude',
      'longitude',
      'provider',
      'is_active',
    ]

    const escapeCsv = (value: any) => {
      const text = String(value ?? '')
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    }

    const rows = previewData.invalid_rows.map((item) => {
      const data = item.data || {}
      return [
        item.row,
        item.errors.join(' | '),
        data.location_type,
        data.name,
        data.address,
        data.contact,
        data.opening_hours,
        data.latitude,
        data.longitude,
        data.provider,
        data.is_active,
      ]
        .map(escapeCsv)
        .join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, 'location_import_invalid_rows.csv')
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      setImporting(true)
      setError('')
      const response = await adminAPI.previewLocationImport(file)
      setPreviewData(response.data)
      setPendingImportFile(file)
      setPreviewOpen(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import locations')
    } finally {
      setImporting(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingImportFile) return

    try {
      setImporting(true)
      setError('')
      const response = await adminAPI.importLocations(pendingImportFile)
      const stats = response.data || {}
      setSuccess(`Import complete. Created: ${stats.created || 0}, Updated: ${stats.updated || 0}, Skipped: ${stats.skipped || 0}`)
      setPreviewOpen(false)
      setPendingImportFile(null)
      setPreviewData(null)
      fetchItems()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save import')
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [typeFilter])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredItems.length / rowsPerPage) - 1)
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [filteredItems.length, page, rowsPerPage])

  useEffect(() => {
    setPage(0)
  }, [typeFilter, searchQuery])

  const openCreateDialog = () => {
    setEditingItem(null)
    setForm(initialForm)
    setOpenDialog(true)
  }

  const openEditDialog = (item: LocationItem) => {
    setEditingItem(item)
    setForm({
      location_type: item.location_type,
      name: item.name || '',
      address: item.address || '',
      contact: item.contact || '',
      opening_hours: item.opening_hours || '',
      latitude: String(item.latitude),
      longitude: String(item.longitude),
      provider: item.provider || '',
      is_active: item.is_active,
    })
    setOpenDialog(true)
  }

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      }

      if (Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
        setError('Latitude and longitude must be valid numbers')
        return
      }

      if (editingItem) {
        await adminAPI.updateLocation(editingItem.id, payload)
        setSuccess('Location updated successfully')
      } else {
        await adminAPI.createLocation(payload)
        setSuccess('Location created successfully')
      }

      setOpenDialog(false)
      fetchItems()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save location')
    }
  }

  const handleDelete = async (item: LocationItem) => {
    const shouldDelete = window.confirm(`Delete location "${item.name}"?`)
    if (!shouldDelete) return

    try {
      await adminAPI.deleteLocation(item.id)
      setSuccess('Location deleted successfully')
      fetchItems()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete location')
    }
  }

  const getTypeLabel = (type: string) => {
    return LOCATION_TYPE_OPTIONS.find((entry) => entry.value === type)?.label || type
  }

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10))
    setPage(0)
  }

  const topActions = (
    <>
      <button type="button" className="btn" onClick={fetchItems}>
        <RefreshIcon sx={{ fontSize: 12 }} /> Refresh
      </button>
      <button type="button" className="btn" onClick={() => handleExport('csv')}>
        Export CSV
      </button>
      <button type="button" className="btn" onClick={() => handleExport('json')}>
        Export JSON
      </button>
      <button type="button" className="btn" onClick={handleDownloadTemplate}>
        Download Template
      </button>
      <button type="button" className="btn" onClick={openCreateDialog}>
        <AddIcon sx={{ fontSize: 12 }} /> Add Location
      </button>
    </>
  )

  return (
    <AdminPageChrome
      activePage="locations"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search locations by name, address, contact, provider, or type..."
      topActions={topActions}
    >
    <Box sx={{ p: { xs: 0.75, md: 1.25 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">Location Directory Management</Typography>
        <Button variant="outlined" component="label" disabled={importing}>
          {importing ? 'Importing...' : 'Import CSV/JSON'}
          <input hidden type="file" accept=".csv,.json,application/json,text/csv" onChange={handleImport} />
        </Button>
      </Box>

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

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Location Type</InputLabel>
              <Select
                value={typeFilter}
                label="Location Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {LOCATION_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Chip label={`${filteredItems.length} records`} color="primary" variant="outlined" />
            <FormHelperText>
              Import columns: location_type,name,address,contact,opening_hours,latitude,longitude,provider,is_active.
            </FormHelperText>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Coordinates</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedFilteredItems.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.name}</TableCell>
                <TableCell>{getTypeLabel(item.location_type)}</TableCell>
                <TableCell>{item.address || '—'}</TableCell>
                <TableCell>{item.contact || '—'}</TableCell>
                <TableCell>{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</TableCell>
                <TableCell>
                  <Chip label={item.is_active ? 'Active' : 'Inactive'} color={item.is_active ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEditDialog(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(item)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">No location records found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredItems.length}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[6, 10, 25]}
        showFirstButton
        showLastButton
      />

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingItem ? 'Edit Location' : 'Add Location'}</DialogTitle>
        <DialogContent>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={form.location_type}
                label="Type"
                onChange={(e) => setForm((prev) => ({ ...prev, location_type: e.target.value as LocationType }))}
              >
                {LOCATION_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Name"
              fullWidth
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />

            <TextField
              label="Address"
              fullWidth
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />

            <TextField
              label="Contact"
              fullWidth
              value={form.contact}
              onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
            />

            <TextField
              label="Opening Hours"
              fullWidth
              value={form.opening_hours}
              onChange={(e) => setForm((prev) => ({ ...prev, opening_hours: e.target.value }))}
            />

            <TextField
              label="Provider"
              fullWidth
              value={form.provider}
              onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
            />

            <TextField
              label="Latitude"
              fullWidth
              value={form.latitude}
              onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))}
            />

            <TextField
              label="Longitude"
              fullWidth
              value={form.longitude}
              onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))}
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={form.is_active ? 'active' : 'inactive'}
                label="Status"
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === 'active' }))}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Import Validation Preview</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Review this validation summary before saving imported location data.
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              <Chip label={`Total: ${previewData?.total || 0}`} color="default" />
              <Chip label={`Valid: ${previewData?.valid || 0}`} color="success" />
              <Chip label={`Invalid: ${previewData?.invalid || 0}`} color={(previewData?.invalid || 0) > 0 ? 'error' : 'default'} />
            </Box>

            {(previewData?.invalid_rows?.length || 0) > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Row</TableCell>
                      <TableCell>Errors</TableCell>
                      <TableCell>Data</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData!.invalid_rows.map((row) => (
                      <TableRow key={row.row}>
                        <TableCell>{row.row}</TableCell>
                        <TableCell>
                          {row.errors.map((err) => (
                            <Typography key={err} variant="caption" color="error" display="block">{err}</Typography>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(row.data)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="success">No invalid rows detected. Ready to import.</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {(previewData?.invalid || 0) > 0 && (
            <Button variant="outlined" color="warning" onClick={handleDownloadInvalidRows}>
              Download Invalid Rows CSV
            </Button>
          )}
          <Button onClick={() => setPreviewOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmImport} disabled={importing || !pendingImportFile}>
            {importing ? 'Saving...' : 'Confirm Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </AdminPageChrome>
  )
}
