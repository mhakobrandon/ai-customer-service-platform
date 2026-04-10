/**
 * Bank Details Component
 * Comprehensive view of selected banking platform
 * Shows USSD codes, WhatsApp bot info, web apps, API integration details
 */

import React, { useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Link,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon,
  Phone as USSDIcon,
  WhatsApp as WhatsAppIcon,
  Language as WebIcon,
  Api as ApiIcon,
  ContactPhone as ContactIcon,
  AttachMoney as FeeIcon,
  Speed as LimitIcon,
  ExpandMore as ExpandIcon,
  CheckCircle as CheckIcon,
  OpenInNew as ExternalIcon,
  PhoneAndroid as AppIcon,
  Code as CodeIcon,
  Info as InfoIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
} from '@mui/icons-material';
import { BankingPlatform } from '../../types/banking';

interface BankDetailsProps {
  platform: BankingPlatform;
  onBack: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
  </div>
);

const BankDetails: React.FC<BankDetailsProps> = ({ platform, onBack }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3.5,
          mb: 3.5,
          background: `linear-gradient(135deg, ${platform.color} 0%, ${alpha(theme.palette.primary.dark, 0.92)} 100%)`,
          color: 'common.white',
          borderRadius: 3,
          boxShadow: theme.palette.mode === 'dark' ? '0 14px 30px rgba(2,6,23,0.42)' : '0 12px 26px rgba(15,23,42,0.12)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={onBack} sx={{ color: 'white', mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              backgroundColor: 'background.paper',
              color: platform.color,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              mr: 2,
            }}
          >
            {platform.shortName.substring(0, 2).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {platform.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip
                label={platform.type.replace('_', ' ').toUpperCase()}
                size="small"
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              {platform.established && (
                <Chip
                  label={`Est. ${platform.established}`}
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              )}
              {platform.apiIntegration.available && (
                <Chip
                  icon={<ApiIcon sx={{ color: 'white !important' }} />}
                  label="API Ready"
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              )}
            </Box>
          </Box>
        </Box>
        <Typography variant="body1" sx={{ opacity: 0.95 }}>
          {platform.description}
        </Typography>
      </Paper>

      {/* Quick Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <USSDIcon sx={{ fontSize: 36, color: platform.color }} />
              <Typography variant="h4" fontWeight="bold">
                {platform.ussdCodes.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                USSD Codes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <WebIcon sx={{ fontSize: 36, color: platform.color }} />
              <Typography variant="h4" fontWeight="bold">
                {platform.webApplications.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Web Portals
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <AppIcon sx={{ fontSize: 36, color: platform.color }} />
              <Typography variant="h4" fontWeight="bold">
                {platform.mobileApps.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mobile Apps
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <ApiIcon sx={{ fontSize: 36, color: platform.color }} />
              <Typography variant="h4" fontWeight="bold">
                {platform.apiIntegration.endpoints?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                API Endpoints
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different sections */}
      <Paper sx={{ mb: 3.5, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<USSDIcon />} label="USSD Codes" iconPosition="start" />
          <Tab icon={<WhatsAppIcon />} label="WhatsApp" iconPosition="start" />
          <Tab icon={<WebIcon />} label="Web & Mobile" iconPosition="start" />
          <Tab icon={<ApiIcon />} label="API Integration" iconPosition="start" />
          <Tab icon={<FeeIcon />} label="Fees & Limits" iconPosition="start" />
          <Tab icon={<ContactIcon />} label="Contact" iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* USSD Codes Tab */}
          <TabPanel value={activeTab} index={0}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Main USSD Code: <strong>{platform.mainUSSD}</strong> - Dial this code to access all services
            </Alert>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>USSD Code</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Category</strong></TableCell>
                    <TableCell align="center"><strong>Action</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {platform.ussdCodes.map((ussd, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Chip
                          label={ussd.code}
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            backgroundColor: `${platform.color}20`,
                            color: platform.color,
                          }}
                        />
                      </TableCell>
                      <TableCell>{ussd.description}</TableCell>
                      <TableCell>
                        <Chip
                          label={ussd.category.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={copiedCode === ussd.code ? 'Copied!' : 'Copy code'}>
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(ussd.code)}
                            color={copiedCode === ussd.code ? 'success' : 'default'}
                          >
                            {copiedCode === ussd.code ? <CheckIcon /> : <CopyIcon />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* USSD Steps Accordions */}
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Step-by-Step Guides
            </Typography>
            {platform.ussdCodes
              .filter((u) => u.steps && u.steps.length > 0)
              .map((ussd, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip label={ussd.code} size="small" sx={{ fontFamily: 'monospace' }} />
                      <Typography>{ussd.description}</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {ussd.steps?.map((step, stepIndex) => (
                        <ListItem key={stepIndex}>
                          <ListItemIcon>
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                fontSize: '0.8rem',
                                backgroundColor: platform.color,
                              }}
                            >
                              {stepIndex + 1}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText primary={step} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
          </TabPanel>

          {/* WhatsApp Tab */}
          <TabPanel value={activeTab} index={1}>
            {platform.whatsappBot ? (
              <Box>
                <Card sx={{ mb: 3, backgroundColor: '#25D366', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <WhatsAppIcon sx={{ fontSize: 48 }} />
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          WhatsApp Business Bot
                        </Typography>
                        <Typography variant="h6">
                          {platform.whatsappBot.displayNumber}
                        </Typography>
                      </Box>
                      <Box sx={{ ml: 'auto' }}>
                        <Button
                          variant="contained"
                          sx={{ backgroundColor: 'background.paper', color: '#25D366' }}
                          onClick={() => copyToClipboard(platform.whatsappBot!.number)}
                        >
                          Copy Number
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                <Typography variant="h6" gutterBottom>
                  Available Features
                </Typography>
                <Grid container spacing={1}>
                  {platform.whatsappBot.features.map((feature, index) => (
                    <Grid item key={index}>
                      <Chip
                        icon={<CheckIcon />}
                        label={feature}
                        color="success"
                        variant="outlined"
                      />
                    </Grid>
                  ))}
                </Grid>

                <Alert severity="success" sx={{ mt: 3 }}>
                  Status: {platform.whatsappBot.available ? 'Active and Available' : 'Currently Unavailable'}
                </Alert>
              </Box>
            ) : (
              <Alert severity="info">
                WhatsApp bot is not currently available for {platform.name}
              </Alert>
            )}
          </TabPanel>

          {/* Web & Mobile Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Web Applications
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {platform.webApplications.map((app, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <WebIcon sx={{ color: platform.color, mr: 1 }} />
                        <Typography variant="h6">{app.name}</Typography>
                        <Chip
                          label={app.type.replace('_', ' ')}
                          size="small"
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        {app.features.map((feature, fIndex) => (
                          <Chip
                            key={fIndex}
                            label={feature}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                      <Button
                        variant="outlined"
                        endIcon={<ExternalIcon />}
                        href={app.url}
                        target="_blank"
                        fullWidth
                      >
                        Visit Portal
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Mobile Applications
            </Typography>
            <Grid container spacing={2}>
              {platform.mobileApps.map((app, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <AppIcon sx={{ color: platform.color, mr: 1 }} />
                        <Typography variant="h6">{app.name}</Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        {app.features.map((feature, fIndex) => (
                          <Chip
                            key={fIndex}
                            label={feature}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {app.androidUrl && (
                          <Button
                            variant="contained"
                            color="success"
                            href={app.androidUrl}
                            target="_blank"
                            sx={{ flex: 1 }}
                          >
                            Android
                          </Button>
                        )}
                        {app.iosUrl && (
                          <Button
                            variant="contained"
                            color="info"
                            href={app.iosUrl}
                            target="_blank"
                            sx={{ flex: 1 }}
                          >
                            iOS
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* API Integration Tab */}
          <TabPanel value={activeTab} index={3}>
            {platform.apiIntegration.available ? (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  <strong>API Integration Available!</strong> This platform supports programmatic integration.
                </Alert>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Integration Details
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="Authentication Type"
                              secondary={platform.apiIntegration.authType.toUpperCase()}
                            />
                          </ListItem>
                          {platform.apiIntegration.documentationUrl && (
                            <ListItem>
                              <ListItemText
                                primary="Documentation"
                                secondary={
                                  <Link href={platform.apiIntegration.documentationUrl} target="_blank">
                                    {platform.apiIntegration.documentationUrl}
                                  </Link>
                                }
                              />
                            </ListItem>
                          )}
                          {platform.apiIntegration.sandboxUrl && (
                            <ListItem>
                              <ListItemText
                                primary="Sandbox Environment"
                                secondary={
                                  <Link href={platform.apiIntegration.sandboxUrl} target="_blank">
                                    {platform.apiIntegration.sandboxUrl}
                                  </Link>
                                }
                              />
                            </ListItem>
                          )}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <CheckIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Supported Features
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {platform.apiIntegration.features.map((feature, index) => (
                            <Chip
                              key={index}
                              label={feature}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {platform.apiIntegration.endpoints && platform.apiIntegration.endpoints.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      <CodeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Available Endpoints
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell><strong>Method</strong></TableCell>
                            <TableCell><strong>Endpoint</strong></TableCell>
                            <TableCell><strong>Description</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {platform.apiIntegration.endpoints.map((endpoint, index) => (
                            <TableRow key={index} hover>
                              <TableCell>
                                <Chip
                                  label={endpoint.method}
                                  size="small"
                                  color={
                                    endpoint.method === 'GET'
                                      ? 'success'
                                      : endpoint.method === 'POST'
                                      ? 'primary'
                                      : 'warning'
                                  }
                                  sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                                />
                              </TableCell>
                              <TableCell>
                                <code style={{ 
                                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.16)' : '#f1f5f9', 
                                  padding: '4px 8px', 
                                  borderRadius: 4,
                                  fontSize: '0.85rem'
                                }}>
                                  {endpoint.name.replace(endpoint.method + ' ', '')}
                                </code>
                              </TableCell>
                              <TableCell>{endpoint.description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  {platform.apiIntegration.documentationUrl && (
                    <Button
                      variant="contained"
                      color="primary"
                      href={platform.apiIntegration.documentationUrl}
                      target="_blank"
                      endIcon={<ExternalIcon />}
                    >
                      View Full API Docs
                    </Button>
                  )}
                  {platform.apiIntegration.sandboxUrl && (
                    <Button
                      variant="outlined"
                      href={platform.apiIntegration.sandboxUrl}
                      target="_blank"
                      endIcon={<ExternalIcon />}
                    >
                      Access Sandbox
                    </Button>
                  )}
                </Box>
              </Box>
            ) : (
              <Alert severity="warning">
                API integration is not currently available for {platform.name}.
                Contact the provider for integration options.
              </Alert>
            )}
          </TabPanel>

          {/* Fees & Limits Tab */}
          <TabPanel value={activeTab} index={4}>
            <Grid container spacing={3}>
              {platform.fees && platform.fees.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    <FeeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Service Fees
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                          <TableCell><strong>Service</strong></TableCell>
                          <TableCell><strong>Fee</strong></TableCell>
                          <TableCell><strong>Notes</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {platform.fees.map((fee, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{fee.service}</TableCell>
                            <TableCell>
                              <Chip
                                label={fee.fee}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{fee.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}

              {platform.limits && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    <LimitIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Transaction Limits
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <List>
                        {platform.limits.perTransaction && (
                          <ListItem>
                            <ListItemText
                              primary="Per Transaction"
                              secondary={platform.limits.perTransaction}
                            />
                          </ListItem>
                        )}
                        {platform.limits.daily && (
                          <ListItem>
                            <ListItemText
                              primary="Daily Limit"
                              secondary={platform.limits.daily}
                            />
                          </ListItem>
                        )}
                        {platform.limits.monthly && (
                          <ListItem>
                            <ListItemText
                              primary="Monthly Limit"
                              secondary={platform.limits.monthly}
                            />
                          </ListItem>
                        )}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {(!platform.fees || platform.fees.length === 0) && !platform.limits && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Fee and limit information is not available for {platform.name}.
                    Please contact the provider for current rates.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </TabPanel>

          {/* Contact Tab */}
          <TabPanel value={activeTab} index={5}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <ContactIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Contact Information
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <USSDIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Customer Service"
                          secondary={platform.contact.customerService.join(' / ')}
                        />
                      </ListItem>
                      {platform.contact.email && (
                        <ListItem>
                          <ListItemText
                            primary="Email"
                            secondary={
                              <Link href={`mailto:${platform.contact.email}`}>
                                {platform.contact.email}
                              </Link>
                            }
                          />
                        </ListItem>
                      )}
                      <ListItem>
                        <ListItemIcon>
                          <WebIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Website"
                          secondary={
                            <Link href={platform.contact.website} target="_blank">
                              {platform.contact.website}
                            </Link>
                          }
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {platform.contact.socialMedia && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Social Media
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {platform.contact.socialMedia.facebook && (
                          <Button
                            variant="outlined"
                            startIcon={<FacebookIcon />}
                            href={platform.contact.socialMedia.facebook}
                            target="_blank"
                            sx={{ color: '#1877F2', borderColor: '#1877F2' }}
                          >
                            Facebook
                          </Button>
                        )}
                        {platform.contact.socialMedia.twitter && (
                          <Button
                            variant="outlined"
                            startIcon={<TwitterIcon />}
                            href={platform.contact.socialMedia.twitter}
                            target="_blank"
                            sx={{ color: '#1DA1F2', borderColor: '#1DA1F2' }}
                          >
                            Twitter
                          </Button>
                        )}
                        {platform.contact.socialMedia.linkedin && (
                          <Button
                            variant="outlined"
                            startIcon={<LinkedInIcon />}
                            href={platform.contact.socialMedia.linkedin}
                            target="_blank"
                            sx={{ color: '#0A66C2', borderColor: '#0A66C2' }}
                          >
                            LinkedIn
                          </Button>
                        )}
                        {platform.contact.socialMedia.instagram && (
                          <Button
                            variant="outlined"
                            startIcon={<InstagramIcon />}
                            href={platform.contact.socialMedia.instagram}
                            target="_blank"
                            sx={{ color: '#E4405F', borderColor: '#E4405F' }}
                          >
                            Instagram
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

export default BankDetails;
