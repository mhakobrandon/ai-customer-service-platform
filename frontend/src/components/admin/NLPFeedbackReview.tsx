/**
 * NLP Feedback Review Component
 * Allows supervisors/admins to review misclassified messages,
 * correct intents, and feed corrections back into the retraining pipeline.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Badge,
  Tabs,
  Tab,
  TablePagination,
} from '@mui/material';
import {
  CheckCircle as ReviewedIcon,
  PendingActions as PendingIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  ModelTraining as RetrainIcon,
  FilterList as FilterIcon,
  Psychology as AIIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { adminAPI } from '../../services/apiService';
import { formatDateOnly } from '../../utils/dateUtils';
import AdminPageChrome from './AdminPageChrome';

const INTENT_OPTIONS = [
  'balance_inquiry',
  'transaction_history',
  'transfer_money',
  'account_statement',
  'password_reset',
  'update_profile',
  'loan_inquiry',
  'bill_payment',
  'mobile_money',
  'transaction_dispute',
  'security_pin',
  'network_connectivity',
  'mobile_wallet_fees',
  'account_closure',
  'account_opening',
  'card_request',
  'atm_location',
  'branch_location',
  'escalation_request',
  'general_inquiry',
  'greeting',
  'goodbye',
  'complaint',
];

interface FeedbackItem {
  id: string;
  user_id: string | null;
  session_id: string | null;
  message_id: string | null;
  message_text: string;
  predicted_intent: string;
  predicted_confidence: string;
  language: string;
  needs_escalation: boolean;
  corrected_intent: string | null;
  reviewer_notes: string | null;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface EditState {
  corrected_intent: string;
  reviewer_notes: string;
}

export default function NLPFeedbackReview() {
  const theme = useTheme();

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0); // 0=unreviewed, 1=reviewed, 2=all
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [intentFilter, setIntentFilter] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [confidenceRange, setConfidenceRange] = useState<number[]>([0, 100]);
  const [limit, setLimit] = useState(100);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ corrected_intent: '', reviewer_notes: '' });
  const [saving, setSaving] = useState(false);

  // Retrain dialog
  const [retrainDialog, setRetrainDialog] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit };
      if (tabValue === 0) params.reviewed = false;
      else if (tabValue === 1) params.reviewed = true;
      if (intentFilter) params.intent = intentFilter;
      if (languageFilter) params.language = languageFilter;
      if (confidenceRange[0] > 0) params.min_confidence = confidenceRange[0] / 100;
      if (confidenceRange[1] < 100) params.max_confidence = confidenceRange[1] / 100;

      const res = await adminAPI.getNLPFeedback(params);
      setItems(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  }, [tabValue, intentFilter, languageFilter, confidenceRange, limit]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const noteText = item.reviewer_notes || '';
      const correctedIntent = item.corrected_intent || '';
      return (
        item.message_text.toLowerCase().includes(query)
        || item.predicted_intent.toLowerCase().includes(query)
        || correctedIntent.toLowerCase().includes(query)
        || noteText.toLowerCase().includes(query)
        || item.language.toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  const paginatedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredItems.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredItems.length, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [tabValue, intentFilter, languageFilter, confidenceRange, limit, searchQuery]);

  const startEditing = (item: FeedbackItem) => {
    setEditingId(item.id);
    setEditState({
      corrected_intent: item.corrected_intent || item.predicted_intent,
      reviewer_notes: item.reviewer_notes || '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditState({ corrected_intent: '', reviewer_notes: '' });
  };

  const saveCorrection = async (feedbackId: string) => {
    setSaving(true);
    try {
      await adminAPI.updateNLPFeedback(feedbackId, {
        corrected_intent: editState.corrected_intent,
        reviewer_notes: editState.reviewer_notes,
        reviewed: true,
      });
      setItems(prev =>
        prev.map(item =>
          item.id === feedbackId
            ? { ...item, corrected_intent: editState.corrected_intent, reviewer_notes: editState.reviewer_notes, reviewed: true }
            : item
        )
      );
      setEditingId(null);
      setSuccess('Correction saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save correction');
    } finally {
      setSaving(false);
    }
  };

  const markCorrect = async (item: FeedbackItem) => {
    setSaving(true);
    try {
      await adminAPI.updateNLPFeedback(item.id, {
        corrected_intent: item.predicted_intent,
        reviewer_notes: 'Confirmed correct by reviewer',
        reviewed: true,
      });
      setItems(prev =>
        prev.map(i =>
          i.id === item.id
            ? { ...i, corrected_intent: item.predicted_intent, reviewer_notes: 'Confirmed correct by reviewer', reviewed: true }
            : i
        )
      );
      setSuccess('Marked as correctly classified');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const res = await adminAPI.exportNLPFeedback(format, tabValue === 1);
      if (format === 'csv') {
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nlp_feedback_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nlp_feedback_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      setSuccess(`Exported as ${format.toUpperCase()}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Export failed');
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await adminAPI.triggerRetraining();
      setSuccess('Retraining triggered successfully. The model will be updated shortly.');
      setRetrainDialog(false);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Retraining failed');
    } finally {
      setRetraining(false);
    }
  };

  const confidenceColor = (conf: number) => {
    if (conf >= 0.75) return 'success';
    if (conf >= 0.5) return 'warning';
    return 'error';
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10));
    setPage(0);
  };

  const topActions = (
    <>
      <button type="button" className="btn" onClick={fetchFeedback}>
        <RefreshIcon sx={{ fontSize: 12 }} /> Refresh
      </button>
      <button type="button" className="btn" onClick={() => handleExport('json')}>
        <DownloadIcon sx={{ fontSize: 12 }} /> Export JSON
      </button>
      <button type="button" className="btn" onClick={() => handleExport('csv')}>
        <DownloadIcon sx={{ fontSize: 12 }} /> Export CSV
      </button>
      <button type="button" className="btn btn-pu" onClick={() => setRetrainDialog(true)}>
        <RetrainIcon sx={{ fontSize: 12 }} /> Retrain Model
      </button>
    </>
  );

  return (
    <AdminPageChrome
      activePage="nlp-feedback"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search feedback messages, intents, languages, and notes..."
      topActions={topActions}
    >
    <Box sx={{ px: { xs: 0.75, md: 1.25 }, pb: { xs: 0.75, md: 1.25 }, pt: 0 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1.5, flexWrap: 'wrap' }}>
        <AIIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            NLP Feedback Review
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review misclassified messages and correct intents to improve the AI model
          </Typography>
        </Box>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterIcon color="action" />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Intent</InputLabel>
            <Select value={intentFilter} onChange={e => setIntentFilter(e.target.value)} label="Intent">
              <MenuItem value="">All Intents</MenuItem>
              {INTENT_OPTIONS.map(i => (
                <MenuItem key={i} value={i}>{i.replace(/_/g, ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Language</InputLabel>
            <Select value={languageFilter} onChange={e => setLanguageFilter(e.target.value)} label="Language">
              <MenuItem value="">All</MenuItem>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="sn">Shona</MenuItem>
              <MenuItem value="nd">Ndebele</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ minWidth: 200 }}>
            <Typography variant="caption" color="text.secondary">Confidence: {confidenceRange[0]}% – {confidenceRange[1]}%</Typography>
            <Slider
              value={confidenceRange}
              onChange={(_, v) => setConfidenceRange(v as number[])}
              onChangeCommitted={() => fetchFeedback()}
              size="small"
              valueLabelDisplay="auto"
              min={0}
              max={100}
            />
          </Box>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Limit</InputLabel>
            <Select value={limit} onChange={e => { setLimit(Number(e.target.value)); }} label="Limit">
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={250}>250</MenuItem>
              <MenuItem value={500}>500</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper
        sx={{
          mb: 2,
          borderRadius: 2,
          p: 0.5,
          border: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            minHeight: 44,
            '& .MuiTabs-indicator': {
              display: 'none',
            },
            '& .MuiTab-root': {
              minHeight: 44,
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              color: 'text.secondary',
              transition: 'all 160ms ease',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
            },
            '& .MuiTab-root.Mui-selected': {
              color: 'primary.main',
              backgroundColor: alpha(theme.palette.primary.main, 0.14),
              boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`,
            },
          }}
        >
          <Tab
            label={
              <Badge
                badgeContent={tabValue === 0 ? items.length : undefined}
                color="error"
                max={999}
                sx={{
                  '& .MuiBadge-badge': {
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <PendingIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>Needs Review</Typography>
                </Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <ReviewedIcon fontSize="small" />
                <Typography variant="body2" fontWeight={600}>Reviewed</Typography>
              </Box>
            }
          />
          <Tab label={<Typography variant="body2" fontWeight={600}>All</Typography>} />
        </Tabs>
      </Paper>

      {/* Data Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredItems.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <AIIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {tabValue === 0 ? 'No items pending review — great job!' : 'No feedback items found matching the filters.'}
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: alpha(theme.palette.primary.main, 0.06) } }}>
                  <TableCell sx={{ minWidth: 250 }}>Message</TableCell>
                  <TableCell>Language</TableCell>
                  <TableCell>Predicted Intent</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>Corrected Intent</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>Notes</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedItems.map(item => {
                  const conf = parseFloat(item.predicted_confidence);
                  const isEditing = editingId === item.id;

                  return (
                    <TableRow
                      key={item.id}
                      sx={{
                        backgroundColor: item.reviewed
                          ? alpha(theme.palette.success.main, 0.03)
                          : alpha(theme.palette.warning.main, 0.04),
                        '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.06) },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300, wordBreak: 'break-word' }}>
                          {item.message_text}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.language.toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.predicted_intent.replace(/_/g, ' ')}
                          size="small"
                          color="default"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${(conf * 100).toFixed(0)}%`}
                          size="small"
                          color={confidenceColor(conf)}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editState.corrected_intent}
                            onChange={e => setEditState(prev => ({ ...prev, corrected_intent: e.target.value }))}
                            size="small"
                            fullWidth
                          >
                            {INTENT_OPTIONS.map(i => (
                              <MenuItem key={i} value={i}>{i.replace(/_/g, ' ')}</MenuItem>
                            ))}
                          </Select>
                        ) : item.corrected_intent ? (
                          <Chip
                            label={item.corrected_intent.replace(/_/g, ' ')}
                            size="small"
                            color={item.corrected_intent !== item.predicted_intent ? 'warning' : 'success'}
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            value={editState.reviewer_notes}
                            onChange={e => setEditState(prev => ({ ...prev, reviewer_notes: e.target.value }))}
                            size="small"
                            fullWidth
                            placeholder="Notes..."
                            multiline
                            maxRows={2}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.reviewer_notes || '—'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.reviewed ? (
                          <Chip icon={<ReviewedIcon />} label="Reviewed" size="small" color="success" variant="outlined" />
                        ) : (
                          <Chip icon={<PendingIcon />} label="Pending" size="small" color="warning" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateOnly(item.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Save correction">
                              <IconButton size="small" color="primary" onClick={() => saveCorrection(item.id)} disabled={saving}>
                                {saving ? <CircularProgress size={18} /> : <SaveIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            <Button size="small" onClick={cancelEditing}>Cancel</Button>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Correct intent">
                              <Button size="small" variant="outlined" onClick={() => startEditing(item)}>
                                Fix
                              </Button>
                            </Tooltip>
                            {!item.reviewed && (
                              <Tooltip title="Mark as correctly classified">
                                <IconButton size="small" color="success" onClick={() => markCorrect(item)} disabled={saving}>
                                  <ReviewedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        </>
      )}

      {/* Summary */}
      {!loading && filteredItems.length > 0 && (
        <Paper sx={{ p: 2, mt: 2, borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {paginatedItems.length} of {filteredItems.length} items · {filteredItems.filter(i => i.reviewed).length} reviewed · {filteredItems.filter(i => !i.reviewed).length} pending ·{' '}
            {filteredItems.filter(i => i.corrected_intent && i.corrected_intent !== i.predicted_intent).length} corrections made
          </Typography>
        </Paper>
      )}

      {/* Retrain Dialog */}
      <Dialog open={retrainDialog} onClose={() => setRetrainDialog(false)}>
        <DialogTitle>Retrain NLP Model</DialogTitle>
        <DialogContent>
          <Typography>
            This will merge all reviewed corrections into the training dataset and retrain the model.
            The process runs in the background and the updated model will be loaded automatically.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Make sure you have reviewed and corrected enough feedback items before retraining.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetrainDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleRetrain}
            disabled={retraining}
            startIcon={retraining ? <CircularProgress size={18} /> : <RetrainIcon />}
          >
            {retraining ? 'Retraining...' : 'Start Retraining'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </AdminPageChrome>
  );
}
