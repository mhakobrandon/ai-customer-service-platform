/**
 * Linked Platforms Service
 * Manages user's linked banking/mobile money accounts
 * Provides balance inquiry and account management
 */

import { LinkedPlatformAccount, BalanceInquiry, QueryIntent, SHONA_BANKING_PHRASES, PLATFORM_SHONA_NAMES } from '../types/banking';
import { getPlatformById } from '../data/bankingPlatforms';
import { bankingAPI } from './apiService';

// Storage key for linked accounts
export const LINKED_ACCOUNTS_KEY = 'user_linked_platforms';
export const LINKED_ACCOUNTS_UPDATED_EVENT = 'linked-platforms-updated';

export interface LinkedChatProvider {
  id: string;
  provider: string;
  type: 'bank' | 'mno' | 'fintech';
  displayName: string;
  accountIdentifier: string;
  isPrimary: boolean;
}

const sanitizeLinkedAccounts = (rawAccounts: unknown): LinkedPlatformAccount[] => {
  if (!Array.isArray(rawAccounts)) {
    return [];
  }

  return rawAccounts
    .filter((account): account is Record<string, unknown> => typeof account === 'object' && account !== null)
    .map((account) => ({
      id: String(account.id || ''),
      platformId: String(account.platformId || ''),
      platformName: String(account.platformName || ''),
      accountIdentifier: String(account.accountIdentifier || ''),
      accountType: (account.accountType as LinkedPlatformAccount['accountType']) || 'mobile_money',
      isPrimary: Boolean(account.isPrimary),
      linkedAt: String(account.linkedAt || new Date().toISOString()),
      lastBalanceCheck: typeof account.lastBalanceCheck === 'string' ? account.lastBalanceCheck : undefined,
      cachedBalance: account.cachedBalance && typeof account.cachedBalance === 'object'
        ? {
            amount: Number((account.cachedBalance as Record<string, unknown>).amount || 0),
            currency: String((account.cachedBalance as Record<string, unknown>).currency || 'USD'),
            updatedAt: String((account.cachedBalance as Record<string, unknown>).updatedAt || new Date().toISOString()),
          }
        : undefined,
      nickname: typeof account.nickname === 'string' && account.nickname.trim() ? account.nickname : undefined,
    }))
    .filter((account) => account.id && account.platformId && account.accountIdentifier);
};

const persistLinkedAccounts = (accounts: LinkedPlatformAccount[]) => {
  localStorage.setItem(LINKED_ACCOUNTS_KEY, JSON.stringify(accounts));
  window.dispatchEvent(new Event(LINKED_ACCOUNTS_UPDATED_EVENT));
};

const getChatProviderType = (account: LinkedPlatformAccount): LinkedChatProvider['type'] => {
  if (account.accountType === 'bank') {
    return 'bank';
  }
  if (account.accountType === 'mobile_money') {
    return 'mno';
  }
  return 'fintech';
};

const PLATFORM_PROVIDER_CODE_MAP: Record<string, string> = {
  ecocash: 'ECOCASH',
  onemoney: 'ONEMONEY',
  telecash: 'TELECASH',
  innbucks: 'INNBUCKS',
  cbz: 'CBZ',
  steward: 'STEWARD',
  stanbic: 'STANBIC',
  nmb: 'NMB',
  fbc: 'FBC',
  zb: 'ZB',
  cabs: 'CABS',
};

const buildPhoneCandidates = (rawIdentifier: string): string[] => {
  const trimmed = String(rawIdentifier || '').trim();
  if (!trimmed) {
    return [];
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  const variants = new Set<string>([trimmed]);

  if (digitsOnly) {
    variants.add(digitsOnly);
  }

  // Zimbabwe local number format helpers.
  if (digitsOnly.startsWith('0') && digitsOnly.length >= 10) {
    const international = `263${digitsOnly.slice(1)}`;
    variants.add(international);
    variants.add(`+${international}`);
  }

  if (digitsOnly.startsWith('263')) {
    variants.add(`+${digitsOnly}`);
    variants.add(`0${digitsOnly.slice(3)}`);
  }

  if (trimmed.startsWith('+') && digitsOnly.startsWith('263')) {
    variants.add(trimmed.slice(1));
  }

  return Array.from(variants);
};

/**
 * Get all linked platform accounts for current user
 */
export const getLinkedAccounts = (): LinkedPlatformAccount[] => {
  const stored = localStorage.getItem(LINKED_ACCOUNTS_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    const sanitizedAccounts = sanitizeLinkedAccounts(parsed);

    if (JSON.stringify(parsed) !== JSON.stringify(sanitizedAccounts)) {
      localStorage.setItem(LINKED_ACCOUNTS_KEY, JSON.stringify(sanitizedAccounts));
    }

    return sanitizedAccounts;
  } catch {
    return [];
  }
};

/**
 * Get primary linked account
 */
export const getPrimaryAccount = (): LinkedPlatformAccount | null => {
  const accounts = getLinkedAccounts();
  return accounts.find(a => a.isPrimary) || accounts[0] || null;
};

export const getLinkedChatProviders = (): LinkedChatProvider[] => {
  return getLinkedAccounts()
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary))
    .map((account) => {
      const platform = getPlatformById(account.platformId);
      const provider = platform?.shortName || account.platformName;

      return {
        id: account.id,
        provider,
        type: getChatProviderType(account),
        displayName: account.nickname || provider,
        accountIdentifier: account.accountIdentifier,
        isPrimary: account.isPrimary,
      };
    });
};

