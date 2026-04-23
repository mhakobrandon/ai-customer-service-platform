/**
 * Banking Platforms Page
 * Main page for viewing and selecting banking platforms
 * Postilion-style interface for financial institution management
 */

import React, { useState } from 'react';
import {
  Box,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import BankSelection from './BankSelection';
import BankDetails from './BankDetails';
import { BankingPlatform } from '../../types/banking';
import AdminPageChrome from '../admin/AdminPageChrome';

const BankingPage: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<BankingPlatform | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectPlatform = (platform: BankingPlatform) => {
    setSelectedPlatform(platform);
  };

  const handleBack = () => {
    setSelectedPlatform(null);
  };

  const topActions = selectedPlatform ? (
    <button type="button" className="btn" onClick={handleBack}>
      <BackIcon sx={{ fontSize: 12 }} /> All Platforms
    </button>
  ) : undefined;

  return (
    <AdminPageChrome
      activePage="banking"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search banking platforms by name, USSD code, or service..."
      topActions={topActions}
    >
      <Box sx={{ p: { xs: 0.75, md: 1.25 } }}>
        {selectedPlatform ? (
          <BankDetails platform={selectedPlatform} onBack={handleBack} />
        ) : (
          <BankSelection
            onSelect={handleSelectPlatform}
            selectedPlatformId={undefined}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        )}
      </Box>
    </AdminPageChrome>
  );
};

export default BankingPage;
