"""
Comprehensive Response Templates for Zimbabwe Financial Services Chatbot
Multi-language support: English (en), Shona (sn), Ndebele (nd)

Author: Brandon K Mhako (R223931W)

This module provides detailed, helpful response templates for all 23 intents
with Zimbabwe-specific financial information including:
- EcoCash mobile money
- ZIPIT transfers
- IMTT tax regulations
- Local banking services
- Multi-language support (English, Shona, Ndebele)
"""

# Comprehensive Response Templates - Enhanced for Zimbabwe Financial Services
RESPONSE_TEMPLATES = {
    "balance_inquiry": {
        "en": """💰 **Account Balance Information**

Your current account balance is **{balance}**.

📊 **Quick Summary:**
• Last transaction: {last_transaction}
• Available balance: {balance}
• Pending transactions: None

🔍 **Need more details?**
• Type "statement" for full account statement
• Type "history" for recent transactions
• Dial *151*2# for EcoCash balance""",
        
        "sn": """💰 **Ruzivo rweMari Yako**

Mari yako iripo ndi **{balance}**.

📊 **Mufananidzo Mupfupi:**
• Chiitiko chekupedzisira: {last_transaction}
• Mari iripo: {balance}
• Zvichiri kumirira: Hakuna

🔍 **Unoda Zvimwe?**
• Nyora "statement" kuti uwane ruzivo rwese
• Nyora "history" kuti uone zvawakamboita
• Daira *151*2# kuwana balance yeEcoCash""",
        
        "nd": """💰 **Ulwazi Lwemali Yakho**

Ibhalansi yakho yamanje ngu **{balance}**.

📊 **Isifinyezo Esisheshayo:**
• Okwenzeke ekugcineni: {last_transaction}
• Ibhalansi etholakalayo: {balance}
• Imisebenzi elindile: Ayikho

🔍 **Udinga Okwengeziwe?**
• Bhala "statement" ukuthola isitatimende
• Bhala "history" ukubona umlando
• Shaya *151*2# ukuthola ibhalansi ye-EcoCash"""
    },
    
    "transaction_history": {
        "en": """📜 **Recent Transaction History**

Here are your last 5 transactions:

{transactions}

📊 **Summary Statistics:**
• Total credits this month: {credits}
• Total debits this month: {debits}
• Most frequent transaction type: {frequent_type}

💡 **Tip:** You can request a detailed statement by saying "account statement" or visiting any branch.""",
        
        "sn": """📜 **Zvakaitika Kwenguva Pfupi**

Nazi zviitiko zvako zvekupedzisira 5:

{transactions}

📊 **Mafungiro:**
• Mari yakauya mwedzi uno: {credits}
• Mari yakabuda mwedzi uno: {debits}
• Chiitiko chinonyanya kuitwa: {frequent_type}

💡 **Zano:** Unogona kukumbira statement yakadzama nokuti "account statement" kana kuenda ku branch.""",
        
        "nd": """📜 **Umlando Wakamuva**

Nazi imisebenzi yakho yokugcina emi-5:

{transactions}

📊 **Izibalo Ezifingqiwe:**
• Okufakiwe kwale nyanga: {credits}
• Okukhishiwe kwale nyanga: {debits}
• Uhlobo lomsebenzi olwenzeka kaningi: {frequent_type}

💡 **Icebiso:** Ungacela isitatimende ngokusho "account statement" noma ngokuhamba ku-branch."""
    },
    
    "transfer_money": {
        "en": """💸 **Money Transfer Options**

I can help you transfer money. Choose your preferred method:

Reply with:
1 = Internal Transfer
2 = EcoCash Transfer
3 = ZIPIT Transfer
4 = RTGS Transfer

🏦 **Internal Transfer** (Between own accounts)
• Instant and FREE

📱 **EcoCash Transfer**
• Fee: 1-2% of amount
• IMTT Tax: 2% on amounts over $10
• Dial *151# or use the app

🔄 **ZIPIT Transfer** (To other banks)
• Fee: $2 flat rate
• Processing: Instant (same day)

💵 **RTGS Transfer** (Large amounts)
• For amounts over $10,000
• Processing: 1-2 business days

**To proceed, please provide:**
1. Recipient account/phone number
2. Amount to transfer
3. Your PIN for confirmation""",
        
        "sn": """💸 **Nzira Dzekutumira Mari**

Ndinogona kukubatsira kutumira mari. Sarudza nzira yaunoda:

Pindura ne:
1 = Internal Transfer
2 = EcoCash Transfer
3 = ZIPIT Transfer
4 = RTGS Transfer

🏦 **Kutumira Mukati** (Pakati pe-accounts dzako)
• Pakarepo uye HAPANA MURIPO

📱 **EcoCash Transfer**
• Muripo: 1-2% yemari
• IMTT Tax: 2% pa mari inopfuura $10
• Daira *151# kana shandisa app

🔄 **ZIPIT Transfer** (Kune mamwe mabangi)
• Muripo: $2
• Kuita: Pakarepo (zuva rimwe)

💵 **RTGS Transfer** (Mari yakawanda)
• Kana iri pamusoro pe $10,000
• Kuita: Mazuva 1-2

**Kuti tipfuurire, tipa:**
1. Nhamba yemunhu wauchatumira
2. Mari yaunoda kutumira
3. PIN yako kuti tisimbise""",
        
        "nd": """💸 **Izindlela Zokuthumela Imali**

Ngingakusiza ukuthumela imali. Khetha indlela oyithandayo:

Phendula ngo:
1 = Internal Transfer
2 = EcoCash Transfer
3 = ZIPIT Transfer
4 = RTGS Transfer

🏦 **Ukuthumela Kwangaphakathi** (Phakathi kwama-account akho)
• Ngokushesha MAHHALA

📱 **EcoCash Transfer**
• Imali: 1-2% yenani
• IMTT Tax: 2% emaliini edlula u-$10
• Shaya *151# noma sebenzisa i-app

🔄 **ZIPIT Transfer** (Kwamanye amabhange)
• Imali: $2
• Ukwenzeka: Ngokushesha (ngosuku olufanayo)

💵 **RTGS Transfer** (Izinani ezinkulu)
• Kwizinani ezingaphezu kuka-$10,000
• Ukwenzeka: Izinsuku ezi-1-2

**Ukuqhubeka, sicela unikeze:**
1. I-account/inombolo yocingo yomtholi
2. Inani ozolithumela
3. I-PIN yakho ukuqinisekisa"""
    },
    
    "account_statement": {
        "en": """📄 **Account Statement Request**

I'll generate your account statement. Please choose a period:

📅 **Available Options:**
1. Last 7 days
2. Last 30 days
3. Last 60 days
4. Last 90 days
5. Custom period (specify dates)

📧 **Delivery Options:**
• Email: We'll send to your registered email
• Download: Available as PDF
• Branch: Collect printed copy

💡 **Tip:** Mini-statements are available 24/7 via:
• Dial *151*4# for EcoCash statement
• Internet banking portal
• Mobile banking app

Please reply with your preferred option (e.g., "30 days" or "custom")""",
        
        "sn": """📄 **Kukumbira Statement**

Ndichakugadzirira statement yako. Ndapota sarudza nguva:

📅 **Zvinowanikwa:**
1. Mazuva 7 akapfuura
2. Mazuva 30 akapfuura
3. Mazuva 60 akapfuura
4. Mazuva 90 akapfuura
5. Nguva yako (tipa mazuva)

📧 **Nzira Dzekutumira:**
• Email: Tichatumira ku email yako
• Download: Sezve PDF
• Branch: Tora yakabve kudhindwa

💡 **Zano:** Mini-statements dzinowanikwa 24/7 pa:
• Daira *151*4# kuti uwane EcoCash statement
• Internet banking
• Mobile app

Ndapota pindura nezvauri kusarudza (e.g., "30 days" kana "custom")""",
        
        "nd": """📄 **Isicelo Sesitatimende**

Ngizokukhiqizela isitatimende sakho. Sicela ukhethe isikhathi:

📅 **Izinketho Ezitholakalayo:**
1. Izinsuku ezi-7 ezedlule
2. Izinsuku ezingu-30 ezedlule
3. Izinsuku ezingu-60 ezedlule
4. Izinsuku ezingu-90 ezedlule
5. Isikhathi esihleliwe (cacisa izinsuku)

📧 **Izindlela Zokuthunyelwa:**
• I-imeyili: Sizothumela ku-imeyili yakho ebhalisile
• Ukulanda: Itholakalayo njengo-PDF
• I-Branch: Thatha ikhophi edindwe

💡 **Icebiso:** Ama-mini-statements ayatholakala ngaso sonke isikhathi ngo:
• Shaya *151*4# ukuthola isitatimende se-EcoCash
• I-portal ye-internet banking
• I-app ye-mobile banking

Sicela uphendule ngokhetho lwakho (isib., "30 days" noma "custom")"""
    },
    
    "password_reset": {
        "en": """🔐 **Password Reset Assistance**

For your security, I'll guide you through the password reset process.

⚠️ **Important Security Notice:**
Never share your password or OTP with anyone, including bank staff.

📱 **Self-Service Options:**
1. **Mobile App:** Settings > Security > Reset Password
2. **Internet Banking:** Login page > "Forgot Password"
3. **USSD:** Dial *151*0# > Security Options

🏦 **If you need in-person assistance:**
Visit any branch with:
• Your National ID
• Your registered phone

🔒 **Security Tips:**
• Use a strong password (min 8 characters)
• Include numbers and special characters
• Don't reuse passwords from other sites

Please confirm your identity:
• What is your registered phone number?""",
        
        "sn": """🔐 **Kubatsirwa Kuchinja Password**

Nekuda kwekuchengetedzwa kwako, ndichakuratidza nzira yekuchinja password.

⚠️ **Zvakakosha Pamusoro peKuchengetedzwa:**
Usapa munhu password yako kana OTP, kunyangwe vashandi vebangi.

📱 **Nzira Dzekuzviitira Wega:**
1. **Mobile App:** Settings > Security > Reset Password
2. **Internet Banking:** Login page > "Ndakanganwa Password"
3. **USSD:** Daira *151*0# > Security Options

🏦 **Kana uchida rubatsiro kwete pa internet:**
Enda ku branch uine:
• National ID yako
• Foni yako yakanyoreswa

🔒 **Mazano eKuchengetedzwa:**
• Shandisa password yakasimba (mavara 8 panyanya)
• Isa manhamba nezviratidzo
• Usashandisazve password dzimwe

Ndapota simbisa kuti ndiwe:
• Nhamba yefoni yako yakanyoreswa ndeipi?""",
        
        "nd": """🔐 **Usizo Lokusethulela kabusha i-Password**

Ngokuphepha kwakho, ngizokuqondisa enqubweni yokusethela kabusha i-password.

⚠️ **Isaziso Esibalulekile Sokuphepha:**
Ungayiniki muntu i-password yakho noma i-OTP, kuhlanganise nabasebenzi bebhange.

📱 **Izinketho Zokuzisiza:**
1. **Mobile App:** Settings > Security > Reset Password
2. **Internet Banking:** Ikhasi lokungena > "Ngikhohlwe i-Password"
3. **USSD:** Shaya *151*0# > Security Options

🏦 **Uma udinga usizo ngobuqu:**
Hamba kunoma yiliphi igatsha uno:
• I-ID yakho yeNational
• Ucingo lwakho olubhalisile

🔒 **Amacebo Okuphepha:**
• Sebenzisa i-password eqinile (okungenani izinhlamvu ezi-8)
• Faka izinombolo nezinhlamvu ezikhethekile
• Ungayiphindi i-password yakwezinye izingxoxo

Sicela uqinisekise ubuwena:
• Iyiphi inombolo yakho yocingo ebhalisile?"""
    },
    
    "loan_inquiry": {
        "en": """💵 **Loan Products Information**

We offer various loan products tailored to your needs:

🏠 **Personal Loan**
• Amount: $500 - $50,000
• Interest: 12-18% per annum
• Term: 6-60 months
• Requires: 3 months salary slips

🚗 **Asset Finance/Vehicle Loan**
• Amount: Up to $100,000
• Interest: 10-15% per annum
• Term: 12-72 months
• Deposit: 10-30% required

🏢 **SME Business Loan**
• Amount: $1,000 - $200,000
• Interest: 15-22% per annum
• Term: 6-36 months
• Requires: Business registration

📱 **EcoCash Loans (Instant)**
• Amount: $10 - $1,000
• Approval: Instant based on wallet activity
• Dial *151*3# to check eligibility

**Based on your account history, you may qualify for:**
{loan_eligibility}

Would you like to apply for a specific loan?""",
        
        "sn": """💵 **Ruzivo Rwemikwereti**

Tinopa mhando dzakasiyana dzemikwereti dzakaitirwa iwe:

🏠 **Chikwereti Chako**
• Mari: $500 - $50,000
• Interest: 12-18% pagore
• Nguva: Mwedzi 6-60
• Unoda: Mapayslip emwedzi 3

🚗 **Motokari/Asset Finance**
• Mari: Kusvika $100,000
• Interest: 10-15% pagore
• Nguva: Mwedzi 12-72
• Deposit: 10-30% inodikanwa

🏢 **Chikwereti Chebusiness (SME)**
• Mari: $1,000 - $200,000
• Interest: 15-22% pagore
• Nguva: Mwedzi 6-36
• Unoda: Business registration

📱 **EcoCash Loans (Pakarepo)**
• Mari: $10 - $1,000
• Kupihwa: Pakarepo zvichienderana nemauyiriro
• Daira *151*3# kuona kana uchikodzera

**Zvichienderana neaccount yako, unogona kuwana:**
{loan_eligibility}

Unoda kukumbira chikwereti chakaiti?""",
        
        "nd": """💵 **Ulwazi Ngemalimboleko**

Sinikezela ngemikhiqizo yemalimboleko eyahlukahlukene eyenzelwe wena:

🏠 **Isikweletu Somuntu Siqu**
• Inani: $500 - $50,000
• Inzalo: 12-18% ngonyaka
• Isikhathi: Izinyanga ezi-6-60
• Kudingeka: Ama-payslip ezinyanga ezi-3

🚗 **Asset Finance/Imali Yemoto**
• Inani: Kuze kufike ku-$100,000
• Inzalo: 10-15% ngonyaka
• Isikhathi: Izinyanga ezi-12-72
• Idiphozi: 10-30% iyadingeka

🏢 **Isikweletu Sebhizinisi (SME)**
• Inani: $1,000 - $200,000
• Inzalo: 15-22% ngonyaka
• Isikhathi: Izinyanga ezi-6-36
• Kudingeka: Ukubhaliswa kwebhizinisi

📱 **Imalimboleko ye-EcoCash (Ngokushesha)**
• Inani: $10 - $1,000
• Ukugunyazwa: Ngokushesha ngokusekelwe kumsebenzi we-wallet
• Shaya *151*3# ukuhlola ukufaneleka

**Ngokusekelwe emlandweni we-akhawunti yakho, ungafaneleka:**
{loan_eligibility}

Ungathanda ukufaka isicelo semalimboleko ethile?"""
    },
    
    "bill_payment": {
        "en": """💡 **Bill Payment Services**

I can help you pay your bills. Choose a service:

Reply with:
1 = Electricity (ZESA)
2 = Water
3 = Internet

⚡ **ZESA Prepaid Electricity**
• Dial *151*1# or use EcoCash
• Instant token delivery via SMS
• Minimum purchase: $1

💧 **ZINWA Water**
• Pay via EcoCash or Internet Banking
• Reference: Your meter number

📺 **DStv/GOtv**
• Dial *151*1# > Subscriptions
• Auto-renewal available

📱 **Airtime Top-up**
• Dial *151*1# > Airtime
• For Econet, NetOne, Telecel

🏫 **School Fees**
• Available for partner schools
• Reference: Student ID

📶 **Internet (TelOne, ZOL)**
• Pay via EcoCash or bank transfer

**To pay now, tell me:**
1. Service type (e.g., ZESA)
2. Account/Meter number
3. Amount to pay""",
        
        "sn": """💡 **Kubhadhara Mabhiri**

Ndinogona kukubatsira kubhadhara mabhiri. Sarudza service:

Pindura ne:
1 = Magetsi (ZESA)
2 = Mvura
3 = Internet

⚡ **ZESA Prepaid Electricity**
• Daira *151*1# kana shandisa EcoCash
• Token inotumirwa neSMS pakarepo
• Chinogona kubhadharwa: $1

💧 **ZINWA Water**
• Bhadhara ne EcoCash kana Internet Banking
• Reference: Nhamba yemeter yako

📺 **DStv/GOtv**
• Daira *151*1# > Subscriptions
• Auto-renewal iripo

📱 **Airtime Top-up**
• Daira *151*1# > Airtime
• Ye Econet, NetOne, Telecel

🏫 **School Fees**
• Inowanikwa kuzvikoro zvatakabatana nazvo
• Reference: Student ID

📶 **Internet (TelOne, ZOL)**
• Bhadhara ne EcoCash kana bank transfer

**Kubhadhara izvozvi, ndiudze:**
1. Service yaurikuda (e.g., ZESA)
2. Account/Meter number
3. Mari yaunoda kubhadhara""",
        
        "nd": """💡 **Izinsizakalo Zokukhokha Izindleko**

Ngingakusiza ukukhokha izindleko zakho. Khetha isevisi:

Phendula ngo:
1 = Ugesi (ZESA)
2 = Amanzi
3 = I-Internet

⚡ **ZESA Prepaid Electricity**
• Shaya *151*1# noma sebenzisa i-EcoCash
• Ithokeni idluliselwa nge-SMS ngokushesha
• Ukuthenga okuncane: $1

💧 **ZINWA Water**
• Khokha nge-EcoCash noma Internet Banking
• Ireferensi: Inombolo yakho ye-meter

📺 **DStv/GOtv**
• Shaya *151*1# > Subscriptions
• Ukuvuselelwa okuzenzakalelayo kuyatholakala

📱 **Airtime Top-up**
• Shaya *151*1# > Airtime
• Ye-Econet, NetOne, Telecel

🏫 **Izimali Zesikole**
• Ziyatholakala ezikoleni eziyizibambiqhaza
• Ireferensi: I-ID Yomfundi

📶 **I-Internet (TelOne, ZOL)**
• Khokha nge-EcoCash noma ngokudlulisa ibhange

**Ukukhokha manje, ngitshele:**
1. Uhlobo lwesevisi (isib., ZESA)
2. Inombolo ye-Account/Meter
3. Inani ozolibhadala"""
    },
    
    "mobile_money": {
        "en": """📱 **Mobile Money Services (EcoCash)**

I can help you with EcoCash transactions. What would you like to do?

💸 **Send Money**
• To EcoCash: *151*1*{number}*{amount}#
• Fee: 1-2% of amount
• IMTT Tax: 2% on amounts over $10

💵 **Cash Out**
• At Agent: *151*3*{agent_code}*{amount}#
• Fee: 2-3% of amount
• ATM: Available at selected ATMs

💳 **EcoCash Save**
• Transfer to savings: *151*6#
• Earn interest on your savings

📊 **Check Balance**
• Dial *151*2# (FREE)

📜 **Mini Statement**
• Dial *151*4# for last 5 transactions

⚙️ **Other Services**
• *151*5# - Change PIN
• *151*7# - Buy Airtime
• *151*0# - Main Menu

**Current fees structure:**
| Amount | Send Fee | IMTT Tax |
|--------|----------|----------|
| $1-$10 | 1% | None |
| $11-$50 | 1.5% | 2% |
| $51+ | 2% | 2% |""",
        
        "sn": """📱 **EcoCash Services**

Ndinogona kukubatsira neEcoCash. Chii chaunoda kuita?

💸 **Tumira Mari**
• Ku EcoCash: *151*1*{nhamba}*{mari}#
• Muripo: 1-2% yemari
• IMTT Tax: 2% pamari inopfuura $10

💵 **Budisa Mari (Cash Out)**
• Ku Agent: *151*3*{agent_code}*{mari}#
• Muripo: 2-3% yemari
• ATM: Inowanikwa kuma ATM akasarudzwa

💳 **EcoCash Save**
• Tumira kusavings: *151*6#
• Wana interest pa savings yako

📊 **Tarisa Balance**
• Daira *151*2# (MAHARA)

📜 **Mini Statement**
• Daira *151*4# kuti uwane zviitiko 5

⚙️ **Zvimwe**
• *151*5# - Chinja PIN
• *151*7# - Tenga Airtime
• *151*0# - Main Menu

**Ma fees azvino:**
| Mari | Fee Yekutumira | IMTT Tax |
|------|----------------|----------|
| $1-$10 | 1% | Hakuna |
| $11-$50 | 1.5% | 2% |
| $51+ | 2% | 2% |""",
        
        "nd": """📱 **Izinsizakalo ze-EcoCash**

Ngingakusiza ngokuthengiselana nge-EcoCash. Yini ongathanda ukuyenza?

💸 **Thumela Imali**
• Ku-EcoCash: *151*1*{inombolo}*{inani}#
• Imali yokuthumela: 1-2% yenani
• I-IMTT Tax: 2% emaniini edlula u-$10

💵 **Khipha Imali (Cash Out)**
• Ku-Agent: *151*3*{agent_code}*{inani}#
• Imali: 2-3% yenani
• I-ATM: Iyatholakala kuma-ATM akhethiwe

💳 **EcoCash Save**
• Dlulisela ku-savings: *151*6#
• Thola inzalo ku-savings yakho

📊 **Hlola Ibhalansi**
• Shaya *151*2# (MAHHALA)

📜 **I-Mini Statement**
• Shaya *151*4# ukuthola imisebenzi emi-5

⚙️ **Ezinye Izinsizakalo**
• *151*5# - Shintsha i-PIN
• *151*7# - Thenga i-Airtime
• *151*0# - Imenyu Eyinhloko

**Isakhiwo samanje semali:**
| Inani | Imali Yokuthumela | I-IMTT Tax |
|-------|-------------------|------------|
| $1-$10 | 1% | Ayikho |
| $11-$50 | 1.5% | 2% |
| $51+ | 2% | 2% |"""
    },
    
    "transaction_dispute": {
        "en": """⚠️ **Transaction Dispute/Reversal**

I understand you want to dispute a transaction. I'm here to help.

📋 **Information Required:**
1. Transaction date
2. Amount
3. Reference/Confirmation number
4. Transaction type (EcoCash, ZIPIT, etc.)
5. Brief description of the issue

⏰ **Processing Times:**
• EcoCash Reversals: 24-48 hours
• ZIPIT Disputes: 3-5 business days
• Card transactions: 7-14 business days
• International: 30-45 days

📞 **For Urgent Disputes:**
• EcoCash: Call 114 or visit nearest agent
• Bank: Visit any branch with your ID
• WhatsApp: +263 78 222 4444

⚠️ **Important Notes:**
• Reversals only possible if recipient hasn't withdrawn
• Wrong number transfers: We'll contact the recipient
• Fraud suspected: Account will be temporarily secured

Please provide the transaction details to proceed.""",
        
        "sn": """⚠️ **Kupikisa Transaction/Kudzosera Mari**

Ndinonzwisisa kuti unoda kupikisa transaction. Ndiri pano kukubatsira.

📋 **Ruzivo Runodikanwa:**
1. Zuva rechitiko
2. Mari
3. Nhamba yereferensi
4. Mhando yechitiko (EcoCash, ZIPIT, zvimwe)
5. Tsananguro pfupi yedambudziko

⏰ **Nguva Yekuita:**
• EcoCash Reversals: Maawa 24-48
• ZIPIT Disputes: Mazuva 3-5 ebhizinesi
• Card transactions: Mazuva 7-14
• International: Mazuva 30-45

📞 **Kana Uchida Rubatsiro Nekukurumidza:**
• EcoCash: Fona 114 kana enda ku agent
• Bank: Enda ku branch uine ID yako
• WhatsApp: +263 78 222 4444

⚠️ **Zvakakosha:**
• Kudzosera kunogoneka chete kana asina kuburitsa mari
• Nhamba isiri iyo: Tichabata munhu akaitumirwa
• Kuba kunotyiwa: Account ichavharwa kwenguva pfupi

Ndapota tipa ruzivo rwechitiko kuti tipfuurire.""",
        
        "nd": """⚠️ **Ukuphikisa Umsebenzi/Ukubuyisela Emuva**

Ngiyaqonda ukuthi ufuna ukuphikisa umsebenzi. Ngilapha ukukusiza.

📋 **Ulwazi Oludingekayo:**
1. Usuku lomsebenzi
2. Inani
3. Inombolo yereferensi
4. Uhlobo lomsebenzi (EcoCash, ZIPIT, njalonjalo)
5. Incazelo emfushane yenkinga

⏰ **Izikhathi Zokwenza:**
• Ukubuyisela Emuva kwe-EcoCash: Amahora angu-24-48
• Ukuphikisa i-ZIPIT: Izinsuku ezi-3-5 zebhizinisi
• Imisebenzi yekhadi: Izinsuku ezi-7-14
• Emazweni angaphandle: Izinsuku ezingu-30-45

📞 **Ukuphikisa Okwesphuthuma:**
• EcoCash: Shaya u-114 noma hamba ku-agent
• Ibhange: Hamba kunoma yiliphi igatsha une-ID yakho
• WhatsApp: +263 78 222 4444

⚠️ **Amanothi Abalulekile:**
• Ukubuyisela emuva kungenzeka kuphela uma umtholi engayikhiphanga
• Ukuthunyelelwa kunombolo okungeyiyo: Sizoxhumana nomtholi
• Kusolwa ukukhwabanisa: I-akhawunti izovikelwa okwesikhashana

Sicela unikeze imininingwane yomsebenzi ukuze uqhubeke."""
    },
    
    "security_pin": {
        "en": """🔐 **Security & PIN Services**

I can help you with security-related matters.

🔢 **PIN Management:**
• **Reset PIN:** Dial *151*5# and follow prompts
• **Change PIN:** *151*0# > Security > Change PIN
• **Forgot PIN:** Visit any agent with your ID

🚫 **Block/Unblock Account:**
• **Emergency Block:** Call 114 immediately
• **Block via USSD:** *151*0# > Security > Block
• **Unblock:** Visit branch or call customer care

🛡️ **Security Tips:**
• NEVER share your PIN with anyone
• Change PIN every 3 months
• Don't use birthdays as PIN
• Report suspicious activity immediately

📱 **Two-Factor Authentication:**
• Enable OTP for all transactions
• Register for SMS alerts
• Use the mobile app for extra security

⚠️ **If you suspect fraud:**
1. Call 114 immediately
2. Block your account
3. Visit nearest branch with ID
4. File a police report

How can I help you with your security needs?""",
        
        "sn": """🔐 **Security & PIN Services**

Ndinogona kukubatsira nenyaya dzekuchengetedzwa.

🔢 **PIN Management:**
• **Reset PIN:** Daira *151*5# utevere mashoko
• **Chinja PIN:** *151*0# > Security > Change PIN
• **Wakanganwa PIN:** Enda ku agent uine ID yako

🚫 **Vhara/Vhura Account:**
• **Kuvhara nekukurumidza:** Fona 114 pakarepo
• **Vhara pa USSD:** *151*0# > Security > Block
• **Vhura:** Enda ku branch kana fona customer care

🛡️ **Mazano ekuChengetedzwa:**
• USAPA munhu PIN yako
• Chinja PIN mwedzi mitatu oga oga
• Usashandise zuva rekuzvarwa sePIN
• Ripotera zvinotyisa pakarepo

📱 **Two-Factor Authentication:**
• Ita kuti OTP ishande pa transactions dzese
• Nyoresa SMS alerts
• Shandisa mobile app kuti uchengetedzeke

⚠️ **Kana uchityira kuba:**
1. Fona 114 pakarepo
2. Vhara account yako
3. Enda ku branch iri pedyo nayo uine ID
4. Ita police report

Ndingakubatsira sei nezvinhu zvekuchengetedzwa kwako?""",
        
        "nd": """🔐 **Ukuphepha & Izinsizakalo ze-PIN**

Ngingakusiza ngezindaba eziphathelene nokuphepha.

🔢 **Ukuphathwa kwe-PIN:**
• **Sethela i-PIN kabusha:** Shaya *151*5# ulandele imikhondo
• **Shintsha i-PIN:** *151*0# > Security > Change PIN
• **Ukhohlwe i-PIN:** Hamba kunoma yimuphi u-agent une-ID yakho

🚫 **Vimba/Vula i-Account:**
• **Ukuvimbela okwesphuthuma:** Shaya u-114 ngokushesha
• **Vimba nge-USSD:** *151*0# > Security > Block
• **Vula:** Vakashela igatsha noma ushaye i-customer care

🛡️ **Amacebo Okuphepha:**
• UNGAYINIKI muntu i-PIN yakho
• Shintsha i-PIN njalo ezinyangeni ezi-3
• Ungasebenzisi usuku lokuzalwa njengo-PIN
• Bika umsebenzi osongela ngokushesha

📱 **Ukufakazela Ngezigaba Ezimbili:**
• Vumela i-OTP kuyo yonke imisebenzi
• Bhalisa ama-SMS alerts
• Sebenzisa i-mobile app ukuze uthola ukuphepha okwengeziwe

⚠️ **Uma usola ukukhwabanisa:**
1. Shaya u-114 ngokushesha
2. Vimba i-akhawunti yakho
3. Hamba egatsheni eliseduze une-ID
4. Faka umbiko wamaphoyisa

Ngingakusiza kanjani ngezidingo zakho zokuphepha?"""
    },
    
    "network_connectivity": {
        "en": """📶 **Network & Connectivity Issues**

I understand you're experiencing network problems. Let me help troubleshoot.

🔧 **Quick Fixes:**
1. **Toggle Airplane Mode:** Turn on, wait 10 seconds, turn off
2. **Restart Phone:** Hold power button for 10 seconds
3. **Check SIM:** Remove and reinsert SIM card
4. **Network Selection:** Settings > Network > Select manually

📱 **USSD Not Working?**
• Clear dialer cache
• Try removing special characters
• Dial during off-peak hours (early morning)

🌐 **Data/Internet Issues:**
• Check data bundle balance: *143#
• Reset APN settings
• Contact 114 for data activation

📞 **Call Issues:**
• Check airtime balance: *100#
• Ensure VoLTE is disabled if having issues
• Try different location (signal strength)

🏢 **Known Network Maintenance:**
• Scheduled maintenance usually occurs 2-4 AM
• Check Econet social media for outage info

📞 **Still having issues?**
• Call Econet: 114 (free from Econet)
• WhatsApp: +263 78 222 4444
• Visit nearest Econet shop

Which specific issue are you experiencing?""",
        
        "sn": """📶 **Matambudziko e Network**

Ndinonzwisisa kuti uri kusangana nematambudziko e network. Rega ndikubatsire.

🔧 **Kugadzirisa Nekukurumidza:**
1. **Airplane Mode:** Isa, mira masekonzi 10, bvisa
2. **Restart Foni:** Bata power button masekonzi 10
3. **Tarisa SIM:** Bvisa uise zvakare SIM card
4. **Network Selection:** Settings > Network > Select manually

📱 **USSD Haisi Kushanda?**
• Clear dialer cache
• Edza kubvisa special characters
• Daira nguva isati yamuka vamwe (mangwanani)

🌐 **Data/Internet Issues:**
• Tarisa data bundle: *143#
• Reset APN settings
• Fona 114 kuti vavhure data

📞 **Kufona Kusina Kushanda:**
• Tarisa airtime: *100#
• Dzima VoLTE kana uine matambudziko
• Edza kumwe (signal)

🏢 **Network Maintenance:**
• Maintenance inoitwa 2-4 AM
• Tarisa Econet social media kuti uzive

📞 **Uchari kuita?**
• Fona Econet: 114 (mahara kubva pa Econet)
• WhatsApp: +263 78 222 4444
• Enda ku Econet shop iri pedyo

Ndirwo rudzii dambudziko rauinaro?""",
        
        "nd": """📶 **I-Network & Izinkinga Zokuxhumanisa**

Ngiyaqonda ukuthi ubhekene nezinkinga ze-network. Ake ngikusize ukulungisa.

🔧 **Ukuqondisa Okusheshayo:**
1. **I-Airplane Mode:** Yivule, linda imizuzwana eyi-10, uyivale
2. **Qalisa kabusha Ifoni:** Bamba inkinobho yamandla imizuzwana eyi-10
3. **Hlola i-SIM:** Yikhiphe bese uyifaka futhi i-SIM card
4. **Ukukhetha i-Network:** Settings > Network > Select manually

📱 **I-USSD Ayisebenzi?**
• Sula i-cache ye-dialer
• Zama ukususa izinhlamvu ezikhethekile
• Shaya ngesikhathi esingamatashe (ekuseni kakhulu)

🌐 **I-Data/Internet:**
• Hlola ibhalansi ye-data bundle: *143#
• Sethela kabusha izilungiselelo ze-APN
• Xhumana no-114 ukuvula i-data

📞 **Izinkinga Zokushaya:**
• Hlola ibhalansi ye-airtime: *100#
• Qinisekisa ukuthi i-VoLTE ivaliwe uma unezinkinga
• Zama indawo ehlukile (amandla e-signal)

🏢 **Ukulungiswa kwe-Network Okuziwa:**
• Ukulungiswa okuhleliwe kwenzeka ngo-2-4 ekuseni
• Hlola i-social media ye-Econet mayelana nolwazi lokucisha

📞 **Usanezinkinga?**
• Shaya u-Econet: 114 (mahhala u-Econet)
• WhatsApp: +263 78 222 4444
• Hamba esitolo se-Econet esiseduze

Yinkinga ethile eni obhekene nayo?"""
    },
    
    "mobile_wallet_fees": {
        "en": """💰 **EcoCash & Mobile Wallet Fees**

Here's a complete breakdown of current fees and taxes:

📊 **Sending Money (Send to Another EcoCash)**
| Amount | Fee | IMTT Tax |
|--------|-----|----------|
| $1-$5 | Free | None |
| $5.01-$10 | 1% | None |
| $10.01-$50 | 1.5% | 2% |
| $50.01-$100 | 2% | 2% |
| $100+ | 2.5% | 2% |

💵 **Cash Out Fees (Agent Withdrawal)**
| Amount | Fee |
|--------|-----|
| $1-$20 | $0.50 |
| $20.01-$50 | $1.00 |
| $50.01-$100 | $1.50 |
| $100.01-$200 | $2.00 |
| $200+ | 1.5% |

💳 **ZIPIT Transfer Fees**
• Flat fee: $2.00
• Instant transfer to any bank

📱 **Other Charges**
• Balance check: Free
• Mini statement: Free
• Merchant payment: Free
• Bill payment: Service-specific

⚠️ **IMTT Tax (2%):**
• Applies to amounts over $10
• Collected by ZIMRA
• Exemptions: Salaries, pensions

Need more specific information?""",
        
        "sn": """💰 **Ma Fee e EcoCash & Mobile Wallet**

Heino rondedzero yakazara yema fees nezvimwe:

📊 **Kutumira Mari (Ku EcoCash Imwe)**
| Mari | Fee | IMTT Tax |
|------|-----|----------|
| $1-$5 | Mahara | Hakuna |
| $5.01-$10 | 1% | Hakuna |
| $10.01-$50 | 1.5% | 2% |
| $50.01-$100 | 2% | 2% |
| $100+ | 2.5% | 2% |

💵 **Ma Fee ekuburitsa (Cash Out ku Agent)**
| Mari | Fee |
|------|-----|
| $1-$20 | $0.50 |
| $20.01-$50 | $1.00 |
| $50.01-$100 | $1.50 |
| $100.01-$200 | $2.00 |
| $200+ | 1.5% |

💳 **ZIPIT Transfer Fees**
• Fee: $2.00
• Kutumira pakarepo ku bank dzese

📱 **Zvimwe**
• Kutarisa balance: Mahara
• Mini statement: Mahara
• Merchant payment: Mahara
• Bill payment: Zvinoenderana ne service

⚠️ **IMTT Tax (2%):**
• Inoshanda pa mari inopfuura $10
• Inotorwa na ZIMRA
• Haishande pa: Mishahara, pensions

Unoda ruzivo rwakawedzerwa?""",
        
        "nd": """💰 **Ama-Fee we-EcoCash & Mobile Wallet**

Nansi ukwehlukaniswa okuphelele kwama-fee amanje nezintela:

📊 **Ukuthumela Imali (Ku-EcoCash Enye)**
| Inani | Imali | I-IMTT Tax |
|-------|-------|------------|
| $1-$5 | Mahhala | Ayikho |
| $5.01-$10 | 1% | Ayikho |
| $10.01-$50 | 1.5% | 2% |
| $50.01-$100 | 2% | 2% |
| $100+ | 2.5% | 2% |

💵 **Ama-Fee Okukhipha (Ukukhipha ku-Agent)**
| Inani | Imali |
|-------|-------|
| $1-$20 | $0.50 |
| $20.01-$50 | $1.00 |
| $50.01-$100 | $1.50 |
| $100.01-$200 | $2.00 |
| $200+ | 1.5% |

💳 **Ama-Fee we-ZIPIT Transfer**
• Imali ehlangene: $2.00
• Ukudluliswa ngokushesha kunoma yiliphi ibhange

📱 **Ezinye Izindleko**
• Ukuhlola ibhalansi: Mahhala
• I-Mini statement: Mahhala
• Ukukhokha komthengisi: Mahhala
• Ukukhokha izindleko: Kusekelwe kusevisi

⚠️ **I-IMTT Tax (2%):**
• Isebenza ezinaniini ezingaphezu kuka-$10
• Iqoqwa yi-ZIMRA
• Okukhululiwe: Amaholo, izimpesheni

Udinga ulwazi oluthe xaxa?"""
    },
    
    "greeting": {
        "en": """👋 **Hello! Welcome to our AI Customer Service**

I'm here to help you with:

💰 Account & Balance inquiries
💸 Money transfers (EcoCash, ZIPIT)
📄 Statements & Transaction history
💡 Bill payments (ZESA, DStv, etc.)
🔐 Security & PIN issues
💵 Loan information
❓ General banking questions

**Quick Commands:**
• "balance" - Check your balance
• "send money" - Transfer funds
• "statement" - Get account statement
• "help" - See all options

I support **English**, **Shona**, and **Ndebele**.

How can I assist you today?""",
        
        "sn": """👋 **Mhoro! Titambire ku AI Customer Service**

Ndiri pano kukubatsira ne:

💰 Account & Balance
💸 Kutumira mari (EcoCash, ZIPIT)
📄 Statements & Zvakaitika
💡 Kubhadhara mabhiri (ZESA, DStv, zvimwe)
🔐 Security & PIN
💵 Ruzivo rwemikwereti
❓ Mibvunzo yebangi

**Quick Commands:**
• "balance" - Tarisa mari yako
• "tumira mari" - Tumira mari
• "statement" - Wana statement
• "rubatsiro" - Ona zvese

Ndinonzwisisa **English**, **Shona**, uye **Ndebele**.

Ndingakubatsira sei nhasi?""",
        
        "nd": """👋 **Sawubona! Wamkelekile ku-AI Customer Service**

Ngilapha ukukusiza nge:

💰 I-Account & Ibhalansi
💸 Ukuthumela imali (EcoCash, ZIPIT)
📄 Izitatimende & Umlando
💡 Ukukhokha izindleko (ZESA, DStv, njalonjalo)
🔐 Ukuphepha & I-PIN
💵 Ulwazi ngemalimboleko
❓ Imibuzo yebhange ejwayelekile

**Imiyalo Esheshayo:**
• "balance" - Hlola ibhalansi yakho
• "thumela imali" - Dlulisela izimali
• "statement" - Thola isitatimende
• "usizo" - Bona zonke izinketho

Ngisekela **English**, **Shona**, no-**Ndebele**.

Ngingakusiza kanjani namhlanje?"""
    },
    
    "goodbye": {
        "en": """👋 **Thank you for chatting with us!**

Before you go:
📝 Your conversation reference: #{reference_id}
📞 Need more help? Call 114 (24/7)
📱 WhatsApp: +263 78 222 4444
🏦 Visit any branch for in-person assistance

💡 **Quick Tips:**
• Download our mobile app for easy banking
• Enable SMS alerts for transaction notifications
• Check our website for latest updates

We appreciate your feedback! Rate this conversation:
⭐⭐⭐⭐⭐

Have a wonderful day! 🌟""",
        
        "sn": """👋 **Maita basa nekutaura nesu!**

Usati waenda:
📝 Reference yekutaura kwako: #{reference_id}
📞 Unoda rubatsiro? Fona 114 (24/7)
📱 WhatsApp: +263 78 222 4444
🏦 Enda ku branch kana uchida kubatsirwa

💡 **Mazano:**
• Dhawunirodha mobile app yedu
• Vhura SMS alerts kuti uzive zviitiko
• Tarisa website yedu kuti uzive zvitsva

Tinokoshesa maonero ako! Tipe rating:
⭐⭐⭐⭐⭐

Chisarai zvakanaka! 🌟""",
        
        "nd": """👋 **Siyabonga ngokuxoxa nathi!**

Ngaphambi kokuthi uhambe:
📝 Ireferensi yengxoxo yakho: #{reference_id}
📞 Udinga usizo olwengeziwe? Shaya 114 (24/7)
📱 WhatsApp: +263 78 222 4444
🏦 Hamba kunoma yiliphi igatsha ukuthola usizo ngobuqu

💡 **Amacebo Asheshayo:**
• Landa i-mobile app yethu ukuze kubhange kalula
• Vumela ama-SMS alerts ukuze waziswe ngemisebenzi
• Hlola iwebhusayithi yethu ukuthola izibuyekezo zakamuva

Siyayazisa impendulo yakho! Linganisa le ngxoxo:
⭐⭐⭐⭐⭐

Ube nosuku oluhle! 🌟"""
    },
    
    "complaint": {
        "en": """😔 **We're Sorry to Hear That**

I understand you're facing an issue, and I want to help resolve it.

📝 **To process your complaint, please provide:**
1. Brief description of the issue
2. Date/time it occurred
3. Transaction reference (if applicable)
4. Your preferred contact number

⏰ **Response Times:**
• Standard complaints: 24-48 hours
• Urgent matters: 4-8 hours
• Fraud/Security: Immediate escalation

📞 **For immediate assistance:**
• Call: 114 (24/7 helpline)
• WhatsApp: +263 78 222 4444
• Email: complaints@bank.co.zw
• Visit: Any branch

🎯 **Our Commitment:**
• Every complaint gets a reference number
• We'll keep you updated via SMS
• Resolution target: 5 working days

Please provide the details above and we'll register your complaint with a reference number immediately.""",
        
        "sn": """😔 **Tinozvidemba Kuzvinzwa**

Ndinonzwisisa kuti uri kusangana nedambudziko, uye ndinoda kukubatsira kurigadzirisa.

📝 **Kuti tigadzirise gunun'una rako, ndapota tipa:**
1. Tsananguro pfupi yedambudziko
2. Zuva/nguva zvakaitika
3. Reference yechitiko (kana iripo)
4. Nhamba yefoni yaunoda

⏰ **Nguva Yekupindura:**
• Maguun'un'a akajairika: Maawa 24-48
• Nyaya dzinokurumidza: Maawa 4-8
• Kuba/Security: Kuendeswa pakarepo

📞 **Rubatsiro rwekukurumidza:**
• Fona: 114 (24/7)
• WhatsApp: +263 78 222 4444
• Email: complaints@bank.co.zw
• Enda: Ku branch

🎯 **Vimbiso Yedu:**
• Gunun'una rega rega rinowana reference number
• Tichakuudza neSMS
• Target yekugadzirisa: Mazuva 5

Ndapota tipa ruzivo rwakanyorwa pamusoro uye tichanyora gunun'una rako nepaBCO nekubva reference number pakarepo.""",
        
        "nd": """😔 **Sixolisa Ukuzwa Lokho**

Ngiyaqonda ukuthi ubhekene nenkinga, futhi ngifuna ukusiza ukuyixazulula.

📝 **Ukucubungula isikhalazo sakho, sicela unikeze:**
1. Incazelo emfushane yenkinga
2. Usuku/isikhathi kwenzeka
3. Ireferensi yomsebenzi (uma isebenza)
4. Inombolo yakho yocingo oyithandayo

⏰ **Izikhathi Zokuphendula:**
• Izikhalazo ezijwayelekile: Amahora angu-24-48
• Izindaba eziphuthumayo: Amahora ayi-4-8
• Ukukhwabanisa/Ukuphepha: Ukudlulisela ngokushesha

📞 **Usizo olusheshayo:**
• Shaya: 114 (umugqa wokusiza 24/7)
• WhatsApp: +263 78 222 4444
• I-imeyili: complaints@bank.co.zw
• Vakashela: Noma yiliphi igatsha

🎯 **Ukuzibophezela Kwethu:**
• Zonke izikhalazo zithola inombolo yereferensi
• Sizokugcina wazi nge-SMS
• Okuhlosiwe ukuxazululwa: Izinsuku zokusebenza ezi-5

Sicela unikeze imininingwane engenhla bese sizoqopha isikhalazo sakho sinike inombolo yokureferensi ngokushesha."""
    },

    "complaint_received": {
        "en": """✅ **Complaint Registered**

Thank you for providing those details. We've logged your complaint.

📋 **Your Complaint Reference:** **{complaint_ref}**

⏰ **What Happens Next:**
• A specialist will review your case within 4-8 hours
• You'll receive an SMS confirmation shortly
• Resolution target: 5 working days

📞 **For urgent follow-up:**
• Call: 114 (24/7 helpline) and quote your reference **{complaint_ref}**
• Email: complaints@bank.co.zw

We apologise for the inconvenience and will work to resolve this promptly.""",

        "sn": """✅ **Gunun'una Ranyorwa**

Mazvita nekupa ruzivo urwu. Takanyora gunun'una rako.

📋 **Reference Yako:** **{complaint_ref}**

⏰ **Zvinotevera:**
• Mutauri achiona nyaya yako mumaawa 4-8
• Uchagamuchira SMS yekusimbisa munguva pfupi
• Target yekugadzirisa: Mazuva mashanu ekushanda

📞 **Kudaidzira nekukurumidza:**
• Fona: 114 (24/7) uchipa reference **{complaint_ref}**
• Email: complaints@bank.co.zw

Tinozvidemba pamusoro pematambudziko uye tichashanda kugadzirisa munguva pfupi.""",

        "nd": """✅ **Isikhalazo Sibalisiwe**

Siyabonga ngokunnikeza lezo zinkulumo. Sibalise isikhalazo sakho.

📋 **Inombolo Yakho Yereferensi:** **{complaint_ref}**

⏰ **Okuza Ngemuva:**
• Ingcweti izohlola icala lakho phakathi kwamahora ayi-4-8
• Uzothola i-SMS yokuqinisekisa maduze
• Okuhlosiwe ukuxazululwa: Izinsuku zokusebenza ezi-5

📞 **Ukuphuthuma:**
• Shaya: 114 (24/7) uquote ireferensi **{complaint_ref}**
• I-imeyili: complaints@bank.co.zw

Sixolisa ngohlupho futhi sizoqeda ukuxazulula ngokushesha."""
    },

    "dispute_details": {
        "en": """✅ **Dispute Case Logged**

Thank you for providing those details. We've registered your dispute.

📋 **Your Case Reference:** **{complaint_ref}**

⏰ **Resolution Timeline:**
• EcoCash Reversals: 24-48 hours
• ZIPIT Disputes: 3-5 business days
• Card Transactions: 7-14 business days

📞 **For urgent follow-up:**
• Call: 114 (24/7) and quote reference **{complaint_ref}**
• WhatsApp: +263 78 222 4444

We will investigate and keep you updated via SMS.""",

        "sn": """✅ **Nyaya Yekupikisa Yanyorwa**

Mazvita nekupa ruzivo urwu. Takanyora kupikisa kwako.

📋 **Nhamba Yenyaya Yako:** **{complaint_ref}**

⏰ **Nguva Yekugadzirisa:**
• EcoCash Reversals: Maawa 24-48
• ZIPIT Disputes: Mazuva 3-5 ebhizinesi
• Card Transactions: Mazuva 7-14 ebhizinesi

📞 **Kutevera kwekukurumidza:**
• Fona: 114 (24/7) uchipa reference **{complaint_ref}**
• WhatsApp: +263 78 222 4444

Tichaongorora uye tichakuudza neSMS.""",

        "nd": """✅ **Icala Lokuphikisa Libalisiwe**

Siyabonga ngokunnikeza lezo zinkulumo. Sibalise isikhalazo sakho sokuphikisa.

📋 **Inombolo Yecala Lakho:** **{complaint_ref}**

⏰ **Isikhathi Sokuxazulula:**
• I-EcoCash Reversals: Amahora angu-24-48
• I-ZIPIT Disputes: Izinsuku ezingu-3-5 zokusebenza
• Izingisetho zekhadi: Izinsuku ezingu-7-14 zokusebenza

📞 **Ukuphuthuma:**
• Shaya: 114 (24/7) uquote ireferensi **{complaint_ref}**
• WhatsApp: +263 78 222 4444

Sizophenywa sikugcine wazi nge-SMS."""
    },

    "branch_location": {
        "en": """🏦 **Branch & Agent Locations**

I can help you find the nearest branch or EcoCash agent.

**Please tell me your location:**
• City/Town name, or
• Suburb/Area name

📍 **Major Cities with Branches:**
• Harare: 15+ branches
• Bulawayo: 8 branches
• Mutare: 4 branches
• Gweru: 3 branches
• Masvingo: 2 branches

⏰ **Banking Hours:**
• Monday-Friday: 8:00 AM - 4:00 PM
• Saturday: 8:00 AM - 12:00 PM
• Sunday: Closed

📱 **24/7 Services:**
• ATMs (available at all branches)
• EcoCash agents (check *151*0# for nearest)
• Mobile & Internet Banking

🔍 **To find specific locations:**
1. Visit our website: www.bank.co.zw/branches
2. Use the mobile app "Branch Finder"
3. Dial *151*0# > Agent Locator

Which area should I search for you?""",
        
        "sn": """🏦 **Branch & Agent Locations**

Ndinogona kukubatsira kuwana branch kana EcoCash agent iri pedyo.

**Ndapota ndiudze kwaunenge uri:**
• Zita reguta/taundi, kana
• Zita renzvimbo

📍 **Maguta Makuru Ane Branch:**
• Harare: 15+ branches
• Bulawayo: 8 branches
• Mutare: 4 branches
• Gweru: 3 branches
• Masvingo: 2 branches

⏰ **Nguva Dzekushanda:**
• Muvhuro-Chishanu: 8:00 AM - 4:00 PM
• Mugovera: 8:00 AM - 12:00 PM
• Svondo: Closed

📱 **Services Dzinoita 24/7:**
• ATMs (dziripo ku branches dzese)
• EcoCash agents (tarisa *151*0# yeiripo pedyo)
• Mobile & Internet Banking

🔍 **Kutsvaga locations:**
1. Enda pa website: www.bank.co.zw/branches
2. Shandisa mobile app "Branch Finder"
3. Daira *151*0# > Agent Locator

Ndokutsvagira kupi?""",
        
        "nd": """🏦 **Izindawo zeBranch & Agent**

Ngingakusiza ukuthola igatsha eliseduze noma i-agent ye-EcoCash.

**Sicela ungitshele indawo yakho:**
• Igama ledolobha, noma
• Igama lendawo

📍 **Amadolobha Amakhulu Anama-Branch:**
• Harare: 15+ branches
• Bulawayo: 8 branches
• Mutare: 4 branches
• Gweru: 3 branches
• Masvingo: 2 branches

⏰ **Amahora Okubhanga:**
• UMsombuluko-uLwesihlanu: 8:00 AM - 4:00 PM
• UMgqibelo: 8:00 AM - 12:00 PM
• ISonto: Ivaliwe

📱 **Izinsizakalo eziyi-24/7:**
• Ama-ATM (ayatholakala kuwo wonke amagatsha)
• Ama-agent e-EcoCash (hlola *151*0# ukuthola aseduze)
• Mobile & Internet Banking

🔍 **Ukuthola izindawo ezithile:**
1. Vakashela iwebhusayithi yethu: www.bank.co.zw/branches
2. Sebenzisa i-app ye-mobile "Branch Finder"
3. Shaya *151*0# > Agent Locator

Yiliphi isigceme okufanele ngikusehelele?"""
    },
    
    "atm_location": {
        "en": """🏧 **ATM Locations**

I can help you find nearby ATMs.

📍 **To find ATMs:**
1. Use our mobile app's "ATM Finder"
2. Visit: www.bank.co.zw/atms
3. Google Maps: Search "Bank ATM near me"

💡 **ATM Services Available:**
• Cash withdrawal
• Balance inquiry
• PIN change
• Mini statement
• Cash deposit (selected ATMs)

⚠️ **Daily Limits:**
• Standard accounts: $500/day
• Premium accounts: $1,000/day
• Business accounts: $2,000/day

🔒 **Safety Tips:**
• Cover your PIN when entering
• Don't accept help from strangers
• Check for card skimmers
• Use ATMs in well-lit areas

📱 **Alternative for Cash:**
• EcoCash cash-out at agents
• POS withdrawal at partner stores

Tell me your location and I'll find the nearest ATM.""",
        
        "sn": """🏧 **ATM Locations**

Ndinogona kukubatsira kutsvaga ATM iri pedyo.

📍 **Kutsvaga ATM:**
1. Shandisa mobile app "ATM Finder"
2. Enda: www.bank.co.zw/atms
3. Google Maps: Tsvaga "Bank ATM near me"

💡 **ATM Services:**
• Kuburitsa mari
• Kutarisa balance
• Kuchinja PIN
• Mini statement
• Kuisa mari (ATMs dzakasarudzwa)

⚠️ **Ma Limits Ezuva:**
• Standard accounts: $500/zuva
• Premium accounts: $1,000/zuva
• Business accounts: $2,000/zuva

🔒 **Mazano eKuchengetedzwa:**
• Vhara PIN yako kana uchinyora
• Usatendere munhu asina hama kuti akubatsire
• Tarisa kuti hakuna card skimmer
• Shandisa ATM iri pane chiedza

📱 **Imwe Nzira Yekuwana Mari:**
• EcoCash cash-out ku agents
• POS withdrawal kumastore

Ndiudze kwaunenge uri ndichatsvaga ATM iri pedyo.""",
        
        "nd": """🏧 **Izindawo ze-ATM**

Ngingakusiza ukuthola ama-ATM aseduze.

📍 **Ukuthola ama-ATM:**
1. Sebenzisa i-app ye-mobile "ATM Finder"
2. Vakashela: www.bank.co.zw/atms
3. Google Maps: Sesha "Bank ATM eduze kwami"

💡 **Izinsizakalo ze-ATM Ezitholakalayo:**
• Ukukhipha imali
• Ukubuza ibhalansi
• Ukushintsha i-PIN
• I-Mini statement
• Ukufaka imali (ama-ATM akhethiwe)

⚠️ **Imikhawulo Yansuku Zonke:**
• Ama-account ajwayelekile: $500/ngosuku
• Ama-account e-Premium: $1,000/ngosuku
• Ama-account ebhizinisi: $2,000/ngosuku

🔒 **Amacebo Okuphepha:**
• Vala i-PIN yakho lapho uyifaka
• Ungamukeli usizo kubantu ongabazi
• Hlola ama-card skimmers
• Sebenzisa ama-ATM ezindaweni ezikhanyiswe kahle

📱 **Enye Indlela Yokuthola Imali:**
• I-EcoCash cash-out ku-agents
• Ukukhipha nge-POS ezitolo eziyizibambiqhaza

Ngitshele indawo yakho ngizothola i-ATM eseduze."""
    },
    
    "card_request": {
        "en": """💳 **Card Services**

I can help you with debit/credit card services.

🆕 **New Card Request:**
• Processing time: 5-7 business days
• Collection: At your branch
• Required: ID and $10 card fee

📢 **Report Lost/Stolen Card:**
⚠️ **URGENT:** Call 114 immediately to block your card
• After hours emergency: +263 78 222 4444
• Visit branch next day with ID for replacement

🔄 **Card Replacement:**
• Fee: $10
• Same card number retained
• Ready in 5-7 days

🔓 **Unblock Card:**
• If blocked due to wrong PIN: Visit branch
• If blocked due to suspicious activity: Call 114

📱 **Card Controls (via Mobile App):**
• Temporarily block card
• Set spending limits
• Enable/disable online transactions
• Set travel notification

What card service do you need?

Reply with:
1 = Lost/Stolen card
2 = New/Replacement card
3 = Block card""",
        
        "sn": """💳 **Card Services**

Ndinogona kukubatsira nekadhi yako.

🆕 **Kukumbira Kadhi Itsva:**
• Nguva yekuita: Mazuva 5-7
• Kutora: Ku branch yako
• Unoda: ID ne$10 ye fee

📢 **Raporti Kadhi Yakarasika/Yakabiwa:**
⚠️ **KUKURUMIDZA:** Fona 114 pakarepo kuti uvhare kadhi
• Usiku emergency: +263 78 222 4444
• Enda ku branch nezuva rinotevera neID

🔄 **Kutsiva Kadhi:**
• Fee: $10
• Nhamba imwe chete
• Inenge yakagadzirira mumazuva 5-7

🔓 **Kuvhura Kadhi:**
• Kana yakavharwa nePIN isiri iyo: Enda ku branch
• Kana yakavharwa nekutyira: Fona 114

📱 **Kukonzera Kadhi (pa Mobile App):**
• Vhara kadhi kwenguva
• Isa ma limits ekushandisa
• Vhura/Vhara online transactions
• Isa travel notification

Unoda chii pamusoro pekadhi?

Pindura ne:
1 = Kadhi yakarasika/yakabiwa
2 = Kadhi itsva/replacement
3 = Vhara kadhi""",
        
        "nd": """💳 **Izinsizakalo Zekhadi**

Ngingakusiza ngezinsizakalo zekhadi lokukhokhela/lekhredithi.

🆕 **Isicelo Sekhadi Elisha:**
• Isikhathi sokucubungula: Izinsuku ezi-5-7 zebhizinisi
• Ukuqoqa: Egatsheni lakho
• Okudingekayo: I-ID ne-$10 yemali yekhadi

📢 **Bika Ikhadi Elilahlekile/Elebiwe:**
⚠️ **KUPHUTHUMA:** Shaya u-114 ngokushesha ukuvimba ikhadi lakho
• Isimo esiphuthumayo ngemuva kwamahora: +263 78 222 4444
• Vakashela igatsha ngosuku olulandelayo une-ID ukuze ufake elinye

🔄 **Ukushintshelwa Ikhadi:**
• Imali: $10
• Inombolo efanayo yekhadi igcinwa
• Ilungele ezinsukwini ezi-5-7

🔓 **Vula Ikhadi:**
• Uma livinjelwe ngenxa ye-PIN okungeyiyo: Hamba egatsheni
• Uma livinjelwe ngenxa yomsebenzi osongela: Shaya u-114

📱 **Ukulawula Ikhadi (nge-Mobile App):**
• Vimba ikhadi okwesikhashana
• Setha imikhawulo yokusebenzisa
• Vumela/vimbela imisebenzi ye-inthanethi
• Setha isaziso sokuhamba

Yiluphi usizo lwekhadi oludingayo?

Phendula ngo:
1 = Ikhadi elilahlekileyo/elibiweyo
2 = Ikhadi elitsha/replacement
3 = Vala ikhadi"""
    },
    
    "account_opening": {
        "en": """🏦 **Open a New Account**

Great choice! Here's how to open an account:

📋 **Requirements:**
• National ID or Valid Passport
• Proof of residence (utility bill, lease)
• Minimum opening deposit: $50
• Passport photo (2 copies)

🏢 **Account Types Available:**

💼 **Savings Account**
• Interest: 3% per annum
• Free debit card
• Mobile banking access

💵 **Current Account**
• No interest
• Checkbook facility
• Unlimited transactions

👨‍👩‍👧 **Minor's Account (Under 18)**
• Parent/guardian required
• Birth certificate needed

🏢 **Business Account**
• CR14 and Business registration
• Director's IDs
• Memorandum of Association

📱 **Quick Account (via USSD):**
• Dial *151# and follow prompts
• Basic wallet account
• Upgrade at branch later

Would you like to proceed with account opening?""",
        
        "sn": """🏦 **Kuvhura Account Itsva**

Sarudzo yakanaka! Heino nzira yekuvhura account:

📋 **Zvinodikanwa:**
• National ID kana Passport
• Umbowo wekugara (bill, lease)
• Mari yekutanga: $50
• Passport photo (2)

🏢 **Mhando dze Account:**

💼 **Savings Account**
• Interest: 3% pagore
• Debit card mahara
• Mobile banking

💵 **Current Account**
• Hakuna interest
• Checkbook
• Unlimited transactions

👨‍👩‍👧 **Account Yemwana (Pasi pe18)**
• Unoda mubereki
• Birth certificate

🏢 **Business Account**
• CR14 ne Business registration
• Ma ID evaridzi
• Memorandum of Association

📱 **Quick Account (pa USSD):**
• Daira *151# utevere mashoko
• Basic wallet account
• Upgrade ku branch gare gare

Unoda kupfuurira nekuvhura account?""",
        
        "nd": """🏦 **Vula I-akhawunti Entsha**

Ukukhetha okuhle! Naku ukuthi ungavula kanjani i-akhawunti:

📋 **Okudingekayo:**
• I-ID yeNational noma i-Passport esebenzayo
• Ubufakazi bendawo yokuhlala (i-bill ye-utility, isivumelwano sokurenta)
• Idiphozi encane yokuvula: $50
• Isithombe se-passport (amakhophi ama-2)

🏢 **Izinhlobo ze-Account Ezitholakalayo:**

💼 **I-Savings Account**
• Inzalo: 3% ngonyaka
• Ikhadi lokukhokhela lamahhala
• Ukufinyelela ku-mobile banking

💵 **I-Current Account**
• Akukho inzalo
• Isikhala sencwadi yokucabanga
• Imisebenzi engenakuphikiswa

👨‍👩‍👧 **I-Account Yomntwana (Ngaphansi kuka-18)**
• Kudingeka umzali/umgcini
• Kudingeka isitifiketi sokuzalwa

🏢 **I-Business Account**
• I-CR14 nokubhaliswa kwebhizinisi
• Ama-ID abaqondisi
• I-Memorandum of Association

📱 **I-Quick Account (nge-USSD):**
• Shaya *151# ulandele imikhondo
• I-akhawunti ye-wallet eyisisekelo
• Thuthukisa egatsheni kamuva

Ungathanda ukuqhubeka nokuvula i-akhawunti?"""
    },
    
    "account_closure": {
        "en": """🚪 **Account Closure Request**

I'm sorry to hear you want to close your account. Before proceeding, please consider:

❓ **Common reasons for closure:**
1. Moving to another bank
2. No longer need the account
3. Dissatisfied with service
4. Fees too high

If there's an issue we can resolve, please let us know!

📋 **To close your account:**
1. Visit any branch with your ID
2. Surrender debit card and checkbook
3. Clear any outstanding balance
4. Sign account closure form

💰 **Remaining Balance:**
• Will be transferred to your specified account, or
• Issued as cash/cheque

⏰ **Processing Time:**
• Same day if no pending transactions
• 3-5 days if cards need to be cancelled

⚠️ **Before Closing:**
• Cancel all standing orders
• Update salary/payment details
• Redirect any incoming transfers

Would you like to tell me why you're closing? We may be able to help.""",
        
        "sn": """🚪 **Kukumbira Kuvhara Account**

Ndinozvidemba kuzvinzwa kuti unoda kuvhara account yako. Usati wapfuurira, ndapota funga:

❓ **Zvikonzero zvinowanzo:**
1. Kuenda kune rimwe bangi
2. Handichadi account
3. Handifari ne service
4. Ma fees akawandisa

Kana paine dambudziko tingagadzirisa, ndapota tiudze!

📋 **Kuvhara account yako:**
1. Enda ku branch uine ID
2. Dzosera debit card ne checkbook
3. Bhadhara zviri kupera
4. Saina form yekuvhara account

💰 **Mari Yasara:**
• Ichatumirwa ku account yako, kana
• Ichatorwa semari/cheque

⏰ **Nguva Yekuita:**
• Zuva rimwe kana hakuna pending transactions
• Mazuva 3-5 kana makadhi anoda ku-cancel

⚠️ **Usati Wavhara:**
• Cancel standing orders dzese
• Chinja salary/payment details
• Endesa incoming transfers kwakakodzera

Unoda kundiudza sei uri kuvhara? Tinogona kubatsira.""",
        
        "nd": """🚪 **Isicelo Sokuvala I-akhawunti**

Ngiyaxolisa ukuzwa ukuthi ufuna ukuvala i-akhawunti yakho. Ngaphambi kokuqhubeka, sicela ucabange:

❓ **Izizathu ezijwayelekile zokuvala:**
1. Ukuya kwelinye ibhange
2. Angisayidingi i-akhawunti
3. Angijabulile ngensizakalo
4. Ama-fee aphezulu kakhulu

Uma kunenkinga esingayixazulula, sicela usazise!

📋 **Ukuvala i-akhawunti yakho:**
1. Hamba kunoma yiliphi igatsha une-ID yakho
2. Buyisela ikhadi lokukhokhela nencwadi yamasheke
3. Khokha noma yiliphi ibhalansi elisele
4. Sayina ifomu lokuvala i-akhawunti

💰 **Ibhalansi Elisele:**
• Lizodluliselwa ku-akhawunti yakho ocacisayo, noma
• Likhishwa njengeyemali/isheke

⏰ **Isikhathi Sokwenza:**
• Ngosuku olufanayo uma kungenamisebenzi elindile
• Izinsuku ezi-3-5 uma amakhadi adinga ukukhanselwa

⚠️ **Ngaphambi Kokuvala:**
• Khansela wonke ama-standing orders
• Buyekeza imininingwane yeholo/yokukhokhela
• Qondisa noma yikuphi ukudluliswa okuzayo

Ungathanda ukungitshela ukuthi kungani uvala? Singase sikwazi ukusiza."""
    },
    
    "update_profile": {
        "en": """📝 **Update Profile Information**

I can help you update your account details.

🔄 **What would you like to update?**

📱 **Phone Number:**
• Via mobile app or branch
• Verification SMS sent to old number

📧 **Email Address:**
• Update via internet banking
• Confirmation sent to both emails

🏠 **Residential Address:**
• Bring proof of address to branch
• Updated within 24 hours

👤 **Personal Details (Name):**
• Requires branch visit
• Bring legal documentation

📸 **ID/Passport Update:**
• Visit branch with new document
• Photo updated in system

🔐 **Security Details:**
• PIN: Via *151*5# or branch
• Security questions: Branch only

💼 **Employment Details:**
• New employer letter required
• Visit branch to update

Which details would you like to update?""",
        
        "sn": """📝 **Kuchinja Profile Information**

Ndinogona kukubatsira kuchinja ruzivo rwako.

🔄 **Chii chaunoda kuchinja?**

📱 **Nhamba yeFoni:**
• Pa mobile app kana ku branch
• Verification SMS ichatumirwa ku nhamba yekare

📧 **Email Address:**
• Chinja pa internet banking
• Confirmation ichatumirwa kuma email maviri

🏠 **Kero Yekugara:**
• Unza proof of address ku branch
• Ichachinja mumaawa 24

👤 **Ruzivo Rwako (Zita):**
• Unoda kuenda ku branch
• Unza magwaro akafanira

📸 **ID/Passport Update:**
• Enda ku branch ne document itsva
• Photo ichachinjwa

🔐 **Security Details:**
• PIN: Pa *151*5# kana ku branch
• Security questions: Ku branch chete

💼 **Employment Details:**
• Tsamba yemutyari musva inodikanwa
• Enda ku branch kuti uchinje

Ruzivo rupi rwaunoda kuchinja?""",
        
        "nd": """📝 **Buyekeza Ulwazi Lwephrofayili**

Ngingakusiza ukuthi ubuyekeze imininingwane ye-akhawunti yakho.

🔄 **Yini ongathanda ukuyibuyekeza?**

📱 **Inombolo Yocingo:**
• Nge-mobile app noma egatsheni
• I-SMS yokuqinisekisa ithunyelwa kunombolo endala

📧 **Ikheli Le-imeyili:**
• Buyekeza nge-internet banking
• Ukuqinisekiswa kuthunyelwa kuma-imeyili womabili

🏠 **Ikheli Lokuhlala:**
• Letha ubufakazi bekheli egatsheni
• Kubuyekezwe phakathi kwamahora angu-24

👤 **Imininingwane Yomuntu Siqu (Igama):**
• Kudinga ukuvakashela igatsha
• Letha imibhalo esemthethweni

📸 **Ukubuyekeza kwe-ID/Passport:**
• Vakashela igatsha unomqulu omusha
• Isithombe sibuyekezwa ohlelweni

🔐 **Imininingwane Yokuphepha:**
• I-PIN: Ngo-*151*5# noma egatsheni
• Imibuzo yokuphepha: Egatsheni kuphela

💼 **Imininingwane Yomsebenzi:**
• Kudingeka incwadi yomqashi omusha
• Vakashela igatsha ukuze ubuyekeze

Yimiphi imininingwane ongathanda ukuyibuyekeza?"""
    },
    
    "escalation_request": {
        "en": """👨‍💼 **Connecting You to a Human Agent**

I understand you'd like to speak with a human representative.

⏳ **Please wait while I transfer you...**

📞 **Current wait time:** Approximately 2-5 minutes

💡 **While you wait:**
• Your conversation history will be shared with the agent
• Please have your account details ready
• Reference number: #{reference_id}

📱 **Alternative Contact Options:**
• Call: 114 (24/7 helpline)
• WhatsApp: +263 78 222 4444
• Email: support@bank.co.zw
• Visit: Any branch during banking hours

👤 **You will be connected to:**
• A trained customer service representative
• Operating hours: 24/7 for phone support
• Response time: Usually under 5 minutes

Thank you for your patience. An agent will be with you shortly.""",
        
        "sn": """👨‍💼 **Kukubatanidza neMunhu**

Ndinonzwisisa kuti unoda kutaura nemunhu chaiye.

⏳ **Ndapota mira ndichikuendesa...**

📞 **Nguva yekumirira:** Maminetsi 2-5

💡 **Paunenge uchimirira:**
• Zvawakataura zvichapiwa ku agent
• Ndapota iva ne ruzivo rwe account yako
• Reference number: #{reference_id}

📱 **Imwe Nzira Yekutibata:**
• Fona: 114 (24/7)
• WhatsApp: +263 78 222 4444
• Email: support@bank.co.zw
• Enda: Ku branch

👤 **Uchazobataniswa na:**
• Mushandi akadzidza kubatsira vatengi
• Nguva dzekushanda: 24/7 pa foni
• Nguva yekupindura: Kazhinji pasi pemaminetsi 5

Maita basa nekumirira. Agent achakubata munguva pfupi.""",
        
        "nd": """👨‍💼 **Sikuxhumanisa No-Agent Ongumuntu**

Ngiyaqonda ukuthi ungathanda ukukhuluma nommeleli ongumuntu.

⏳ **Sicela ulinde ngikudlulisela...**

📞 **Isikhathi sokulinda samanje:** Cishe imizuzu emi-2-5

💡 **Ngesikhathi ulinde:**
• Umlando wengxoxo yakho uzokwabelwa no-agent
• Sicela ube nemininingwane ye-akhawunti yakho ilungile
• Inombolo yereferensi: #{reference_id}

📱 **Ezinye Izinketho Zokuxhumana:**
• Shaya: 114 (umugqa wosizo 24/7)
• WhatsApp: +263 78 222 4444
• I-imeyili: support@bank.co.zw
• Vakashela: Noma yiliphi igatsha ngesikhathi sokubhanga

👤 **Uzoxhunyaniswa:**
• Nommeleli wezemisebenzi yamakhasimende oqeqeshiwe
• Amahora okusebenza: 24/7 ukusekelwa ngocingo
• Isikhathi sokuphendula: Ngokuvamile ngaphansi kwemizuzu emi-5

Siyabonga ngokubekezela kwakho. U-agent uzoba nawe maduzane."""
    },
    
    "general_inquiry": {
        "en": """Absolutely, I can help with that. You're in the right place.

Tell me what you want to do right now — for example:
• Check balance or statement
• Send money / reverse a wrong transfer
• Buy airtime or data
• Fix card or PIN/security issues
• Find nearest EcoCash agent/ATM/branch

If you describe your issue in one sentence, I'll guide you step by step like a support agent.""",
        
        "sn": """Zvakanaka, ndinokwanisa kukubatsira. Muri panzvimbo chaiyo.

Ndiudzei zvamunoda kuita izvozvi — semuenzaniso:
• Kutarisa balance kana statement
• Kutumira mari / kudzosa yakatumirwa zvisirizvo
• Kutenga airtime kana data
• Kugadzirisa kadhi kana PIN/security
• Kutsvaga EcoCash agent/ATM/branch iri pedyo

Kana mukatsanangura dambudziko renyu muchirevo chimwe chete, ndichakutungamirirai nhanho nenhanho semunhu we support.""",
        
        "nd": """Kulungile, ngingakusiza. Usendaweni eqondileyo.

Ngitshele ofuna ukukwenza khathesi — ngokwesibonelo:
• Ukuhlola ibhalansi loba isitatimende
• Ukuthumela imali / ukubuyisa ethunyelwe enombolweni engayisiyo
• Ukuthenga airtime loba data
• Ukulungisa ikhadi loba i-PIN/security
• Ukuthola i-EcoCash agent/ATM/branch eseduze

Nxa ungachaza inkinga yakho ngomusho owodwa, ngizokuqondisa inyathelo ngenyathelo njengomuntu we-support."""
    },
    
    "low_confidence": {
        "en": """I hear you. I just need one more detail so I can help properly.

Please tell me either:
• What exactly happened, or
• What you were trying to do (for example: buy airtime, send money, check balance).

If you prefer, I can connect you to a human agent immediately — just say "agent".""",
        
        "sn": """Ndakunzwai. Ndiri kungoda rumwe ruzivo rwushoma kuti ndikubatsire zvakanaka.

Ndapota ndiudzei chimwe chezvinotevera:
• Chii chaizvo chakaitika, kana
• Chii chamanga muchiedza kuita (semuenzaniso: kutenga airtime, kutumira mari, kana kutarisa balance).

Kana muchida, ndinokubatanidzai nemunhu chaiye pakarepo — ingoti "agent".""",
        
        "nd": """Ngiyakuzwa. Ngidinga nje imininingwane encane ukuze ngikusize ngendlela efanele.

Sicela ungitshele okunye kwalokhu:
• Kuyini okwenzakeleyo, loba
• Okubuzama ukukwenza (isibonelo: ukuthenga airtime, ukuthumela imali, kumbe ukuhlola ibhalansi).

Nxa ufuna, ngingakuxhumanisa lo-agent womuntu khathesi — vele uthi "agent"."""
    }
}

# Export for use in nlp_service.py
__all__ = ['RESPONSE_TEMPLATES']