/**
 * Link a new platform account
 */
export const linkPlatformAccount = (account: Omit<LinkedPlatformAccount, 'id' | 'linkedAt'>): LinkedPlatformAccount => {
  const accounts = getLinkedAccounts();
  
  // Generate unique ID
  const newAccount: LinkedPlatformAccount = {
    ...account,
    id: `${account.platformId}_${Date.now()}`,
    linkedAt: new Date().toISOString(),
    // If this is the first account, make it primary
    isPrimary: accounts.length === 0 ? true : account.isPrimary
  };
  
  // If new account is primary, unset others
  if (newAccount.isPrimary) {
    accounts.forEach(a => a.isPrimary = false);
  }
  
  accounts.push(newAccount);
  persistLinkedAccounts(accounts);
  
  return newAccount;
};

/**
 * Update linked account
 */
export const updateLinkedAccount = (id: string, updates: Partial<LinkedPlatformAccount>): LinkedPlatformAccount | null => {
  const accounts = getLinkedAccounts();
  const index = accounts.findIndex(a => a.id === id);
  
  if (index === -1) return null;
  
  // If setting as primary, unset others
  if (updates.isPrimary) {
    accounts.forEach(a => a.isPrimary = false);
  }
  
  accounts[index] = { ...accounts[index], ...updates };
  persistLinkedAccounts(accounts);
  
  return accounts[index];
};

/**
 * Remove linked account
 */
export const unlinkAccount = (id: string): boolean => {
  const accounts = getLinkedAccounts();
  const filtered = accounts.filter(a => a.id !== id);
  
  // If we removed the primary, make first remaining account primary
  if (filtered.length > 0 && !filtered.some(a => a.isPrimary)) {
    filtered[0].isPrimary = true;
  }
  
  persistLinkedAccounts(filtered);
  return accounts.length !== filtered.length;
};

/**
 * Set account as primary
 */
export const setPrimaryAccount = (id: string): boolean => {
  return updateLinkedAccount(id, { isPrimary: true }) !== null;
};

/**
 * Get account balance from real data source.
 * Returns cached real values if available.
 * Live provider sync is only performed when backend/provider integration exists.
 */
export const getAccountBalance = async (
  accountId: string,
  preferredCurrency?: string,
  fallbackIdentifiers: string[] = []
): Promise<BalanceInquiry | null> => {
  const accounts = getLinkedAccounts();
  const accountIndex = accounts.findIndex(a => a.id === accountId);
  const account = accountIndex >= 0 ? accounts[accountIndex] : null;
  
  if (!account) return null;

  try {
    const providerCode = PLATFORM_PROVIDER_CODE_MAP[account.platformId];
    const candidateIdentifiers = [account.accountIdentifier, ...fallbackIdentifiers].filter(Boolean);
    const phoneCandidates = Array.from(
      new Set(candidateIdentifiers.flatMap((identifier) => buildPhoneCandidates(identifier)))
    );
    let accountsFromApi: Array<{ currency?: string; provider_code?: string; balance?: number }> = [];

    for (const phoneCandidate of phoneCandidates) {
      try {
        const response = await bankingAPI.getBalance(phoneCandidate);
        accountsFromApi = response.data?.accounts || [];
        if (accountsFromApi.length > 0) {
          break;
        }
      } catch {
        // Try next phone format candidate
      }
    }

    const normalizedPreferredCurrency = String(preferredCurrency || '').toUpperCase();
    const matchedAccount = (
      accountsFromApi.find((entry: { currency?: string }) =>
        normalizedPreferredCurrency && String(entry.currency || '').toUpperCase() === normalizedPreferredCurrency
      )
      || accountsFromApi.find((entry: { provider_code?: string }) =>
        providerCode && String(entry.provider_code || '').toUpperCase() === providerCode
      )
      || (normalizedPreferredCurrency ? undefined : accountsFromApi[0])
    );

    if (!matchedAccount) {
      throw new Error('No account balance found in mock banking API');
    }

    const refreshedBalance: BalanceInquiry = {
      platformId: account.platformId,
      accountIdentifier: account.accountIdentifier,
      balance: Number(matchedAccount.balance || 0),
      currency: String(matchedAccount.currency || 'USD'),
      lastUpdated: new Date().toISOString(),
    };

    const updatedAccounts = [...accounts];
    updatedAccounts[accountIndex] = {
      ...account,
      lastBalanceCheck: refreshedBalance.lastUpdated,
      cachedBalance: {
        amount: refreshedBalance.balance,
        currency: refreshedBalance.currency,
        updatedAt: refreshedBalance.lastUpdated,
      },
    };
    persistLinkedAccounts(updatedAccounts);

    return refreshedBalance;
  } catch (apiError) {
    if (account.cachedBalance) {
      return {
        platformId: account.platformId,
        accountIdentifier: account.accountIdentifier,
        balance: account.cachedBalance.amount,
        currency: account.cachedBalance.currency,
        lastUpdated: account.cachedBalance.updatedAt,
      };
    }
    throw apiError instanceof Error ? apiError : new Error('Failed to fetch balance');
  }
};

