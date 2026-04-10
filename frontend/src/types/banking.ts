/**
 * Banking Platform Types and Interfaces
 * Defines structures for Zimbabwe financial institutions data
 */

export type BankingPlatformType = 'mobile_money' | 'bank' | 'fintech';

export type ServiceCategory = 
  | 'balance_inquiry'
  | 'send_money'
  | 'buy_airtime'
  | 'pay_bills'
  | 'cash_in'
  | 'cash_out'
  | 'merchant_payment'
  | 'international_transfer'
  | 'savings'
  | 'loans';

export interface USSDCode {
  code: string;
  description: string;
  category: ServiceCategory;
  steps?: string[];
}

export interface WhatsAppBot {
  number: string;
  displayNumber: string;
  features: string[];
  available: boolean;
}

export interface WebApplication {
  name: string;
  url: string;
  type: 'web_portal' | 'mobile_app' | 'api_portal';
  features: string[];
}

export interface MobileApp {
  name: string;
  androidUrl?: string;
  iosUrl?: string;
  features: string[];
}

export interface APIIntegration {
  available: boolean;
  documentationUrl?: string;
  sandboxUrl?: string;
  authType: 'oauth2' | 'api_key' | 'basic' | 'certificate';
  features: string[];
  endpoints?: {
    name: string;
    description: string;
    method: string;
  }[];
}

export interface ContactInfo {
  customerService: string[];
  email?: string;
  website: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface BankingPlatform {
  id: string;
  name: string;
  shortName: string;
  type: BankingPlatformType;
  logo?: string;
  color: string;
  description: string;
  established?: string;
  
  // USSD Services
  ussdCodes: USSDCode[];
  mainUSSD: string;
  
  // Digital Channels
  whatsappBot?: WhatsAppBot;
  webApplications: WebApplication[];
  mobileApps: MobileApp[];
  
  // Integration
  apiIntegration: APIIntegration;
  
  // Contact
  contact: ContactInfo;
  
  // Service Fees (optional)
  fees?: {
    service: string;
    fee: string;
    notes?: string;
  }[];
  
  // Transaction Limits
  limits?: {
    daily?: string;
    monthly?: string;
    perTransaction?: string;
  };
}

export interface SelectedBank {
  platform: BankingPlatform;
  selectedServices: ServiceCategory[];
  integrationMode: 'ussd' | 'api' | 'whatsapp' | 'web';
}

/**
 * User's linked banking platform account
 */
export interface LinkedPlatformAccount {
  id: string;
  platformId: string;
  platformName: string;
  accountIdentifier: string; // Phone number or account number
  accountType: 'mobile_money' | 'bank' | 'fintech';
  isPrimary: boolean;
  linkedAt: string;
  lastBalanceCheck?: string;
  cachedBalance?: {
    amount: number;
    currency: string;
    updatedAt: string;
  };
  nickname?: string;
}

/**
 * Balance inquiry request/response
 */
export interface BalanceInquiry {
  platformId: string;
  accountIdentifier: string;
  balance: number;
  currency: string;
  availableBalance?: number;
  pendingTransactions?: number;
  lastUpdated: string;
}

/**
 * Shona/English query intent mapping
 */
export interface QueryIntent {
  intent: 'balance_inquiry' | 'send_money' | 'buy_airtime' | 'pay_bills' | 'transaction_history' | 'help';
  language: 'en' | 'sn'; // English or Shona
  platformMentioned?: string;
  amount?: number;
  recipient?: string;
  confidence: number;
}

/**
 * Common Shona phrases for banking
 */
export const SHONA_BANKING_PHRASES = {
  balance_inquiry: [
    'ndikuda kuona mari yangu',
    'ndirikuda kuona balance yangu',
    'mari yangu yakamira sei',
    'ndine mari yakawanda sei',
    'balance yangu',
    'ndionesewo mari',
    'mari iripo',
    'zvakamira sei',
    'ndirikuda kuziva mari yangu',
    'ndine mari here'
  ],
  send_money: [
    'ndikuda kutumira mari',
    'ndirikuda kusenda mari',
    'tumira mari',
    'senda mari ku',
    'ndikuda kupa mari'
  ],
  buy_airtime: [
    'ndikuda kutenga airtime',
    'ndikuda airtime',
    'tenga airtime',
    'ndirikuda data',
    'tenga data'
  ],
  pay_bills: [
    'ndikuda kubhadhara',
    'bhadhara zesa',
    'bhadhara dstv',
    'ndirikuda kubhadhara bill'
  ],
  help: [
    'ndibatsireiwo',
    'ndikuda rubatsiro',
    'handisi kunzwisisa',
    'hameno'
  ]
};

/**
 * Map platform IDs to common names in Shona
 */
export const PLATFORM_SHONA_NAMES: Record<string, string[]> = {
  ecocash: ['ecocash', 'eco', 'econet', 'mari ye econet'],
  onemoney: ['onemoney', 'one money', 'netone', 'mari ye netone'],
  telecash: ['telecash', 'telecel', 'telcel mari'],
  innbucks: ['innbucks', 'inn bucks', 'inbucks'],
  cbz: ['cbz', 'cbz bank'],
  steward: ['steward', 'steward bank'],
  stanbic: ['stanbic', 'stanbic bank'],
  nmb: ['nmb', 'nmb bank'],
  fbc: ['fbc', 'fbc bank'],
  zb: ['zb', 'zb bank'],
  cabs: ['cabs', 'building society']
};
