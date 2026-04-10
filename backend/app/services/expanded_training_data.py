"""
Expanded Training Data for Multilingual Intent Classification
Contains more examples per intent for better model training.

Author: Brandon K Mhako (R223931W)
"""

EXPANDED_TRAINING_DATA = [
    # ============================================
    # BALANCE INQUIRY (30+ examples)
    # ============================================
    
    # English
    {"text": "What is my account balance?", "intent": "balance_inquiry", "language": "en"},
    {"text": "How much money do I have?", "intent": "balance_inquiry", "language": "en"},
    {"text": "Check my balance please", "intent": "balance_inquiry", "language": "en"},
    {"text": "Can you tell me my current balance?", "intent": "balance_inquiry", "language": "en"},
    {"text": "I want to know my account balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "Show me my balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "What's my available balance?", "intent": "balance_inquiry", "language": "en"},
    {"text": "Balance inquiry", "intent": "balance_inquiry", "language": "en"},
    {"text": "How much is in my account?", "intent": "balance_inquiry", "language": "en"},
    {"text": "What's my current balance?", "intent": "balance_inquiry", "language": "en"},
    {"text": "Show balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "Check balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "Account balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "What funds do I have available?", "intent": "balance_inquiry", "language": "en"},
    {"text": "Tell me my balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "How much is left in my account?", "intent": "balance_inquiry", "language": "en"},
    {"text": "I need to check my balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "What is the balance in my account?", "intent": "balance_inquiry", "language": "en"},
    {"text": "Can I see my account balance?", "intent": "balance_inquiry", "language": "en"},
    {"text": "View my balance", "intent": "balance_inquiry", "language": "en"},
    
    # Shona
    {"text": "Mari yangu yakamira sei?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine mari yakawanda sei?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndinoda kuziva mari yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Tarisa mari yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Balance yangu ndeipi?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine mari ingani?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Mari yangu yakasara ingani?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndiratidze balance yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndoda kuona mari yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndeipi mari yandine?", "intent": "balance_inquiry", "language": "sn"},
    
    # Ndebele
    {"text": "Imali yami ingakanani?", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Ngifuna ukwazi imali yami", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Khangela imali yami", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Nginemali engakanani?", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Ngitshengise imali yami", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Imali esele yami ingakanani?", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Balance yami ingakanani?", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Ngicela ukubona imali yami", "intent": "balance_inquiry", "language": "nd"},
    
    # ============================================
    # TRANSACTION HISTORY (25+ examples)
    # ============================================
    
    # English
    {"text": "Show me my recent transactions", "intent": "transaction_history", "language": "en"},
    {"text": "What are my last transactions?", "intent": "transaction_history", "language": "en"},
    {"text": "Transaction history please", "intent": "transaction_history", "language": "en"},
    {"text": "I want to see my transactions", "intent": "transaction_history", "language": "en"},
    {"text": "List my recent payments", "intent": "transaction_history", "language": "en"},
    {"text": "Show me what I spent this month", "intent": "transaction_history", "language": "en"},
    {"text": "Show transaction history", "intent": "transaction_history", "language": "en"},
    {"text": "Recent transactions", "intent": "transaction_history", "language": "en"},
    {"text": "What did I spend recently?", "intent": "transaction_history", "language": "en"},
    {"text": "Last 5 transactions", "intent": "transaction_history", "language": "en"},
    {"text": "My payment history", "intent": "transaction_history", "language": "en"},
    {"text": "Show all my transactions", "intent": "transaction_history", "language": "en"},
    {"text": "What payments have I made?", "intent": "transaction_history", "language": "en"},
    {"text": "Can I see my transaction history?", "intent": "transaction_history", "language": "en"},
    {"text": "View my transactions", "intent": "transaction_history", "language": "en"},
    {"text": "Show me my spending", "intent": "transaction_history", "language": "en"},
    
    # Shona
    {"text": "Ndipewo zvandakamboita", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndinoda kuona transactions dzangu", "intent": "transaction_history", "language": "sn"},
    {"text": "Zvandakabhadhara ndezvipi?", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndiratidze zvandakapedza", "intent": "transaction_history", "language": "sn"},
    {"text": "History yemari yangu", "intent": "transaction_history", "language": "sn"},
    {"text": "Zvandakashandisa mari", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndoda kuona transactions dzangu", "intent": "transaction_history", "language": "sn"},
    
    # Ndebele
    {"text": "Ngitshengise imisebenzi yami", "intent": "transaction_history", "language": "nd"},
    {"text": "Ngifuna ukubona i-transactions zami", "intent": "transaction_history", "language": "nd"},
    {"text": "Imisebenzi yami yangasese", "intent": "transaction_history", "language": "nd"},
    {"text": "Ngicela history yemali", "intent": "transaction_history", "language": "nd"},
    {"text": "Yini engiyikhokhele?", "intent": "transaction_history", "language": "nd"},
    
    # ============================================
    # TRANSFER MONEY (25+ examples)
    # ============================================
    
    # English
    {"text": "I want to transfer money", "intent": "transfer_money", "language": "en"},
    {"text": "Send money to another account", "intent": "transfer_money", "language": "en"},
    {"text": "How do I transfer funds?", "intent": "transfer_money", "language": "en"},
    {"text": "Transfer $100 to John", "intent": "transfer_money", "language": "en"},
    {"text": "I need to send money to my friend", "intent": "transfer_money", "language": "en"},
    {"text": "Make a transfer please", "intent": "transfer_money", "language": "en"},
    {"text": "Send money", "intent": "transfer_money", "language": "en"},
    {"text": "Transfer funds", "intent": "transfer_money", "language": "en"},
    {"text": "I want to send $50", "intent": "transfer_money", "language": "en"},
    {"text": "Wire money to another bank", "intent": "transfer_money", "language": "en"},
    {"text": "Can I transfer to another person?", "intent": "transfer_money", "language": "en"},
    {"text": "Move money to savings", "intent": "transfer_money", "language": "en"},
    {"text": "Transfer between accounts", "intent": "transfer_money", "language": "en"},
    {"text": "Send USD to my relative", "intent": "transfer_money", "language": "en"},
    {"text": "How can I send money?", "intent": "transfer_money", "language": "en"},
    
    # Shona
    {"text": "Ndinoda kutumira mari", "intent": "transfer_money", "language": "sn"},
    {"text": "Tumira mari kuna John", "intent": "transfer_money", "language": "sn"},
    {"text": "Ndingatumira mari sei?", "intent": "transfer_money", "language": "sn"},
    {"text": "Ndoda kutumira mari kuaccout yeshamwari", "intent": "transfer_money", "language": "sn"},
    {"text": "Transfer mari yangu", "intent": "transfer_money", "language": "sn"},
    {"text": "Tuma mari kuimwe account", "intent": "transfer_money", "language": "sn"},
    {"text": "Ndinoda kusenda mari", "intent": "transfer_money", "language": "sn"},
    
    # Ndebele
    {"text": "Ngifuna ukuthumela imali", "intent": "transfer_money", "language": "nd"},
    {"text": "Thumela imali ku-John", "intent": "transfer_money", "language": "nd"},
    {"text": "Ngigathumela njani imali?", "intent": "transfer_money", "language": "nd"},
    {"text": "Transfer imali yami", "intent": "transfer_money", "language": "nd"},
    {"text": "Ngicela ukuthumela imali kumngani wami", "intent": "transfer_money", "language": "nd"},
    
    # ============================================
    # PASSWORD RESET (25+ examples)
    # ============================================
    
    # English
    {"text": "I forgot my password", "intent": "password_reset", "language": "en"},
    {"text": "Reset my password please", "intent": "password_reset", "language": "en"},
    {"text": "I can't remember my password", "intent": "password_reset", "language": "en"},
    {"text": "Help me reset my password", "intent": "password_reset", "language": "en"},
    {"text": "Change my password", "intent": "password_reset", "language": "en"},
    {"text": "I need a new password", "intent": "password_reset", "language": "en"},
    {"text": "Password reset", "intent": "password_reset", "language": "en"},
    {"text": "Forgot password", "intent": "password_reset", "language": "en"},
    {"text": "How do I reset my password?", "intent": "password_reset", "language": "en"},
    {"text": "My password is not working", "intent": "password_reset", "language": "en"},
    {"text": "I want to change my password", "intent": "password_reset", "language": "en"},
    {"text": "Lost my password", "intent": "password_reset", "language": "en"},
    {"text": "Can't login, forgot password", "intent": "password_reset", "language": "en"},
    {"text": "Password change request", "intent": "password_reset", "language": "en"},
    {"text": "New password please", "intent": "password_reset", "language": "en"},
    {"text": "I don't remember my login password", "intent": "password_reset", "language": "en"},
    
    # Shona
    {"text": "Ndakanganwa password yangu", "intent": "password_reset", "language": "sn"},
    {"text": "Ndibatsireiwo kuchinja password", "intent": "password_reset", "language": "sn"},
    {"text": "Ndinoda password itsva", "intent": "password_reset", "language": "sn"},
    {"text": "Reset password yangu", "intent": "password_reset", "language": "sn"},
    {"text": "Handichayeuka password yangu", "intent": "password_reset", "language": "sn"},
    {"text": "Ndoda kuchinja password", "intent": "password_reset", "language": "sn"},
    
    # Ndebele
    {"text": "Ngilibele i-password yami", "intent": "password_reset", "language": "nd"},
    {"text": "Ngicela ukutshintsha i-password", "intent": "password_reset", "language": "nd"},
    {"text": "Ngifuna i-password entsha", "intent": "password_reset", "language": "nd"},
    {"text": "I-password yami ayisebenzi", "intent": "password_reset", "language": "nd"},
    {"text": "Ngicela ukureset i-password", "intent": "password_reset", "language": "nd"},
    
    # ============================================
    # LOAN INQUIRY (25+ examples)
    # ============================================
    
    # English
    {"text": "I want to apply for a loan", "intent": "loan_inquiry", "language": "en"},
    {"text": "What loans do you offer?", "intent": "loan_inquiry", "language": "en"},
    {"text": "Can I get a personal loan?", "intent": "loan_inquiry", "language": "en"},
    {"text": "Tell me about your loan products", "intent": "loan_inquiry", "language": "en"},
    {"text": "I need to borrow money", "intent": "loan_inquiry", "language": "en"},
    {"text": "What are your interest rates for loans?", "intent": "loan_inquiry", "language": "en"},
    {"text": "Loan application", "intent": "loan_inquiry", "language": "en"},
    {"text": "Apply for loan", "intent": "loan_inquiry", "language": "en"},
    {"text": "How much can I borrow?", "intent": "loan_inquiry", "language": "en"},
    {"text": "Personal loan inquiry", "intent": "loan_inquiry", "language": "en"},
    {"text": "I need a loan", "intent": "loan_inquiry", "language": "en"},
    {"text": "What are the loan requirements?", "intent": "loan_inquiry", "language": "en"},
    {"text": "Home loan information", "intent": "loan_inquiry", "language": "en"},
    {"text": "Car loan application", "intent": "loan_inquiry", "language": "en"},
    {"text": "Loan repayment terms", "intent": "loan_inquiry", "language": "en"},
    {"text": "How do I qualify for a loan?", "intent": "loan_inquiry", "language": "en"},
    
    # Shona
    {"text": "Ndinoda kukwereta mari", "intent": "loan_inquiry", "language": "sn"},
    {"text": "Mune maloan api?", "intent": "loan_inquiry", "language": "sn"},
    {"text": "Ndingawana chikwereti here?", "intent": "loan_inquiry", "language": "sn"},
    {"text": "Loan application ndaite sei?", "intent": "loan_inquiry", "language": "sn"},
    {"text": "Ndinoda kuborra mari", "intent": "loan_inquiry", "language": "sn"},
    {"text": "Interest rate ye loan ndeipi?", "intent": "loan_inquiry", "language": "sn"},
    
    # Ndebele
    {"text": "Ngifuna ukuboleka imali", "intent": "loan_inquiry", "language": "nd"},
    {"text": "Liliphi imalimboleko elikhona?", "intent": "loan_inquiry", "language": "nd"},
    {"text": "Ngingathola i-loan yini?", "intent": "loan_inquiry", "language": "nd"},
    {"text": "Ngifuna i-loan", "intent": "loan_inquiry", "language": "nd"},
    {"text": "Yiziphi izidingo ze-loan?", "intent": "loan_inquiry", "language": "nd"},
    
    # ============================================
    # BILL PAYMENT (25+ examples)
    # ============================================
    
    # English
    {"text": "I want to pay my bills", "intent": "bill_payment", "language": "en"},
    {"text": "Pay electricity bill", "intent": "bill_payment", "language": "en"},
    {"text": "How do I pay for utilities?", "intent": "bill_payment", "language": "en"},
    {"text": "Pay my water bill please", "intent": "bill_payment", "language": "en"},
    {"text": "I need to pay ZESA", "intent": "bill_payment", "language": "en"},
    {"text": "Bill payment", "intent": "bill_payment", "language": "en"},
    {"text": "Pay utility bills", "intent": "bill_payment", "language": "en"},
    {"text": "Pay airtime", "intent": "bill_payment", "language": "en"},
    {"text": "Buy electricity tokens", "intent": "bill_payment", "language": "en"},
    {"text": "Pay my DSTV subscription", "intent": "bill_payment", "language": "en"},
    {"text": "How can I pay my bills online?", "intent": "bill_payment", "language": "en"},
    {"text": "Pay internet bill", "intent": "bill_payment", "language": "en"},
    {"text": "Pay council rates", "intent": "bill_payment", "language": "en"},
    {"text": "Make a bill payment", "intent": "bill_payment", "language": "en"},
    {"text": "Pay school fees", "intent": "bill_payment", "language": "en"},
    
    # Shona
    {"text": "Ndinoda kubhadhara mabhiri", "intent": "bill_payment", "language": "sn"},
    {"text": "Bhadhara magetsi", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndibatsireiwo kubhadhara mvura", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndinoda kutenga magetsi", "intent": "bill_payment", "language": "sn"},
    {"text": "Pay ZESA bill", "intent": "bill_payment", "language": "sn"},
    {"text": "Kubhadhara utility bills", "intent": "bill_payment", "language": "sn"},
    
    # Ndebele
    {"text": "Ngifuna ukukhokhela izindleko", "intent": "bill_payment", "language": "nd"},
    {"text": "Khokhela ugesi", "intent": "bill_payment", "language": "nd"},
    {"text": "Ngicela ukukhokhela amanzi", "intent": "bill_payment", "language": "nd"},
    {"text": "Thenga ugesi", "intent": "bill_payment", "language": "nd"},
    {"text": "Khokhela i-DSTV", "intent": "bill_payment", "language": "nd"},
    
    # ============================================
    # MOBILE MONEY (20+ examples)
    # ============================================
    
    # English
    {"text": "Send to EcoCash", "intent": "mobile_money", "language": "en"},
    {"text": "Transfer to mobile money", "intent": "mobile_money", "language": "en"},
    {"text": "I want to cash out", "intent": "mobile_money", "language": "en"},
    {"text": "Send money to my EcoCash wallet", "intent": "mobile_money", "language": "en"},
    {"text": "OneMoney transfer", "intent": "mobile_money", "language": "en"},
    {"text": "EcoCash withdrawal", "intent": "mobile_money", "language": "en"},
    {"text": "Send to mobile wallet", "intent": "mobile_money", "language": "en"},
    {"text": "Transfer to EcoCash number", "intent": "mobile_money", "language": "en"},
    {"text": "Cash out to EcoCash", "intent": "mobile_money", "language": "en"},
    {"text": "InnBucks transfer", "intent": "mobile_money", "language": "en"},
    {"text": "Mobile money cash out", "intent": "mobile_money", "language": "en"},
    {"text": "Send to my phone number", "intent": "mobile_money", "language": "en"},
    
    # Shona
    {"text": "Tumira kuEcoCash", "intent": "mobile_money", "language": "sn"},
    {"text": "Ndinoda kutumira mari kuEcoCash", "intent": "mobile_money", "language": "sn"},
    {"text": "Cash out kuEcoCash", "intent": "mobile_money", "language": "sn"},
    {"text": "Transfer kuphone number", "intent": "mobile_money", "language": "sn"},
    {"text": "EcoCash withdrawal", "intent": "mobile_money", "language": "sn"},
    
    # Ndebele
    {"text": "Thumela ku-EcoCash", "intent": "mobile_money", "language": "nd"},
    {"text": "Ngifuna ukuthumela imali ku-EcoCash", "intent": "mobile_money", "language": "nd"},
    {"text": "Mobile money transfer", "intent": "mobile_money", "language": "nd"},
    
    # ============================================
    # ACCOUNT STATEMENT (20+ examples)
    # ============================================
    
    # English
    {"text": "I need my bank statement", "intent": "account_statement", "language": "en"},
    {"text": "Send me my statement", "intent": "account_statement", "language": "en"},
    {"text": "Can I get a mini statement?", "intent": "account_statement", "language": "en"},
    {"text": "Email my bank statement", "intent": "account_statement", "language": "en"},
    {"text": "Bank statement request", "intent": "account_statement", "language": "en"},
    {"text": "Statement of account", "intent": "account_statement", "language": "en"},
    {"text": "Get my statement", "intent": "account_statement", "language": "en"},
    {"text": "Print my bank statement", "intent": "account_statement", "language": "en"},
    {"text": "Monthly statement", "intent": "account_statement", "language": "en"},
    {"text": "Account statement for last 3 months", "intent": "account_statement", "language": "en"},
    {"text": "I need a statement for visa application", "intent": "account_statement", "language": "en"},
    {"text": "Send statement to my email", "intent": "account_statement", "language": "en"},
    
    # Shona
    {"text": "Ndinoda statement yangu", "intent": "account_statement", "language": "sn"},
    {"text": "Ndipeiwo bank statement", "intent": "account_statement", "language": "sn"},
    {"text": "Send statement kuemail yangu", "intent": "account_statement", "language": "sn"},
    {"text": "Mini statement please", "intent": "account_statement", "language": "sn"},
    
    # Ndebele
    {"text": "Ngifuna i-statement yami", "intent": "account_statement", "language": "nd"},
    {"text": "Ngicela i-bank statement", "intent": "account_statement", "language": "nd"},
    {"text": "Thumela i-statement ku-email", "intent": "account_statement", "language": "nd"},
    
    # ============================================
    # TRANSACTION DISPUTE (20+ examples)
    # ============================================
    
    # English
    {"text": "I see a wrong transaction", "intent": "transaction_dispute", "language": "en"},
    {"text": "There's an unauthorized charge", "intent": "transaction_dispute", "language": "en"},
    {"text": "I didn't make this transaction", "intent": "transaction_dispute", "language": "en"},
    {"text": "I want to dispute a charge", "intent": "transaction_dispute", "language": "en"},
    {"text": "Someone stole money from my account", "intent": "transaction_dispute", "language": "en"},
    {"text": "Fraudulent transaction", "intent": "transaction_dispute", "language": "en"},
    {"text": "Dispute a payment", "intent": "transaction_dispute", "language": "en"},
    {"text": "Wrong debit on my account", "intent": "transaction_dispute", "language": "en"},
    {"text": "Unauthorized withdrawal", "intent": "transaction_dispute", "language": "en"},
    {"text": "I didn't authorize this payment", "intent": "transaction_dispute", "language": "en"},
    {"text": "Report fraudulent activity", "intent": "transaction_dispute", "language": "en"},
    {"text": "Money deducted without my consent", "intent": "transaction_dispute", "language": "en"},
    
    # Shona
    {"text": "Pane transaction isiri yangu", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Mari yangu yabiwa", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Pane mari iri missing", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Handina kubvumira transaction iyi", "intent": "transaction_dispute", "language": "sn"},
    
    # Ndebele
    {"text": "Kukhona i-transaction engayenzi", "intent": "transaction_dispute", "language": "nd"},
    {"text": "Imali yami yebiwe", "intent": "transaction_dispute", "language": "nd"},
    {"text": "Angiyivumelanga le payment", "intent": "transaction_dispute", "language": "nd"},
    
    # ============================================
    # NEW ACCOUNT (20+ examples)
    # ============================================
    
    # English
    {"text": "I want to open a new account", "intent": "account_opening", "language": "en"},
    {"text": "How do I create an account?", "intent": "account_opening", "language": "en"},
    {"text": "Open a savings account for me", "intent": "account_opening", "language": "en"},
    {"text": "What documents do I need for a new account?", "intent": "account_opening", "language": "en"},
    {"text": "Account opening", "intent": "account_opening", "language": "en"},
    {"text": "Open new account", "intent": "account_opening", "language": "en"},
    {"text": "I want to open a current account", "intent": "account_opening", "language": "en"},
    {"text": "Requirements for new account", "intent": "account_opening", "language": "en"},
    {"text": "Create a bank account", "intent": "account_opening", "language": "en"},
    {"text": "I'm a new customer, I want to open account", "intent": "account_opening", "language": "en"},
    {"text": "What accounts do you offer?", "intent": "account_opening", "language": "en"},
    {"text": "Student account opening", "intent": "account_opening", "language": "en"},
    
    # Shona
    {"text": "Ndinoda kuvhura account", "intent": "account_opening", "language": "sn"},
    {"text": "Ndingavhura account sei?", "intent": "account_opening", "language": "sn"},
    {"text": "Ndoda kuvhura savings account", "intent": "account_opening", "language": "sn"},
    {"text": "Zvinoda chii kuvhura account?", "intent": "account_opening", "language": "sn"},
    
    # Ndebele
    {"text": "Ngifuna ukuvula i-account", "intent": "account_opening", "language": "nd"},
    {"text": "Ngingavula njani i-account?", "intent": "account_opening", "language": "nd"},
    {"text": "Yini edingekayo ukuvula i-account?", "intent": "account_opening", "language": "nd"},
    
    # ============================================
    # CARD REQUEST (20+ examples)
    # ============================================
    
    # English
    {"text": "I need a new debit card", "intent": "card_request", "language": "en"},
    {"text": "My card is lost", "intent": "card_request", "language": "en"},
    {"text": "Request a replacement card", "intent": "card_request", "language": "en"},
    {"text": "I want to apply for a credit card", "intent": "card_request", "language": "en"},
    {"text": "Block my card", "intent": "card_request", "language": "en"},
    {"text": "Card replacement", "intent": "card_request", "language": "en"},
    {"text": "New card request", "intent": "card_request", "language": "en"},
    {"text": "My card was stolen", "intent": "card_request", "language": "en"},
    {"text": "Card not working", "intent": "card_request", "language": "en"},
    {"text": "Report lost card", "intent": "card_request", "language": "en"},
    {"text": "Activate my new card", "intent": "card_request", "language": "en"},
    {"text": "Apply for Visa card", "intent": "card_request", "language": "en"},
    {"text": "My card expired, need new one", "intent": "card_request", "language": "en"},
    
    # Shona
    {"text": "Ndinoda kadhi idzva", "intent": "card_request", "language": "sn"},
    {"text": "Kadhi yangu yarasika", "intent": "card_request", "language": "sn"},
    {"text": "Block kadhi yangu", "intent": "card_request", "language": "sn"},
    {"text": "Kadhi yangu yabiwa", "intent": "card_request", "language": "sn"},
    
    # Ndebele
    {"text": "Ngifuna ikhadi elitsha", "intent": "card_request", "language": "nd"},
    {"text": "Ikhadi lami lilahlekile", "intent": "card_request", "language": "nd"},
    {"text": "Vala ikhadi lami", "intent": "card_request", "language": "nd"},
    
    # ============================================
    # ATM LOCATION (15+ examples)
    # ============================================
    
    # English
    {"text": "Where is the nearest ATM?", "intent": "atm_location", "language": "en"},
    {"text": "Find ATM near me", "intent": "atm_location", "language": "en"},
    {"text": "ATM locations in Harare", "intent": "atm_location", "language": "en"},
    {"text": "Where can I withdraw cash?", "intent": "atm_location", "language": "en"},
    {"text": "Nearest ATM location", "intent": "atm_location", "language": "en"},
    {"text": "ATM finder", "intent": "atm_location", "language": "en"},
    {"text": "Where is your branch?", "intent": "atm_location", "language": "en"},
    {"text": "Bank branch near me", "intent": "atm_location", "language": "en"},
    {"text": "ATM in Bulawayo", "intent": "atm_location", "language": "en"},
    {"text": "Locate ATM", "intent": "atm_location", "language": "en"},
    
    # Shona
    {"text": "ATM iri pedyo ndeipi?", "intent": "atm_location", "language": "sn"},
    {"text": "Ndingawana ATM kupi?", "intent": "atm_location", "language": "sn"},
    {"text": "ATM iri kupi muHarare?", "intent": "atm_location", "language": "sn"},
    
    # Ndebele
    {"text": "Iphi i-ATM eseduze?", "intent": "atm_location", "language": "nd"},
    {"text": "Ngingayithola ngaphi i-ATM?", "intent": "atm_location", "language": "nd"},
    
    # ============================================
    # GREETING (20+ examples)
    # ============================================
    
    # English
    {"text": "Hello", "intent": "greeting", "language": "en"},
    {"text": "Hi there", "intent": "greeting", "language": "en"},
    {"text": "Good morning", "intent": "greeting", "language": "en"},
    {"text": "Hey", "intent": "greeting", "language": "en"},
    {"text": "Hi", "intent": "greeting", "language": "en"},
    {"text": "Good afternoon", "intent": "greeting", "language": "en"},
    {"text": "Good evening", "intent": "greeting", "language": "en"},
    {"text": "Hello there", "intent": "greeting", "language": "en"},
    {"text": "Hey there", "intent": "greeting", "language": "en"},
    {"text": "Howdy", "intent": "greeting", "language": "en"},
    {"text": "What's up", "intent": "greeting", "language": "en"},
    {"text": "Good day", "intent": "greeting", "language": "en"},
    
    # Shona
    {"text": "Mhoro", "intent": "greeting", "language": "sn"},
    {"text": "Makadii", "intent": "greeting", "language": "sn"},
    {"text": "Masikati", "intent": "greeting", "language": "sn"},
    {"text": "Manheru", "intent": "greeting", "language": "sn"},
    {"text": "Ndeipi", "intent": "greeting", "language": "sn"},
    {"text": "Wakadii", "intent": "greeting", "language": "sn"},
    
    # Ndebele
    {"text": "Sawubona", "intent": "greeting", "language": "nd"},
    {"text": "Salibonani", "intent": "greeting", "language": "nd"},
    {"text": "Yebo", "intent": "greeting", "language": "nd"},
    {"text": "Kunjani", "intent": "greeting", "language": "nd"},
    {"text": "Unjani", "intent": "greeting", "language": "nd"},
    
    # ============================================
    # GOODBYE (20+ examples)
    # ============================================
    
    # English
    {"text": "Goodbye", "intent": "goodbye", "language": "en"},
    {"text": "Thank you, bye", "intent": "goodbye", "language": "en"},
    {"text": "That's all, thanks", "intent": "goodbye", "language": "en"},
    {"text": "See you later", "intent": "goodbye", "language": "en"},
    {"text": "Bye", "intent": "goodbye", "language": "en"},
    {"text": "Thanks, goodbye", "intent": "goodbye", "language": "en"},
    {"text": "Bye bye", "intent": "goodbye", "language": "en"},
    {"text": "Have a good day", "intent": "goodbye", "language": "en"},
    {"text": "Take care", "intent": "goodbye", "language": "en"},
    {"text": "That will be all", "intent": "goodbye", "language": "en"},
    {"text": "Thanks for your help, bye", "intent": "goodbye", "language": "en"},
    {"text": "Cheers", "intent": "goodbye", "language": "en"},
    
    # Shona
    {"text": "Chisarai zvakanaka", "intent": "goodbye", "language": "sn"},
    {"text": "Maita basa", "intent": "goodbye", "language": "sn"},
    {"text": "Ndatenda", "intent": "goodbye", "language": "sn"},
    {"text": "Fambai zvakanaka", "intent": "goodbye", "language": "sn"},
    {"text": "Ndinotenda, bye", "intent": "goodbye", "language": "sn"},
    
    # Ndebele
    {"text": "Sala kahle", "intent": "goodbye", "language": "nd"},
    {"text": "Ngiyabonga", "intent": "goodbye", "language": "nd"},
    {"text": "Hamba kahle", "intent": "goodbye", "language": "nd"},
    {"text": "Siyabonga", "intent": "goodbye", "language": "nd"},
    
    # ============================================
    # COMPLAINT (20+ examples)
    # ============================================
    
    # English
    {"text": "I want to make a complaint", "intent": "complaint", "language": "en"},
    {"text": "Your service is terrible", "intent": "complaint", "language": "en"},
    {"text": "I'm not happy with the service", "intent": "complaint", "language": "en"},
    {"text": "I need to speak to a manager", "intent": "complaint", "language": "en"},
    {"text": "This is unacceptable", "intent": "complaint", "language": "en"},
    {"text": "File a complaint", "intent": "complaint", "language": "en"},
    {"text": "I want to report a problem", "intent": "complaint", "language": "en"},
    {"text": "Poor customer service", "intent": "complaint", "language": "en"},
    {"text": "I'm very disappointed", "intent": "complaint", "language": "en"},
    {"text": "This is frustrating", "intent": "complaint", "language": "en"},
    {"text": "I've been waiting too long", "intent": "complaint", "language": "en"},
    {"text": "Your app is not working", "intent": "complaint", "language": "en"},
    {"text": "Terrible experience", "intent": "complaint", "language": "en"},
    
    # Shona
    {"text": "Handina kufara neservice yenyu", "intent": "complaint", "language": "sn"},
    {"text": "Ndinoda kutaura namanager", "intent": "complaint", "language": "sn"},
    {"text": "Service yenyu haina kunaka", "intent": "complaint", "language": "sn"},
    {"text": "Ndine complaint", "intent": "complaint", "language": "sn"},
    
    # Ndebele
    {"text": "Angithokozanga nge-service yenu", "intent": "complaint", "language": "nd"},
    {"text": "Ngifuna ukukhuluma lo-manager", "intent": "complaint", "language": "nd"},
    {"text": "Ngifuna ukubika inkinga", "intent": "complaint", "language": "nd"},
    
    # ============================================
    # GENERAL INQUIRY (25+ examples)
    # ============================================
    
    # English
    {"text": "I have a question", "intent": "general_inquiry", "language": "en"},
    {"text": "Can you help me?", "intent": "general_inquiry", "language": "en"},
    {"text": "I need some information", "intent": "general_inquiry", "language": "en"},
    {"text": "What services do you offer?", "intent": "general_inquiry", "language": "en"},
    {"text": "Help", "intent": "general_inquiry", "language": "en"},
    {"text": "I need help", "intent": "general_inquiry", "language": "en"},
    {"text": "Question", "intent": "general_inquiry", "language": "en"},
    {"text": "Information please", "intent": "general_inquiry", "language": "en"},
    {"text": "What can you do?", "intent": "general_inquiry", "language": "en"},
    {"text": "Tell me about your bank", "intent": "general_inquiry", "language": "en"},
    {"text": "What are your banking hours?", "intent": "general_inquiry", "language": "en"},
    {"text": "Contact information", "intent": "general_inquiry", "language": "en"},
    {"text": "Customer service", "intent": "general_inquiry", "language": "en"},
    {"text": "How does this work?", "intent": "general_inquiry", "language": "en"},
    
    # Shona
    {"text": "Ndinoda rubatsiro", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndine mubvunzo", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndibatsirei", "intent": "general_inquiry", "language": "sn"},
    {"text": "Munoita sei?", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndoda kunzwisisa", "intent": "general_inquiry", "language": "sn"},
    
    # Ndebele
    {"text": "Ngicela usizo", "intent": "general_inquiry", "language": "nd"},
    {"text": "Ngilombuzo", "intent": "general_inquiry", "language": "nd"},
    {"text": "Ngicela ukusizakala", "intent": "general_inquiry", "language": "nd"},
    {"text": "Lenzani?", "intent": "general_inquiry", "language": "nd"},
    
    # ============================================
    # UPDATE PROFILE (15+ examples)
    # ============================================
    
    # English
    {"text": "Update my profile", "intent": "update_profile", "language": "en"},
    {"text": "Change my phone number", "intent": "update_profile", "language": "en"},
    {"text": "Update my email address", "intent": "update_profile", "language": "en"},
    {"text": "Change my address", "intent": "update_profile", "language": "en"},
    {"text": "Edit my details", "intent": "update_profile", "language": "en"},
    {"text": "Update my information", "intent": "update_profile", "language": "en"},
    {"text": "Change my name", "intent": "update_profile", "language": "en"},
    {"text": "Modify my account details", "intent": "update_profile", "language": "en"},
    {"text": "Update contact information", "intent": "update_profile", "language": "en"},
    {"text": "Change my mobile number", "intent": "update_profile", "language": "en"},
    
    # Shona
    {"text": "Chinja phone number yangu", "intent": "update_profile", "language": "sn"},
    {"text": "Update details dzangu", "intent": "update_profile", "language": "sn"},
    {"text": "Ndinoda kuchinja email", "intent": "update_profile", "language": "sn"},
    
    # Ndebele
    {"text": "Tshintsha inombolo yami", "intent": "update_profile", "language": "nd"},
    {"text": "Update i-profile yami", "intent": "update_profile", "language": "nd"},
    
    # ============================================
    # ACCOUNT CLOSURE (15+ examples)
    # ============================================
    
    # English
    {"text": "I want to close my account", "intent": "account_closure", "language": "en"},
    {"text": "Close my bank account", "intent": "account_closure", "language": "en"},
    {"text": "How do I close my account?", "intent": "account_closure", "language": "en"},
    {"text": "Account closure request", "intent": "account_closure", "language": "en"},
    {"text": "Delete my account", "intent": "account_closure", "language": "en"},
    {"text": "Terminate my account", "intent": "account_closure", "language": "en"},
    {"text": "I want to stop banking with you", "intent": "account_closure", "language": "en"},
    {"text": "Cancel my account", "intent": "account_closure", "language": "en"},
    
    # Shona
    {"text": "Ndinoda kuvhara account yangu", "intent": "account_closure", "language": "sn"},
    {"text": "Close account yangu", "intent": "account_closure", "language": "sn"},
    
    # Ndebele
    {"text": "Ngifuna ukuvala i-account yami", "intent": "account_closure", "language": "nd"},
    {"text": "Vala i-account yami", "intent": "account_closure", "language": "nd"},
    
    # ============================================
    # EXPANDED SHONA BANKING PHRASES
    # Platform-specific balance inquiries
    # ============================================
    
    # EcoCash Balance (Shona)
    {"text": "Ndikuda kuona mari yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndirikuda kuona balance yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndionesewo mari", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Mari iripo", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Zvakamira sei", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndirikuda kuziva mari yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine mari here", "intent": "balance_inquiry", "language": "sn"},
    {"text": "EcoCash balance yangu ndeipi", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndiratidze mari ye EcoCash", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Mari yangu ye Econet yakamira sei", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Balance ye eco yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine mari ingani mu EcoCash", "intent": "balance_inquiry", "language": "sn"},
    
    # OneMoney Balance (Shona)
    {"text": "OneMoney balance yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Mari yangu ye NetOne", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine mari yakawanda sei mu OneMoney", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Tarisa OneMoney yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "One money yangu yakamira sei", "intent": "balance_inquiry", "language": "sn"},
    
    # Telecash Balance (Shona)
    {"text": "Telecash balance yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Mari yangu ye Telecel", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine mari ingani mu Telecash", "intent": "balance_inquiry", "language": "sn"},
    
    # InnBucks Balance (Shona)
    {"text": "InnBucks balance yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Mari yangu ye InnBucks yakamira sei", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine mari yakawanda sei mu InnBucks", "intent": "balance_inquiry", "language": "sn"},
    
    # Bank Balance (Shona)
    {"text": "Balance yangu ye cbz", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Mari yangu ye bank yakamira sei", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine mari ingani mu account yangu ye bank", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Steward bank balance yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Stanbic balance", "intent": "balance_inquiry", "language": "sn"},
    {"text": "NMB mari yangu", "intent": "balance_inquiry", "language": "sn"},
    
    # Send Money (Shona expanded)
    {"text": "Ndikuda kutumira mari", "intent": "transfer_money", "language": "sn"},
    {"text": "Ndirikuda kusenda mari", "intent": "transfer_money", "language": "sn"},
    {"text": "Tumira mari ku", "intent": "transfer_money", "language": "sn"},
    {"text": "Senda mari ku EcoCash", "intent": "transfer_money", "language": "sn"},
    {"text": "Ndikuda kupa munhu mari", "intent": "transfer_money", "language": "sn"},
    {"text": "Ndirikuda kusenda mari ne EcoCash", "intent": "transfer_money", "language": "sn"},
    {"text": "Tumira mari ne OneMoney", "intent": "transfer_money", "language": "sn"},
    {"text": "Senda mari ne InnBucks", "intent": "transfer_money", "language": "sn"},
    {"text": "Ndipe mari kune", "intent": "transfer_money", "language": "sn"},
    {"text": "Transfer mari ku account", "intent": "transfer_money", "language": "sn"},
    
    # Buy Airtime (Shona expanded)
    {"text": "Ndikuda kutenga airtime", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndikuda airtime", "intent": "bill_payment", "language": "sn"},
    {"text": "Tenga airtime", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndirikuda data", "intent": "bill_payment", "language": "sn"},
    {"text": "Tenga data bundles", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndipe airtime ye Econet", "intent": "bill_payment", "language": "sn"},
    {"text": "Airtime ye NetOne", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndirikuda kutenga bundle", "intent": "bill_payment", "language": "sn"},
    {"text": "Data bundle ye Telecel", "intent": "bill_payment", "language": "sn"},
    
    # Pay Bills (Shona expanded)
    {"text": "Ndikuda kubhadhara ZESA", "intent": "bill_payment", "language": "sn"},
    {"text": "Bhadhara ZESA", "intent": "bill_payment", "language": "sn"},
    {"text": "Bhadhara DSTV", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndirikuda kubhadhara bill yangu", "intent": "bill_payment", "language": "sn"},
    {"text": "Pay ZINWA", "intent": "bill_payment", "language": "sn"},
    {"text": "Bhadhara bill ye mvura", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndoda kubhadhara school fees", "intent": "bill_payment", "language": "sn"},
    {"text": "Pay bill ne EcoCash", "intent": "bill_payment", "language": "sn"},
    
    # Help/Support (Shona expanded)
    {"text": "Ndibatsireiwo", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndikuda rubatsiro", "intent": "general_inquiry", "language": "sn"},
    {"text": "Handisi kunzwisisa", "intent": "general_inquiry", "language": "sn"},
    {"text": "Hameno", "intent": "general_inquiry", "language": "sn"},
    {"text": "Zvinoshanda sei", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndidzidzisei kushandisa", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndoda kunzwa nezvemari", "intent": "general_inquiry", "language": "sn"},
    
    # Cash Out (Shona)
    {"text": "Ndikuda kubuda ne mari", "intent": "transfer_money", "language": "sn"},
    {"text": "Cash out mari yangu", "intent": "transfer_money", "language": "sn"},
    {"text": "Ndirikuda kutora mari", "intent": "transfer_money", "language": "sn"},
    {"text": "Ndipe mari cash", "intent": "transfer_money", "language": "sn"},
    {"text": "Withdraw mari ye EcoCash", "intent": "transfer_money", "language": "sn"},
    
    # Transaction Status (Shona)
    {"text": "Mari yangu yasvika here", "intent": "transaction_history", "language": "sn"},
    {"text": "Transaction yangu yakafamba sei", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndirikuda kuziva kana mari yasvika", "intent": "transaction_history", "language": "sn"},
    {"text": "Check transaction status", "intent": "transaction_history", "language": "sn"},
    
    # Complaints (Shona)
    {"text": "Ndine dambudziko", "intent": "complaint", "language": "sn"},
    {"text": "Mari yangu yabiwa", "intent": "complaint", "language": "sn"},
    {"text": "Transaction yangu haisi kuoneka", "intent": "complaint", "language": "sn"},
    {"text": "Pane problem ne account yangu", "intent": "complaint", "language": "sn"},
    {"text": "Mari yangu haina kusvika", "intent": "complaint", "language": "sn"},
    {"text": "Ndakabatwa mari isiri yangu", "intent": "complaint", "language": "sn"},
    {"text": "Reversal request", "intent": "complaint", "language": "sn"},
    {"text": "Ndoda mari yangu back", "intent": "complaint", "language": "sn"},
]
