"""
Additional Training Data for Multilingual Intent Classification
Extended dataset with Zimbabwe-specific financial services examples.

Includes:
- Balance & Transaction queries
- Transaction Disputes & Reversals
- Security & PIN Issues
- Network & Connectivity
- Mobile Wallet Services (EcoCash, OneMoney, InnBucks)
- ZESA/Utilities payments
- General Services

Author: Brandon K Mhako (R223931W)
"""

ADDITIONAL_TRAINING_DATA = [
    # ============================================
    # BALANCE INQUIRY - Extended (40+ examples)
    # ============================================
    
    # English - More variations
    {"text": "What is my current account balance?", "intent": "balance_inquiry", "language": "en"},
    {"text": "How much money is in my EcoCash?", "intent": "balance_inquiry", "language": "en"},
    {"text": "Check my OneMoney balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "InnBucks balance please", "intent": "balance_inquiry", "language": "en"},
    {"text": "What's left in my wallet?", "intent": "balance_inquiry", "language": "en"},
    {"text": "Show me my mobile money balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "How much do I have in savings?", "intent": "balance_inquiry", "language": "en"},
    {"text": "Current balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "Available funds", "intent": "balance_inquiry", "language": "en"},
    {"text": "Why is my balance showing as zero?", "intent": "balance_inquiry", "language": "en"},
    {"text": "My balance seems wrong", "intent": "balance_inquiry", "language": "en"},
    {"text": "Why is my balance incorrect?", "intent": "balance_inquiry", "language": "en"},
    
    # Shona - Extended
    {"text": "Mari iri mu account mangu isvikei?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine mari yakawanda sei mu EcoCash?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Tarisa balance ye OneMoney yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "InnBucks yangu ine mari yakawanda sei?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Seisei mari yangu iri kuratidza zero?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Mari yangu yakanaka here?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndoda kuziva balance ye wallet yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Pane mari here mu account?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine marii mu EcoCash?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Balance ye savings yangu?", "intent": "balance_inquiry", "language": "sn"},
    
    # Ndebele - Extended
    {"text": "Imali eseku account yami ingakanani?", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Nginemali engakanani ku-EcoCash?", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Khangela i-balance ye OneMoney yami", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Imali yami itshengisa zero, kungani?", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Ngicela i-balance ye-wallet yami", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Imali engiyilondolozileyo ingakanani?", "intent": "balance_inquiry", "language": "nd"},
    
    # ============================================
    # TRANSACTION HISTORY - Extended (40+ examples)
    # ============================================
    
    # English
    {"text": "I need to see my last five transactions", "intent": "transaction_history", "language": "en"},
    {"text": "Show me transactions from yesterday", "intent": "transaction_history", "language": "en"},
    {"text": "How much did I spend on airtime yesterday?", "intent": "transaction_history", "language": "en"},
    {"text": "What did I buy last week?", "intent": "transaction_history", "language": "en"},
    {"text": "Send my statement to my email address", "intent": "transaction_history", "language": "en"},
    {"text": "Email me my bank statement", "intent": "transaction_history", "language": "en"},
    {"text": "I need a mini statement", "intent": "transaction_history", "language": "en"},
    {"text": "Monthly statement please", "intent": "transaction_history", "language": "en"},
    {"text": "Why is my transaction history not showing my last payment?", "intent": "transaction_history", "language": "en"},
    {"text": "Download my statement", "intent": "transaction_history", "language": "en"},
    {"text": "Print my transaction history", "intent": "transaction_history", "language": "en"},
    {"text": "What payments did I make today?", "intent": "transaction_history", "language": "en"},
    {"text": "Show me my EcoCash history", "intent": "transaction_history", "language": "en"},
    {"text": "Recent transfers", "intent": "transaction_history", "language": "en"},
    {"text": "Last 10 transactions", "intent": "transaction_history", "language": "en"},
    {"text": "last 7 days", "intent": "transaction_history", "language": "en"},
    {"text": "last 30 days", "intent": "transaction_history", "language": "en"},
    {"text": "last 60 days", "intent": "transaction_history", "language": "en"},
    {"text": "last 90 days", "intent": "transaction_history", "language": "en"},
    {"text": "7 days", "intent": "transaction_history", "language": "en"},
    {"text": "30 days", "intent": "transaction_history", "language": "en"},
    {"text": "this week", "intent": "transaction_history", "language": "en"},
    {"text": "this month", "intent": "transaction_history", "language": "en"},
    {"text": "previous month", "intent": "transaction_history", "language": "en"},
    {"text": "Statement for last week", "intent": "transaction_history", "language": "en"},
    {"text": "Statement for this month", "intent": "transaction_history", "language": "en"},
    {"text": "Transactions from last 7 days", "intent": "transaction_history", "language": "en"},
    
    # Shona
    {"text": "Ndoda kuona zvinhu zvishanu zvapedzisira kuitwa nemari yangu", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndakatenga mhepo (airtime) yemarii nezuro?", "intent": "transaction_history", "language": "sn"},
    {"text": "Tumirai statement rangu kune email yangu", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndoda mini statement", "intent": "transaction_history", "language": "sn"},
    {"text": "Seisei history yangu isiri kuratidza zvandabhadhara kwekupedzisira?", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndipeiwo statement yemwedzi uno", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndakashandisa mari yakawanda sei svondo rino?", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndoda kuona transactions dze EcoCash", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndiratidze zvandakatumira", "intent": "transaction_history", "language": "sn"},
    
    # Ndebele
    {"text": "Ngifuna ukubona izinto ezinhlanu eziyisicaba ezenziwe ngemali yami", "intent": "transaction_history", "language": "nd"},
    {"text": "Ngithenge i-airtime engakanani izolo?", "intent": "transaction_history", "language": "nd"},
    {"text": "Thumela i-statement yami ku-email yami", "intent": "transaction_history", "language": "nd"},
    {"text": "Ngicela i-mini statement", "intent": "transaction_history", "language": "nd"},
    {"text": "Ngibone i-history ye-EcoCash yami", "intent": "transaction_history", "language": "nd"},
    
    # ============================================
    # TRANSACTION DISPUTE / REVERSAL (NEW INTENT - 50+ examples)
    # ============================================
    
    # English
    {"text": "I sent money to the wrong number, please reverse it", "intent": "transaction_dispute", "language": "en"},
    {"text": "My EcoCash was debited but the merchant didn't receive it", "intent": "transaction_dispute", "language": "en"},
    {"text": "The transaction failed but my money was not returned", "intent": "transaction_dispute", "language": "en"},
    {"text": "I was overcharged for this bill payment", "intent": "transaction_dispute", "language": "en"},
    {"text": "Help! Someone withdrew money from my account without my permission", "intent": "transaction_dispute", "language": "en"},
    {"text": "Reverse this ZIPIT transaction immediately", "intent": "transaction_dispute", "language": "en"},
    {"text": "Why was I charged a double 2% IMTT tax?", "intent": "transaction_dispute", "language": "en"},
    {"text": "I need a refund for this transaction", "intent": "transaction_dispute", "language": "en"},
    {"text": "Money deducted but not received", "intent": "transaction_dispute", "language": "en"},
    {"text": "Transaction reversal request", "intent": "transaction_dispute", "language": "en"},
    {"text": "Please reverse my last transaction", "intent": "transaction_dispute", "language": "en"},
    {"text": "I was charged twice for the same transaction", "intent": "transaction_dispute", "language": "en"},
    {"text": "Wrong amount was deducted", "intent": "transaction_dispute", "language": "en"},
    {"text": "I didn't authorize this transaction", "intent": "transaction_dispute", "language": "en"},
    {"text": "Fraudulent transaction on my account", "intent": "transaction_dispute", "language": "en"},
    {"text": "Someone stole money from my account", "intent": "transaction_dispute", "language": "en"},
    {"text": "Unauthorized withdrawal", "intent": "transaction_dispute", "language": "en"},
    {"text": "Dispute this charge", "intent": "transaction_dispute", "language": "en"},
    {"text": "I tried to cash out but the agent said there is no float", "intent": "transaction_dispute", "language": "en"},
    {"text": "Agent didn't give me my money", "intent": "transaction_dispute", "language": "en"},
    {"text": "Cash out failed but money was taken", "intent": "transaction_dispute", "language": "en"},
    
    # Shona
    {"text": "Ndakatumira mari kunhamba isiyo, ndapota idzoserei", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Mari yakabviswa paEcoCash yangu asi muzvitoro havana kuiona", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Transaction yaramba asi mari yangu haina kudzoka", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Ndakabhadhariswa mari yakawandisa pa bill iri", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Rubatsiro! Pane munhu aburitsa mari mangu ndisipo", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Dzoserai mari ye ZIPIT iyi izvozvi", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Seisei ndakabhadhariswa mutero we 2% kaviri?", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Ndada kuburitsa mari asi agent ati haana float", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Agent haana kundipa mari yangu", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Mari yangu yakabviswa asi handina kuiwana", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Ndoda refund", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Reverse transaction yangu", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Ndakatumira kune wrong number", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Pane akaba mari yangu", "intent": "transaction_dispute", "language": "sn"},
    
    # Ndebele
    {"text": "Ngathumela imali enombolweni ephosidileyo, lingayibuyisela emuva?", "intent": "transaction_dispute", "language": "nd"},
    {"text": "Imali yami ayizange ibuye loba i-transaction yalele", "intent": "transaction_dispute", "language": "nd"},
    {"text": "Ngikhokhiswe kabili nge-IMTT tax", "intent": "transaction_dispute", "language": "nd"},
    {"text": "Ngicela ukubuyisela i-transaction le", "intent": "transaction_dispute", "language": "nd"},
    {"text": "Kukhona okhiphe imali yami ngaphandle kwemvumo yami", "intent": "transaction_dispute", "language": "nd"},
    {"text": "I-agent ayizange inginike imali yami", "intent": "transaction_dispute", "language": "nd"},
    {"text": "Ngifuna i-refund", "intent": "transaction_dispute", "language": "nd"},
    
    # ============================================
    # SECURITY & PIN ISSUES (NEW INTENT - 50+ examples)
    # ============================================
    
    # English
    {"text": "I forgot my secret PIN, how do I reset it?", "intent": "security_pin", "language": "en"},
    {"text": "My account is blocked after three wrong attempts", "intent": "security_pin", "language": "en"},
    {"text": "Change my daily withdrawal limit", "intent": "security_pin", "language": "en"},
    {"text": "Block my line, I lost my phone", "intent": "security_pin", "language": "en"},
    {"text": "I received a suspicious SMS asking for my OTP", "intent": "security_pin", "language": "en"},
    {"text": "How do I update my KYC documents?", "intent": "security_pin", "language": "en"},
    {"text": "I want to link my bank account to my mobile wallet", "intent": "security_pin", "language": "en"},
    {"text": "Is it safe to share my PIN with a customer agent?", "intent": "security_pin", "language": "en"},
    {"text": "My app is saying Unauthorized Access, what do I do?", "intent": "security_pin", "language": "en"},
    {"text": "Reset my PIN", "intent": "security_pin", "language": "en"},
    {"text": "Change my EcoCash PIN", "intent": "security_pin", "language": "en"},
    {"text": "I forgot my OneMoney PIN", "intent": "security_pin", "language": "en"},
    {"text": "My account has been hacked", "intent": "security_pin", "language": "en"},
    {"text": "Someone knows my PIN", "intent": "security_pin", "language": "en"},
    {"text": "I want to change my security questions", "intent": "security_pin", "language": "en"},
    {"text": "Enable two-factor authentication", "intent": "security_pin", "language": "en"},
    {"text": "Disable biometric login", "intent": "security_pin", "language": "en"},
    {"text": "My phone was stolen, block my account", "intent": "security_pin", "language": "en"},
    {"text": "I think someone is trying to access my account", "intent": "security_pin", "language": "en"},
    {"text": "Increase my transaction limit", "intent": "security_pin", "language": "en"},
    {"text": "What is my withdrawal limit?", "intent": "security_pin", "language": "en"},
    {"text": "Unblock my account", "intent": "security_pin", "language": "en"},
    {"text": "My account is locked", "intent": "security_pin", "language": "en"},
    
    # Shona
    {"text": "Ndakakanganwa PIN yangu, ndoigadzirisa sei?", "intent": "security_pin", "language": "sn"},
    {"text": "Account yangu yavharwa nekuti ndaisa PIN isiyo katatu", "intent": "security_pin", "language": "sn"},
    {"text": "Chinjai muganhu wemari yandinoburitsa pazuva", "intent": "security_pin", "language": "sn"},
    {"text": "Vharai line rangu, ndarasikirwa nefoni", "intent": "security_pin", "language": "sn"},
    {"text": "Ndagamuchira message inofungidzirwa seyehumbavha inoda OTP yangu", "intent": "security_pin", "language": "sn"},
    {"text": "Ndoisa sei mapepa angu e KYC?", "intent": "security_pin", "language": "sn"},
    {"text": "Ndoda kubatanidza bank rangu ne wallet yefoni", "intent": "security_pin", "language": "sn"},
    {"text": "Zvakachengeteka here kupa agent PIN yangu?", "intent": "security_pin", "language": "sn"},
    {"text": "App iri kuti Unauthorized Access, ndoita sei?", "intent": "security_pin", "language": "sn"},
    {"text": "Chinja PIN ye EcoCash yangu", "intent": "security_pin", "language": "sn"},
    {"text": "Ndakakanganwa PIN ye OneMoney", "intent": "security_pin", "language": "sn"},
    {"text": "Account yangu yakabatwa nehacker", "intent": "security_pin", "language": "sn"},
    {"text": "Pane anoziva PIN yangu", "intent": "security_pin", "language": "sn"},
    {"text": "Foni yangu yakabiwa, vharai account", "intent": "security_pin", "language": "sn"},
    {"text": "Ndoda kuwedzera limit yemari yandinotumira", "intent": "security_pin", "language": "sn"},
    {"text": "Vhurai account yangu", "intent": "security_pin", "language": "sn"},
    
    # Ndebele
    {"text": "Ngakhohlwa i-PIN yami, ngingayilungisa njani?", "intent": "security_pin", "language": "nd"},
    {"text": "I-account yami ivalwe ngoba ngifake i-PIN ephosidileyo kathathu", "intent": "security_pin", "language": "nd"},
    {"text": "Valani inombolo yami, ngilahlekelwe lufone lwami", "intent": "security_pin", "language": "nd"},
    {"text": "Ngamukele i-SMS emangalisayo efuna i-OTP yami", "intent": "security_pin", "language": "nd"},
    {"text": "Ngifuna ukuhlanganisa i-bank yami le-wallet ye-mobile", "intent": "security_pin", "language": "nd"},
    {"text": "Kuvikelekile ukupha i-agent i-PIN yami?", "intent": "security_pin", "language": "nd"},
    {"text": "Tshintsha i-PIN ye-EcoCash yami", "intent": "security_pin", "language": "nd"},
    {"text": "Ufone wami webiwe, vala i-account", "intent": "security_pin", "language": "nd"},
    {"text": "Vula i-account yami", "intent": "security_pin", "language": "nd"},
    
    # ============================================
    # NETWORK & CONNECTIVITY (NEW INTENT - 40+ examples)
    # ============================================
    
    # English
    {"text": "Why is the USSD code *151# not working?", "intent": "network_connectivity", "language": "en"},
    {"text": "I have no signal in the CBD area", "intent": "network_connectivity", "language": "en"},
    {"text": "My data is being used up too fast", "intent": "network_connectivity", "language": "en"},
    {"text": "How do I activate 4G/LTE on my line?", "intent": "network_connectivity", "language": "en"},
    {"text": "I bought a bundle but I can't browse the internet", "intent": "network_connectivity", "language": "en"},
    {"text": "Is the NetOne system down today?", "intent": "network_connectivity", "language": "en"},
    {"text": "I am not receiving transaction confirmation SMS", "intent": "network_connectivity", "language": "en"},
    {"text": "My SIM card is not being detected by my phone", "intent": "network_connectivity", "language": "en"},
    {"text": "How do I check my data balance?", "intent": "network_connectivity", "language": "en"},
    {"text": "My EcoCash app is crashing every time I open it", "intent": "network_connectivity", "language": "en"},
    {"text": "The app is very slow", "intent": "network_connectivity", "language": "en"},
    {"text": "USSD not responding", "intent": "network_connectivity", "language": "en"},
    {"text": "Network error when sending money", "intent": "network_connectivity", "language": "en"},
    {"text": "Connection timeout", "intent": "network_connectivity", "language": "en"},
    {"text": "Is Econet network down?", "intent": "network_connectivity", "language": "en"},
    {"text": "EcoCash is offline", "intent": "network_connectivity", "language": "en"},
    {"text": "I can't access my mobile banking app", "intent": "network_connectivity", "language": "en"},
    {"text": "App keeps logging me out", "intent": "network_connectivity", "language": "en"},
    {"text": "Server error message", "intent": "network_connectivity", "language": "en"},
    {"text": "The system is saying try again later", "intent": "network_connectivity", "language": "en"},
    
    # Shona
    {"text": "Seisei code ye *151# isiri kushanda?", "intent": "network_connectivity", "language": "sn"},
    {"text": "Handina network mu CBD", "intent": "network_connectivity", "language": "sn"},
    {"text": "Data rangu riri kupera nekukurumidza", "intent": "network_connectivity", "language": "sn"},
    {"text": "Ndoita sei kuti 4G ishande pa line rangu?", "intent": "network_connectivity", "language": "sn"},
    {"text": "Ndakatenga bundle asi handikwanise kuita browse", "intent": "network_connectivity", "language": "sn"},
    {"text": "Network ye NetOne yafa here nhasi?", "intent": "network_connectivity", "language": "sn"},
    {"text": "Handisi kuwana message (SMS) inosimbisa transaction", "intent": "network_connectivity", "language": "sn"},
    {"text": "Foni yangu haisi kuona SIM card", "intent": "network_connectivity", "language": "sn"},
    {"text": "Ndotarisa sei data rasara?", "intent": "network_connectivity", "language": "sn"},
    {"text": "App ye EcoCash iri kungozvivhara yega", "intent": "network_connectivity", "language": "sn"},
    {"text": "App iri kunonoka", "intent": "network_connectivity", "language": "sn"},
    {"text": "USSD haisi kushanda", "intent": "network_connectivity", "language": "sn"},
    {"text": "Pane network error", "intent": "network_connectivity", "language": "sn"},
    {"text": "EcoCash iri offline", "intent": "network_connectivity", "language": "sn"},
    
    # Ndebele
    {"text": "I-data yami iphela masinyane", "intent": "network_connectivity", "language": "nd"},
    {"text": "I-network ye NetOne ifile yini lamuhla?", "intent": "network_connectivity", "language": "nd"},
    {"text": "Angitholi i-SMS ye-transaction confirmation", "intent": "network_connectivity", "language": "nd"},
    {"text": "Ufone wami awuboni i-SIM card", "intent": "network_connectivity", "language": "nd"},
    {"text": "Ngingakhangela njani i-data eseleyo?", "intent": "network_connectivity", "language": "nd"},
    {"text": "I-app ye-EcoCash iyazivala yodwa", "intent": "network_connectivity", "language": "nd"},
    {"text": "I-USSD ayisebenzi", "intent": "network_connectivity", "language": "nd"},
    
    # ============================================
    # MOBILE WALLET / FEES (NEW INTENT - 40+ examples)
    # ============================================
    
    # English
    {"text": "Is there a monthly fee for this mobile wallet?", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "How much is the fee to send $100?", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "What are EcoCash transaction charges?", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "How much does it cost to cash out?", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "What is the IMTT tax rate?", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "Are there any hidden charges?", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "How much is the withdrawal fee?", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "Transfer fees to bank account", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "What are the charges for ZIPIT?", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "Bill payment fees", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "Why are the fees so high?", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "Is there a fee for checking balance?", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "Airtime purchase charges", "intent": "mobile_wallet_fees", "language": "en"},
    {"text": "Cross-network transfer fees", "intent": "mobile_wallet_fees", "language": "en"},
    
    # Shona
    {"text": "Pane mari inobviswa mwedzi wega wega pakushandisa wallet iyi?", "intent": "mobile_wallet_fees", "language": "sn"},
    {"text": "Mari yekutumira $100 isvikei?", "intent": "mobile_wallet_fees", "language": "sn"},
    {"text": "Ma charges e EcoCash akamira sei?", "intent": "mobile_wallet_fees", "language": "sn"},
    {"text": "Ndoripira marii kuburitsa mari?", "intent": "mobile_wallet_fees", "language": "sn"},
    {"text": "IMTT tax ingani?", "intent": "mobile_wallet_fees", "language": "sn"},
    {"text": "Pane ma charges akavanzika here?", "intent": "mobile_wallet_fees", "language": "sn"},
    {"text": "Fee yekuburitsa mari ingani?", "intent": "mobile_wallet_fees", "language": "sn"},
    {"text": "Ma fees ekutumira ku bank account", "intent": "mobile_wallet_fees", "language": "sn"},
    {"text": "Ma charges e ZIPIT ndeepi?", "intent": "mobile_wallet_fees", "language": "sn"},
    
    # Ndebele
    {"text": "Kukhona imali edonswayo ngenyanga nxa ngisebenzisa i-wallet le?", "intent": "mobile_wallet_fees", "language": "nd"},
    {"text": "Imali yokuthumela u-$100 ingakanani?", "intent": "mobile_wallet_fees", "language": "nd"},
    {"text": "Ama-charges e-EcoCash anjani?", "intent": "mobile_wallet_fees", "language": "nd"},
    {"text": "Kubiza malini ukukhipha imali?", "intent": "mobile_wallet_fees", "language": "nd"},
    {"text": "I-IMTT tax ingakanani?", "intent": "mobile_wallet_fees", "language": "nd"},
    
    # ============================================
    # BILL PAYMENT / UTILITIES (Extended - 40+ examples)
    # ============================================
    
    # English
    {"text": "How do I pay my ZESA tokens using this app?", "intent": "bill_payment", "language": "en"},
    {"text": "Buy ZESA electricity", "intent": "bill_payment", "language": "en"},
    {"text": "Pay my DSTV subscription", "intent": "bill_payment", "language": "en"},
    {"text": "I want to pay my water bill", "intent": "bill_payment", "language": "en"},
    {"text": "Pay NetFlix subscription", "intent": "bill_payment", "language": "en"},
    {"text": "How do I buy airtime?", "intent": "bill_payment", "language": "en"},
    {"text": "Buy Econet airtime", "intent": "bill_payment", "language": "en"},
    {"text": "Send airtime to another number", "intent": "bill_payment", "language": "en"},
    {"text": "Pay school fees", "intent": "bill_payment", "language": "en"},
    {"text": "Pay rent using mobile money", "intent": "bill_payment", "language": "en"},
    {"text": "Buy data bundles", "intent": "bill_payment", "language": "en"},
    {"text": "Pay for parking", "intent": "bill_payment", "language": "en"},
    {"text": "Municipal rates payment", "intent": "bill_payment", "language": "en"},
    {"text": "Pay TelOne bill", "intent": "bill_payment", "language": "en"},
    {"text": "ZOL internet subscription", "intent": "bill_payment", "language": "en"},
    {"text": "Pay insurance premium", "intent": "bill_payment", "language": "en"},
    {"text": "Medical aid payment", "intent": "bill_payment", "language": "en"},
    
    # Shona
    {"text": "Ndobhadhara sei ZESA ne app iyi?", "intent": "bill_payment", "language": "sn"},
    {"text": "Tenga ZESA magetsi", "intent": "bill_payment", "language": "sn"},
    {"text": "Bhadhara DSTV yangu", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndoda kubhadhara bill yemvura", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndotenga sei airtime?", "intent": "bill_payment", "language": "sn"},
    {"text": "Tenga Econet airtime", "intent": "bill_payment", "language": "sn"},
    {"text": "Tumira airtime kune imwe number", "intent": "bill_payment", "language": "sn"},
    {"text": "Bhadhara school fees", "intent": "bill_payment", "language": "sn"},
    {"text": "Bhadhara rent ne EcoCash", "intent": "bill_payment", "language": "sn"},
    {"text": "Tenga data bundles", "intent": "bill_payment", "language": "sn"},
    {"text": "Bhadhara parking", "intent": "bill_payment", "language": "sn"},
    
    # Ndebele
    {"text": "Ngibhadala njani i-ZESA nge-app le?", "intent": "bill_payment", "language": "nd"},
    {"text": "Thenga ugesi we-ZESA", "intent": "bill_payment", "language": "nd"},
    {"text": "Bhadala i-DSTV yami", "intent": "bill_payment", "language": "nd"},
    {"text": "Ngifuna ukubhadala i-bill yamanzi", "intent": "bill_payment", "language": "nd"},
    {"text": "Ngithenga njani i-airtime?", "intent": "bill_payment", "language": "nd"},
    {"text": "Thumela i-airtime kwenye inombolo", "intent": "bill_payment", "language": "nd"},
    {"text": "Bhadala i-school fees", "intent": "bill_payment", "language": "nd"},
    {"text": "Thenga ama-data bundles", "intent": "bill_payment", "language": "nd"},
    
    # ============================================
    # GENERAL SERVICES & BRANCH INFO (Extended - 40+ examples)
    # ============================================
    
    # English
    {"text": "Where is the nearest branch in Gweru?", "intent": "branch_location", "language": "en"},
    {"text": "What are the requirements for a SIM replacement?", "intent": "general_inquiry", "language": "en"},
    {"text": "How do I register for a business account?", "intent": "account_opening", "language": "en"},
    {"text": "Can I use my mobile wallet while roaming in South Africa?", "intent": "general_inquiry", "language": "en"},
    {"text": "What are the current interest rates on fixed deposits?", "intent": "general_inquiry", "language": "en"},
    {"text": "Do you offer student loans?", "intent": "loan_inquiry", "language": "en"},
    {"text": "How do I talk to a human agent?", "intent": "escalation_request", "language": "en"},
    {"text": "agent", "intent": "escalation_request", "language": "en"},
    {"text": "escalate", "intent": "escalation_request", "language": "en"},
    {"text": "human", "intent": "escalation_request", "language": "en"},
    {"text": "talk to agent", "intent": "escalation_request", "language": "en"},
    {"text": "human agent", "intent": "escalation_request", "language": "en"},
    {"text": "real person", "intent": "escalation_request", "language": "en"},
    {"text": "connect me to someone", "intent": "escalation_request", "language": "en"},
    {"text": "I need a human", "intent": "escalation_request", "language": "en"},
    {"text": "Thank you for the help", "intent": "goodbye", "language": "en"},
    {"text": "Branch hours in Harare", "intent": "branch_location", "language": "en"},
    {"text": "Nearest ATM location", "intent": "atm_location", "language": "en"},
    {"text": "Agent locations near me", "intent": "atm_location", "language": "en"},
    {"text": "Where can I cash out in Bulawayo?", "intent": "atm_location", "language": "en"},
    {"text": "Banking hours today", "intent": "branch_location", "language": "en"},
    {"text": "Is the bank open on Saturday?", "intent": "branch_location", "language": "en"},
    {"text": "Customer care number", "intent": "escalation_request", "language": "en"},
    {"text": "Speak to a manager", "intent": "escalation_request", "language": "en"},
    {"text": "I want to talk to someone", "intent": "escalation_request", "language": "en"},
    {"text": "Transfer me to a human", "intent": "escalation_request", "language": "en"},
    
    # Shona
    {"text": "Branch riri pedyo riri kupi muGweru?", "intent": "branch_location", "language": "sn"},
    {"text": "Chii chinodiwa kuti nditsive SIM card?", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndonyoresa sei account yebhizimusi?", "intent": "account_opening", "language": "sn"},
    {"text": "Ndingashandise wallet yangu ndiri ku South Africa here?", "intent": "general_inquiry", "language": "sn"},
    {"text": "Interest rate yakamira sei nhasi?", "intent": "general_inquiry", "language": "sn"},
    {"text": "Munopa zvikwereti zvevadzidzi (student loans) here?", "intent": "loan_inquiry", "language": "sn"},
    {"text": "Ndotaura sei nemunhu chaiye (agent)?", "intent": "escalation_request", "language": "sn"},
    {"text": "Mazvita nerubatsiro rwenyu", "intent": "goodbye", "language": "sn"},
    {"text": "ATM iri pedyo iri kupi?", "intent": "atm_location", "language": "sn"},
    {"text": "Agent ari kupi padyo neni?", "intent": "atm_location", "language": "sn"},
    {"text": "Ma hours ekuvhura kwe bank", "intent": "branch_location", "language": "sn"},
    {"text": "Bank inovhura here pa Saturday?", "intent": "branch_location", "language": "sn"},
    {"text": "Number ye customer care", "intent": "escalation_request", "language": "sn"},
    {"text": "Ndoda kutaura ne manager", "intent": "escalation_request", "language": "sn"},
    
    # Ndebele
    {"text": "I-branch eseduze ikuphi eGweru?", "intent": "branch_location", "language": "nd"},
    {"text": "Yini edingekayo ukutshintsha i-SIM card?", "intent": "general_inquiry", "language": "nd"},
    {"text": "Ngingabhalisa njani i-account yebhizinisi?", "intent": "account_opening", "language": "nd"},
    {"text": "Ngingasebenzisa i-wallet yami ngiyi-roaming eSouth Africa?", "intent": "general_inquiry", "language": "nd"},
    {"text": "Linika ama-student loans?", "intent": "loan_inquiry", "language": "nd"},
    {"text": "Ngingakhuluma njani lomuntu oyi-agent?", "intent": "escalation_request", "language": "nd"},
    {"text": "Ngiyabonga ngosizo lwenu", "intent": "goodbye", "language": "nd"},
    {"text": "I-ATM eseduze ikuphi?", "intent": "atm_location", "language": "nd"},
    {"text": "Ama-hours e-bank", "intent": "branch_location", "language": "nd"},
    {"text": "Ngifuna ukukhuluma lo-manager", "intent": "escalation_request", "language": "nd"},
    
    # ============================================
    # GREETINGS - Extended (30+ examples)
    # ============================================
    
    # English
    {"text": "Hello", "intent": "greeting", "language": "en"},
    {"text": "Hi", "intent": "greeting", "language": "en"},
    {"text": "Hey", "intent": "greeting", "language": "en"},
    {"text": "Good morning", "intent": "greeting", "language": "en"},
    {"text": "Good afternoon", "intent": "greeting", "language": "en"},
    {"text": "Good evening", "intent": "greeting", "language": "en"},
    {"text": "Hi there", "intent": "greeting", "language": "en"},
    {"text": "Hello there", "intent": "greeting", "language": "en"},
    {"text": "Hey there", "intent": "greeting", "language": "en"},
    {"text": "Greetings", "intent": "greeting", "language": "en"},
    {"text": "Howdy", "intent": "greeting", "language": "en"},
    {"text": "What's up", "intent": "greeting", "language": "en"},
    {"text": "Yo", "intent": "greeting", "language": "en"},
    {"text": "Hiya", "intent": "greeting", "language": "en"},
    
    # Shona
    {"text": "Mhoro", "intent": "greeting", "language": "sn"},
    {"text": "Makadii", "intent": "greeting", "language": "sn"},
    {"text": "Masikati", "intent": "greeting", "language": "sn"},
    {"text": "Mangwanani", "intent": "greeting", "language": "sn"},
    {"text": "Manheru", "intent": "greeting", "language": "sn"},
    {"text": "Mhoroi", "intent": "greeting", "language": "sn"},
    {"text": "Ndeipi", "intent": "greeting", "language": "sn"},
    {"text": "Wakadii", "intent": "greeting", "language": "sn"},
    {"text": "Ko makadii?", "intent": "greeting", "language": "sn"},
    {"text": "Tirikufarasei?", "intent": "greeting", "language": "sn"},
    
    # Ndebele
    {"text": "Sawubona", "intent": "greeting", "language": "nd"},
    {"text": "Salibonani", "intent": "greeting", "language": "nd"},
    {"text": "Livukile", "intent": "greeting", "language": "nd"},
    {"text": "Linjani", "intent": "greeting", "language": "nd"},
    {"text": "Kunjani", "intent": "greeting", "language": "nd"},
    {"text": "Yebo", "intent": "greeting", "language": "nd"},
    {"text": "Sanibonani", "intent": "greeting", "language": "nd"},
    
    # ============================================
    # GOODBYE - Extended (20+ examples)
    # ============================================
    
    # English
    {"text": "Goodbye", "intent": "goodbye", "language": "en"},
    {"text": "Bye", "intent": "goodbye", "language": "en"},
    {"text": "See you later", "intent": "goodbye", "language": "en"},
    {"text": "Thanks, bye", "intent": "goodbye", "language": "en"},
    {"text": "Thank you, goodbye", "intent": "goodbye", "language": "en"},
    {"text": "That's all, thanks", "intent": "goodbye", "language": "en"},
    {"text": "I'm done", "intent": "goodbye", "language": "en"},
    {"text": "Exit", "intent": "goodbye", "language": "en"},
    {"text": "End chat", "intent": "goodbye", "language": "en"},
    {"text": "Thanks for your help", "intent": "goodbye", "language": "en"},
    {"text": "Have a nice day", "intent": "goodbye", "language": "en"},
    {"text": "Take care", "intent": "goodbye", "language": "en"},
    
    # Shona
    {"text": "Chisarai zvakanaka", "intent": "goodbye", "language": "sn"},
    {"text": "Ndatenda", "intent": "goodbye", "language": "sn"},
    {"text": "Mazvita", "intent": "goodbye", "language": "sn"},
    {"text": "Fambai zvakanaka", "intent": "goodbye", "language": "sn"},
    {"text": "Ndapedza", "intent": "goodbye", "language": "sn"},
    {"text": "Tizonoonana", "intent": "goodbye", "language": "sn"},
    {"text": "Bye bye", "intent": "goodbye", "language": "sn"},
    
    # Ndebele
    {"text": "Sala kahle", "intent": "goodbye", "language": "nd"},
    {"text": "Hamba kahle", "intent": "goodbye", "language": "nd"},
    {"text": "Ngiyabonga", "intent": "goodbye", "language": "nd"},
    {"text": "Sobonana", "intent": "goodbye", "language": "nd"},
    {"text": "Usale kahle", "intent": "goodbye", "language": "nd"},
    
    # ============================================
    # ACCOUNT OPENING - Extended (25+ examples)
    # ============================================
    
    # English
    {"text": "How do I open a new account?", "intent": "account_opening", "language": "en"},
    {"text": "I want to register for EcoCash", "intent": "account_opening", "language": "en"},
    {"text": "Create a new account", "intent": "account_opening", "language": "en"},
    {"text": "Sign up for mobile banking", "intent": "account_opening", "language": "en"},
    {"text": "Open a savings account", "intent": "account_opening", "language": "en"},
    {"text": "Register for OneMoney", "intent": "account_opening", "language": "en"},
    {"text": "New customer registration", "intent": "account_opening", "language": "en"},
    {"text": "What documents do I need to open an account?", "intent": "account_opening", "language": "en"},
    {"text": "Requirements for new account", "intent": "account_opening", "language": "en"},
    {"text": "Open a USD account", "intent": "account_opening", "language": "en"},
    {"text": "I want a business account", "intent": "account_opening", "language": "en"},
    {"text": "Student account opening", "intent": "account_opening", "language": "en"},
    
    # Shona
    {"text": "Ndovhura sei account itsva?", "intent": "account_opening", "language": "sn"},
    {"text": "Ndoda kuregistera EcoCash", "intent": "account_opening", "language": "sn"},
    {"text": "Ndivhurire account", "intent": "account_opening", "language": "sn"},
    {"text": "Sign up ye mobile banking", "intent": "account_opening", "language": "sn"},
    {"text": "Ndoda kuvhura savings account", "intent": "account_opening", "language": "sn"},
    {"text": "Mapepa api andinoda kuvhura account?", "intent": "account_opening", "language": "sn"},
    {"text": "Requirements dzekuvhura account", "intent": "account_opening", "language": "sn"},
    
    # Ndebele
    {"text": "Ngivula njani i-account entsha?", "intent": "account_opening", "language": "nd"},
    {"text": "Ngifuna ukubhalisa i-EcoCash", "intent": "account_opening", "language": "nd"},
    {"text": "Ngivulele i-account", "intent": "account_opening", "language": "nd"},
    {"text": "Amadokhumenti adingekayo ukuvula i-account?", "intent": "account_opening", "language": "nd"},
    {"text": "Ngifuna i-account ye-savings", "intent": "account_opening", "language": "nd"},

    # ============================================
    # USER-REPORTED QUERIES - High Priority
    # ============================================

    # 1) Wrong number transfer recovery
    {"text": "I sent money to a wrong number would you help me recover my money", "intent": "transaction_dispute", "language": "en"},
    {"text": "I sent money to the wrong number and I need help recovering it", "intent": "transaction_dispute", "language": "en"},

    # 2) SIM PIN/PUK forgotten
    {"text": "I forgot my simcard pin and puk", "intent": "security_pin", "language": "en"},
    {"text": "I forgot my SIM PIN and PUK code", "intent": "security_pin", "language": "en"},

    # 3) Unknown incoming funds
    {"text": "I received funds from an unknown number", "intent": "transaction_dispute", "language": "en"},
    {"text": "I got money from a number I don't know", "intent": "transaction_dispute", "language": "en"},

    # 4) 5G activation issues
    {"text": "My line is failing to activate 5G", "intent": "network_connectivity", "language": "en"},
    {"text": "5G is not activating on my line", "intent": "network_connectivity", "language": "en"},

    # 6) EcoCash Mastercard problems
    {"text": "My EcoCash Mastercard is not working", "intent": "card_request", "language": "en"},
    {"text": "My EcoCash Mastercard keeps failing", "intent": "card_request", "language": "en"},

    # 7) Fast data depletion
    {"text": "My data is being depleted fast", "intent": "network_connectivity", "language": "en"},
    {"text": "My data bundles are finishing too quickly", "intent": "network_connectivity", "language": "en"},

    # 8) Nearest EcoCash agent/shop
    {"text": "Where is the nearest EcoCash agent or shop", "intent": "atm_location", "language": "en"},
    {"text": "Find the nearest EcoCash agent", "intent": "atm_location", "language": "en"},

    # 9) SIM replacement
    {"text": "I want a sim replacement", "intent": "security_pin", "language": "en"},
    {"text": "How do I replace my SIM card", "intent": "security_pin", "language": "en"},

    # 10) Suspicious OTP attempts
    {"text": "Someone is trying to access my line I am seeing OTP I am not sure of", "intent": "security_pin", "language": "en"},
    {"text": "I am receiving OTPs I did not request", "intent": "security_pin", "language": "en"},

    # 11) Block suspicious number/access
    {"text": "Help me block the number I don't want it to have access to my line", "intent": "security_pin", "language": "en"},
    {"text": "Please block this number from accessing my line", "intent": "security_pin", "language": "en"},

    # 12) Data purchase failure
    {"text": "I am failing to buy data it's saying error", "intent": "network_connectivity", "language": "en"},
    {"text": "I can't buy data bundle it keeps failing", "intent": "network_connectivity", "language": "en"},

    # ============================================
    # GENERAL QUERIES - Conversational English
    # ============================================
    {"text": "Can you guide me step by step", "intent": "general_inquiry", "language": "en"},
    {"text": "I need help understanding your services", "intent": "general_inquiry", "language": "en"},
    {"text": "What can you help me with right now", "intent": "general_inquiry", "language": "en"},
    {"text": "I am not sure where to start", "intent": "general_inquiry", "language": "en"},
    {"text": "Can you explain this in simple terms", "intent": "general_inquiry", "language": "en"},
    {"text": "Please assist me like a support agent", "intent": "general_inquiry", "language": "en"},
    {"text": "I need help with my account services", "intent": "general_inquiry", "language": "en"},
    {"text": "What are the available options for me", "intent": "general_inquiry", "language": "en"},
    {"text": "Can you help me fix this issue quickly", "intent": "general_inquiry", "language": "en"},
    {"text": "Please point me in the right direction", "intent": "general_inquiry", "language": "en"},
    {"text": "I need customer support now", "intent": "general_inquiry", "language": "en"},
    {"text": "Can someone help me with this request", "intent": "general_inquiry", "language": "en"},
    {"text": "What should I do next", "intent": "general_inquiry", "language": "en"},
    {"text": "Help me understand why this happened", "intent": "general_inquiry", "language": "en"},
    {"text": "I need advice on the best option", "intent": "general_inquiry", "language": "en"},

    # General queries - Shona
    {"text": "Ndapota nditungamirire nhanho nenhanho", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndinoda rubatsiro rwekunzwisisa masevhisi enyu", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndotangira papi", "intent": "general_inquiry", "language": "sn"},
    {"text": "Munganditsanangurira zviri nyore", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndibatsireiwo semunhu ari pa customer support", "intent": "general_inquiry", "language": "sn"},

    # General queries - Ndebele
    {"text": "Ngicela ungikhokhele inyathelo ngenyathelo", "intent": "general_inquiry", "language": "nd"},
    {"text": "Ngidinga usizo lokuqonda izinsizakalo zenu", "intent": "general_inquiry", "language": "nd"},
    {"text": "Ngiqale ngaphi", "intent": "general_inquiry", "language": "nd"},
    {"text": "Ungangichazela ngendlela elula", "intent": "general_inquiry", "language": "nd"},
    {"text": "Ngicela usizo njengomuntu we customer support", "intent": "general_inquiry", "language": "nd"},
]

# New intent labels to add to the model
NEW_INTENT_LABELS = [
    "transaction_dispute",
    "security_pin", 
    "network_connectivity",
    "mobile_wallet_fees",
    "branch_location",
    "escalation_request"
]