/**
 * Parse user query to determine intent (supports Shona and English)
 */
export const parseQueryIntent = (query: string): QueryIntent => {
  const normalizedQuery = query.toLowerCase().trim();
  let intent: QueryIntent['intent'] = 'help';
  let language: 'en' | 'sn' = 'en';
  let confidence = 0;
  let platformMentioned: string | undefined;
  
  // Check for Shona balance inquiry phrases
  for (const phrase of SHONA_BANKING_PHRASES.balance_inquiry) {
    if (normalizedQuery.includes(phrase)) {
      intent = 'balance_inquiry';
      language = 'sn';
      confidence = 0.9;
      break;
    }
  }
  
  // Check for Shona send money phrases
  if (intent === 'help') {
    for (const phrase of SHONA_BANKING_PHRASES.send_money) {
      if (normalizedQuery.includes(phrase)) {
        intent = 'send_money';
        language = 'sn';
        confidence = 0.85;
        break;
      }
    }
  }
  
  // Check for Shona airtime phrases
  if (intent === 'help') {
    for (const phrase of SHONA_BANKING_PHRASES.buy_airtime) {
      if (normalizedQuery.includes(phrase)) {
        intent = 'buy_airtime';
        language = 'sn';
        confidence = 0.85;
        break;
      }
    }
  }
  
  // Check for Shona bill payment phrases
  if (intent === 'help') {
    for (const phrase of SHONA_BANKING_PHRASES.pay_bills) {
      if (normalizedQuery.includes(phrase)) {
        intent = 'pay_bills';
        language = 'sn';
        confidence = 0.85;
        break;
      }
    }
  }
  
  // Check for English balance phrases
  if (intent === 'help') {
    const englishBalancePhrases = ['balance', 'check balance', 'my balance', 'how much', 'account balance', 'see my money'];
    for (const phrase of englishBalancePhrases) {
      if (normalizedQuery.includes(phrase)) {
        intent = 'balance_inquiry';
        language = 'en';
        confidence = 0.9;
        break;
      }
    }
  }
  
  // Check for English send money phrases
  if (intent === 'help') {
    const englishSendPhrases = ['send money', 'transfer', 'send to', 'pay someone'];
    for (const phrase of englishSendPhrases) {
      if (normalizedQuery.includes(phrase)) {
        intent = 'send_money';
        language = 'en';
        confidence = 0.85;
        break;
      }
    }
  }
  
  // Check for English airtime phrases
  if (intent === 'help') {
    const englishAirtimePhrases = ['buy airtime', 'airtime', 'recharge', 'top up', 'data bundle'];
    for (const phrase of englishAirtimePhrases) {
      if (normalizedQuery.includes(phrase)) {
        intent = 'buy_airtime';
        language = 'en';
        confidence = 0.85;
        break;
      }
    }
  }
  
  // Check for platform mentions
  for (const [platformId, names] of Object.entries(PLATFORM_SHONA_NAMES)) {
    for (const name of names) {
      if (normalizedQuery.includes(name)) {
        platformMentioned = platformId;
        confidence = Math.min(confidence + 0.05, 1);
        break;
      }
    }
    if (platformMentioned) break;
  }
  
  return {
    intent,
    language,
    platformMentioned,
    confidence
  };
};

/**
 * Generate response based on intent and language
 */
export const generateBalanceResponse = (
  balance: BalanceInquiry,
  language: 'en' | 'sn',
  platformName: string
): string => {
  const formattedBalance = `$${balance.balance.toFixed(2)}`;
  
  if (language === 'sn') {
    const responses = [
      `Mari yako ye${platformName} yakamira pa${formattedBalance} USD.`,
      `Une ${formattedBalance} mu${platformName} account yako.`,
      `Balance yako ye${platformName}: ${formattedBalance}`,
      `Ndinoona kuti une ${formattedBalance} mu${platformName}.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  const responses = [
    `Your ${platformName} balance is ${formattedBalance} USD.`,
    `You have ${formattedBalance} in your ${platformName} account.`,
    `${platformName} Balance: ${formattedBalance}`,
    `Current balance on ${platformName}: ${formattedBalance}`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

/**
 * Get platform-specific USSD code for balance check
 */
export const getBalanceUSSDCode = (platformId: string): string | null => {
  const platform = getPlatformById(platformId);
  if (!platform) return null;
  
  const balanceCode = platform.ussdCodes.find(
    u => u.category === 'balance_inquiry' && u.description.toLowerCase().includes('balance')
  );
  
  return balanceCode?.code || platform.mainUSSD;
};

/**
 * Deprecated: demo account bootstrap removed to avoid dummy balances.
 */
export const initializeDemoAccounts = (): void => {
  return;
};
