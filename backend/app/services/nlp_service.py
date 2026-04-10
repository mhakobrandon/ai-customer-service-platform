"""
NLP Service for multilingual customer service chatbot.
Handles language detection, intent classification, and response generation
for English, Shona, and Ndebele languages.
"""

# Conditional imports for ML libraries
import os
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    # For development without ML libraries
    pass

import re
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from app.core.config import settings
from app.services.intent_catalog import INTENT_LABELS as CANONICAL_INTENT_LABELS, normalize_intent
import logging
import json

# Import comprehensive response templates
try:
    from app.services.response_templates import RESPONSE_TEMPLATES
    TEMPLATES_AVAILABLE = True
except ImportError:
    TEMPLATES_AVAILABLE = False
    RESPONSE_TEMPLATES = {}

logger = logging.getLogger(__name__)


class NLPService:
    """
    NLP service for processing customer queries in multiple languages.
    Uses hybrid ML + rule-based approach for intent classification.
    Supports English, Shona, and Ndebele for Zimbabwe financial services.
    """
    
    # Define supported intents - Updated for Zimbabwe financial services
    INTENT_CATEGORIES = CANONICAL_INTENT_LABELS
    INTENT_LABELS = CANONICAL_INTENT_LABELS
    
    # Response templates for each intent in all supported languages
    RESPONSE_TEMPLATES = {
        "balance_inquiry": {
            "en": "Your current account balance is ${balance}. Last transaction: ${last_transaction}",
            "sn": "Mari yako iri ${balance}. Chiitiko chekupedzisira: ${last_transaction}",
            "nd": "Imali yakho ngu ${balance}. Okwenzeke ekugcineni: ${last_transaction}"
        },
        "transaction_history": {
            "en": "Here are your recent transactions:\n${transactions}",
            "sn": "Heano zvawakamboita:\n${transactions}",
            "nd": "Nazi imisebenzi yakho yakamuva:\n${transactions}"
        },
        "transfer_money": {
            "en": "To transfer money, please provide: recipient number, amount, and confirm your PIN.",
            "sn": "Kutumira mari, tipa: nhamba yemunhu, mari, uye simbisa PIN yako.",
            "nd": "Ukuthumela imali, sicela unikeze: inombolo yomtholi, inani, uqinisekise i-PIN yakho."
        },
        "password_reset": {
            "en": "I'll help you reset your password. Please verify your identity by providing your ID number and registered phone number.",
            "sn": "Ndichakubatsira kuchinja password. Ndapota simbisa kuti ndiwe neID yako nenamba yefoni yakanyoreswa.",
            "nd": "Ngizokusiza ukuthi ubuye usebenzise i-password yakho. Sicela uqinisekise ubuwena ngokunikeza inombolo ye-ID nenombolo yakho yocingo ebhalisile."
        },
        "loan_inquiry": {
            "en": "We offer various loan products. You may be eligible for a loan of up to $5,000 based on your account history.",
            "sn": "Tine mhando dzakasiyana dzemikwereti. Unogona kuwana chikwereti chinosvika pa$5,000 zvichibva pane zvawakamboita.",
            "nd": "Sinikezela ngemikhiqizo yemalimboleko eyehlukene. Ungafaneleka umalimboleko afinyelela ku-$5,000 ngokusekelwa emlandu yakho ye-akhawunti."
        },
        "bill_payment": {
            "en": "I can help you pay bills. Which service would you like to pay for? (Electricity, Water, Internet, etc.)",
            "sn": "Ndinokubatsira kubhadhara mabhiri. Ndeapi service yaunoda kubhadhara? (Magetsi, Mvura, Internet, zvimwe)",
            "nd": "Ngingakusiza ukuthi ukhokhele izindleko. Yisiphi isevisi ongathanda ukukhokhela? (Ugesi, Amanzi, i-Internet, njalonjalo)"
        },
        "mobile_money": {
            "en": "I can help you with mobile money transfers. Please provide the mobile number and amount you'd like to transfer.",
            "sn": "Ndinokubatsira kutumira mari kuEcoCash. Ndapota tipa nhamba yefoni nemari yaunoda kutumira.",
            "nd": "Ngingakusiza ngokuthumela imali ku-EcoCash. Sicela unikeze inombolo yocingo nenani ofuna ukulithumela."
        },
        "greeting": {
            "en": "Hello! Welcome to our customer service. How can I assist you today?",
            "sn": "Mhoro! Titambire kune hushumiro hwedu. Ndingakubatsira sei nhasi?",
            "nd": "Sawubona! Wamkelekile kusizakalo lwethu lwamakhasimende. Ngingakusiza kanjani namhlanje?"
        },
        "goodbye": {
            "en": "Thank you for contacting us! If you have any more questions, feel free to reach out. Goodbye!",
            "sn": "Maita basa nekutitaura! Kana uine mimwe mibvunzo, unogona kutibata. Chisarai zvakanaka!",
            "nd": "Siyabonga ngokuxhumana lathi! Uma uneminye imibuzo, khululeka ukusithinta. Hamba kahle!"
        },
        "complaint": {
            "en": "I'm sorry to hear you're having an issue. Could you please share:\n\n1. A brief description of the problem\n2. Date/time it occurred\n3. Transaction reference (if available)\n4. Your contact number\n\nOur team will investigate and get back to you.",
            "sn": "Ndinozvidemba nezvematambudziko aunosangana nawo. Ndapota ndiudze:\n\n1. Tsananguro pfupi yedambudziko\n2. Zuva/nguva yazviitika\n3. Nhamba yereferensi (kana iripo)\n4. Nhamba yako yefoni\n\nBoka redu richaongorora uye ridzokere kwauri.",
            "nd": "Ngiyaxolisa ngezinkinga obhekene nazo. Sicela washo:\n\n1. Incazelo emfishane yenkinga\n2. Usuku/isikhathi esenzekile\n3. Inombolo yereferensi (uma ikhona)\n4. Inombolo yakho yokuxhumana\n\nIthimba lethu lizophenywa libuye kuwe."
        },
        "complaint_received": {
            "en": "✅ Thank you! Your complaint has been logged.\n\n📋 Reference: {complaint_ref}\n⏰ Resolution target: 24-48 hours\n\nA customer care agent will contact you. For urgent help call 114.",
            "sn": "✅ Maita basa! Murikariro wako wanyorwa.\n\n📋 Nhamba: {complaint_ref}\n⏰ Nguva yekugadziriswa: Maawa 24-48\n\nMumwe wevashandi vedu achakubata. Rubatsiro rwekukurumidza fona 114.",
            "nd": "✅ Siyabonga! Isikhalo sakho silotshiwe.\n\n📋 Inombolo: {complaint_ref}\n⏰ Isikhathi sokuxazululwa: Amahora angu-24-48\n\nI-agent yezonke izidingo izokuxhumana nawe. Usizo olusheshayo shaya 114."
        },
        "dispute_details": {
            "en": "✅ Thank you — your dispute details have been noted.\n\n📋 Case Reference: {complaint_ref}\n⏰ Resolution: 24-48 hours\n\nOur team will investigate and update you. For urgent help: Call 114.",
            "sn": "✅ Maita basa — ruzivo rwekupikisa kwako rwanyorwa.\n\n📋 Nhamba yeKesi: {complaint_ref}\n⏰ Kugadziriswa: Maawa 24-48\n\nBoka redu richaongorora uye rikuudze. Rubatsiro rwekukurumidza: Fona 114.",
            "nd": "✅ Siyabonga — imininingwane yesikhalo sakho ilotshiwe.\n\n📋 Inombolo yecala: {complaint_ref}\n⏰ Ukuxazululwa: Amahora angu-24-48\n\nIthimba lethu lizophenywa likwazise. Usizo olusheshayo: Shaya 114."
        },
        "account_statement": {
            "en": "I'll generate your account statement. Would you like it for the last 30 days, 60 days, or custom period?",
            "sn": "Ndichakugadzirira statement rako. Unoda romwedzi mmwe wakapfuura, mwedzi miviri, kana nguva yako?",
            "nd": "Ngizokukhiqiza isitatimende se-akhawunti yakho. Ungasifuna sezinsuku ezingu-30, ezingu-60, noma isikhathi esihleliwe?"
        },
        "transaction_dispute": {
            "en": "I understand you want to dispute a transaction. Please provide the transaction date, amount, and reference number. For reversals, we'll process within 24-48 hours.",
            "sn": "Ndinonzwisisa kuti unoda kupikisa transaction. Ndapota tipa zuva rechitiko, mari, uye nhamba yereferensi. Kudzosera mari kunotora maawa 24-48.",
            "nd": "Ngiyaqonda ukuthi ufuna ukuphikisa umsebenzi. Sicela unikeze usuku, inani, nenombolo yereferensi. Ukubuyiselwa emuva kuthatha amahora angu-24-48."
        },
        "security_pin": {
            "en": "For security changes (PIN reset, account block/unblock), please dial *151# or visit your nearest agent. Never share your PIN with anyone!",
            "sn": "Kuchinja security (PIN, kuvhara/kuvhura account), daira *151# kana enda kune agent ari pedyo. Usapa munhu PIN yako!",
            "nd": "Ukuguqula i-security (i-PIN, ukuvala/ukuvula i-account), shaya *151# noma hamba ku-agent oseduze. Ungayiniki muntu i-PIN yakho!"
        },
        "network_connectivity": {
            "en": "We're aware of possible network issues. Try: 1) Toggle airplane mode, 2) Restart your phone, 3) Dial *151#. If issues persist, call 114.",
            "sn": "Tiri kuziva nezvematambudziko e network. Edza: 1) Airplane mode, 2) Restart foni, 3) Daira *151#. Kana zvikaramba, fona 114.",
            "nd": "Siyakwazi ngezinkinga ze-network. Zama: 1) I-airplane mode, 2) Qalisa kabusha ifoni, 3) Shaya *151#. Uma kuqhubeka, shaya 114."
        },
        "mobile_wallet_fees": {
            "en": "EcoCash fees: Send money 1-2%, Cash out 2-3%, IMTT tax 2% on amounts over $10. No monthly fees for basic wallet.",
            "sn": "Ma fees e EcoCash: Kutumira mari 1-2%, Kuburitsa 2-3%, IMTT tax 2% pa mari inopfuura $10. Hakuna monthly fees.",
            "nd": "Ama-fee e-EcoCash: Ukuthumela imali 1-2%, Ukukhipha 2-3%, I-IMTT tax 2% kwimali edlula u-$10. Akukho ama-fee enyanga."
        },
        "account_opening": {
            "en": "To open an account, you'll need: Valid ID (National ID or Passport), Proof of residence, and $50 minimum deposit. Visit any branch or register via *151#.",
            "sn": "Kuvhura account unoda: ID (National ID kana Passport), Umbowo wekugara, uye $50 yekutanga. Enda ku branch kana register pa *151#.",
            "nd": "Ukuvula i-account udinga: I-ID (National ID noma Passport), Ubufakazi bekheli, kanye ne-$50 yokuqala. Hamba ku-branch noma ubhalise ngo-*151#."
        },
        "branch_location": {
            "en": "I can help you find branches and banking hours. Tell me your city or area, and I'll provide the nearest locations.",
            "sn": "Ndinokubatsira kuwana branch. Ndiudze guta rako kana nzvimbo, ndikupe zviripo pedyo.",
            "nd": "Ngingakusiza ukuthola ama-branch. Ngitshele idolobha lakho noma indawo, ngizokunika eziseduze."
        },
        "escalation_request": {
            "en": "I'll connect you with a human agent right away. Please hold while I transfer you to our customer care team.",
            "sn": "Ndiri kukubatanidza nemunhu chaiye izvozvi. Ndapota mira ndichikuendesa kune boka redu rekubatsira vatengi.",
            "nd": "Ngikuxhumanisa lo-agent khathesi. Sicela ulinde ngikudlulisela ethimini lethu lokunakekelwa kwamakhasimende."
        },
        "new_account": {
            "en": "Great! To open a new account, you'll need: Valid ID, Proof of Address, and minimum deposit of $50.",
            "sn": "Zvakanaka! Kuvhura account itsva, unoda: ID yakashanda, Umbowo wekugara, uye mari yekutanga ye$50.",
            "nd": "Kuhle! Ukuvula i-akhawunti entsha, uzodinga: I-ID esebenzayo, Ubufakazi bekheli, kanye nediphozi encane engu-$50."
        },
        "card_request": {
            "en": "I can help you with your card request. Would you like to report a lost card, request a new card, or block your current card?",
            "sn": "Ndinokubatsira nekadhi yako. Unoda kureporter kadhi yakarasika, kukumbira itsva, kana kubhuroka kadhi yazvino?",
            "nd": "Ngingakusiza ngesicelo sekhadi lakho. Ungathanda ukubika ikhadi elilahlekile, ucele eliša, noma uvimbe ikhadi lakho lamanje?"
        },
        "atm_location": {
            "en": "I can help you find ATM locations. Please tell me your current location or the area you're looking for.",
            "sn": "Ndinokubatsira kuwana ATM. Ndapota ndiudze kwaunenge uri kana nzvimbo yaunoda.",
            "nd": "Ngingakusiza ukuthola izindawo ze-ATM. Ngicela ungitshele indawo yakho yamanje noma indawo oyifunayo."
        },
        "account_closure": {
            "en": "I'm sorry to hear you want to close your account. May I ask the reason? Before proceeding, please note any remaining balance will be transferred to your specified account.",
            "sn": "Ndinozvidemba kuti unoda kuvhara account yako. Ndingabvunza chikonzero here? Usati waenderera mberi, ziva kuti mari yakasara ichatumirwa ku-account yako.",
            "nd": "Ngiyaxolisa ukuzwa ukuthi ufuna ukuvala i-akhawunti yakho. Ngingabuza isizathu? Ngaphambi kokuqhubeka, qaphela ukuthi noma yiliphi ibhalansi elisele lizodluliselwa ku-akhawunti yakho."
        },
        "update_profile": {
            "en": "I can help you update your profile. What would you like to change? (Phone number, Email, Address, etc.)",
            "sn": "Ndinokubatsira kuchinja profile yako. Chii chaunoda kuchinja? (Nhamba yefoni, Email, Kero, zvimwe)",
            "nd": "Ngingakusiza ukuthi ubuyekeze iphrofayili yakho. Yini ofuna ukuyishintsha? (Inombolo yocingo, I-imeyili, Ikheli, njalonjalo)"
        },
        "low_confidence": {
            "en": "I understand you need help, but I'm not entirely sure about your request. Let me connect you with a human agent who can assist you better.",
            "sn": "Ndinonzwisisa kuti unoda rubatsiro, asi handinyatsoziva zvaunoda. Rega ndikubatanidze nemumwe munhu anogona kukubatsira zvirinani.",
            "nd": "Ngiyaqonda ukuthi udinga usizo, kodwa angiqiniseki ngokuphelele ngesicelo sakho. Ake ngikuxhumanise nomsizi ongakusiza kangcono."
        }
    }
    
    # Language detection keywords
    LANGUAGE_KEYWORDS = {
        "sn": [
            "mhoro", "makadii", "makadini", "ndapota", "ndibatsirei", "rubatsiro",
            "ndiri", "ndine", "ndinoda", "ndoda", "mari", "yangu", "sei", "maita", "ndatenda"
        ],
        "nd": [
            "sawubona", "salibonani", "ngicela", "usizo", "ngifuna", "imali", "yami",
            "nginenkinga", "ngiyabonga", "ngingathanda", "ngicela ukuthumela", "ukubona"
        ],
        "en": [
            "hello", "hi", "please", "help", "account", "balance", "transaction",
            "transfer", "money", "complaint", "password", "reset"
        ]
    }

    LANGUAGE_STRONG_MARKERS = {
        "sn": ["mhoro", "makadii", "makadini", "ndibatsirei", "ndatenda", "maita", "ndiri", "ndine"],
        "nd": ["sawubona", "salibonani", "ngicela", "nginenkinga", "ngifuna", "ngiyabonga", "imali yami"],
        "en": ["hello", "please", "balance", "transaction", "password reset"],
    }
    
    PROMPT_SHORTCUTS = {
        "sn": {
            "ndoda": "ndinoda",
            "ndiri kuda": "ndinoda",
        },
        "nd": {
            "ngifuna uk": "ngifuna uku",
        },
        "en": {
            "pls": "please",
            "u": "you",
            "thx": "thanks",
            "wanna": "want to",
        }
    }

    TYPO_NORMALIZATION_MAP = {
        "en": {
            "requsting": "requesting",
            "reqesting": "requesting",
            "recieve": "receive",
            "recieved": "received",
            "didnt": "did not",
            "deductd": "deducted",
            "dedcted": "deducted",
            "airtme": "airtime",
            "baught": "bought",
            "bougth": "bought",
            "refnd": "refund",
            "transction": "transaction",
        },
        "sn": {
            "ndapotaa": "ndapota",
            "ndibatsirewo": "ndibatsirei",
            "yakabvisw": "yakabviswa",
            "handina kuwan": "handina kuwana",
            "marii": "mari",
        },
        "nd": {
            "ngicel": "ngicela",
            "imalii": "imali",
            "angikathol": "angikatholi",
            "ikhutshiw": "ikhutshwe",
            "ngifn": "ngifuna",
        },
    }

    STRUCTURED_OPTION_FLOWS = {
        "account_statement": {
            "intent": "account_statement",
            "choices": {
                "period_7": {
                    "keywords": ["1", "7 days", "last 7 days"],
                    "responses": {
                        "en": "Great, I will prepare your account statement for the last 7 days and send it to your registered email.",
                        "sn": "Zvakanaka, ndichagadzira statement yako yemazuva 7 apfuura ndigotumira kuemail yako yakanyoreswa.",
                        "nd": "Kulungile, ngizolungisa isitatimende sakho sezinsuku ezi-7 ezedlule ngisithumele ku-imeyili yakho ebhalisiweyo."
                    }
                },
                "period_30": {
                    "keywords": ["2", "30 days", "last 30 days"],
                    "responses": {
                        "en": "Perfect, I will generate your statement for the last 30 days and deliver it to your registered email.",
                        "sn": "Zvakanaka, ndichagadzira statement yako yemazuva 30 apfuura ndoitumira kuemail yako.",
                        "nd": "Kulungile, ngizokukhiqizela isitatimende sezinsuku ezingu-30 ezedlule ngisithumele ku-imeyili yakho."
                    }
                },
                "period_60": {
                    "keywords": ["3", "60 days", "last 60 days"],
                    "responses": {
                        "en": "Done, I will generate your statement for the last 60 days and share it to your registered email.",
                        "sn": "Zvaitwa, ndichagadzira statement yako yemazuva 60 apfuura ndoitumira kuemail yako.",
                        "nd": "Sekwenziwe, ngizolungisa isitatimende sakho sezinsuku ezingu-60 ezedlule ngisithumele ku-imeyili yakho."
                    }
                },
                "period_90": {
                    "keywords": ["4", "90 days", "last 90 days"],
                    "responses": {
                        "en": "Done, I will generate your statement for the last 90 days and send it to your registered email.",
                        "sn": "Zvaitwa, ndichagadzira statement yako yemazuva 90 apfuura ndoitumira kuemail yako.",
                        "nd": "Sekwenziwe, ngizolungisa isitatimende sakho sezinsuku ezingu-90 ezedlule ngisithumele ku-imeyili yakho."
                    }
                },
                "period_custom": {
                    "keywords": ["5", "custom", "specific dates", "date range"],
                    "responses": {
                        "en": "Please provide your custom start date and end date in this format: YYYY-MM-DD to YYYY-MM-DD.",
                        "sn": "Ndapota tumira zuva rekutanga nerekupera muchimiro ichi: YYYY-MM-DD kusvika YYYY-MM-DD.",
                        "nd": "Sicela unikeze usuku lokuqala losuku lokucina ngendlela le: YYYY-MM-DD kuya ku YYYY-MM-DD."
                    }
                }
            }
        },
        "transfer_money": {
            "intent": "transfer_money",
            "choices": {
                "internal_transfer": {
                    "keywords": ["1", "internal", "own account", "between my accounts"],
                    "responses": {
                        "en": "You selected Internal Transfer. Please provide source account, destination account, and amount.",
                        "sn": "Wasarudza Internal Transfer. Ndapota tipa account yekubva, yekuenda, nemari.",
                        "nd": "Ukhethe i-Internal Transfer. Sicela unikeze i-account esuka kuyo, eya kuyo, kanye lenani."
                    }
                },
                "ecocash_transfer": {
                    "keywords": ["2", "ecocash", "mobile money", "wallet"],
                    "responses": {
                        "en": "You selected EcoCash transfer. Please share recipient mobile number and amount.",
                        "sn": "Wasarudza EcoCash transfer. Ndapota tumira nhamba yefoni yemunhu nemari.",
                        "nd": "Ukhethe i-EcoCash transfer. Sicela unikeze inombolo yocingo yomamukeli kanye lenani."
                    }
                },
                "zipit_transfer": {
                    "keywords": ["3", "zipit", "other bank"],
                    "responses": {
                        "en": "You selected ZIPIT transfer. Please provide recipient bank name, account number, and amount.",
                        "sn": "Wasarudza ZIPIT transfer. Ndapota tumira zita rebhangi, nhamba yeaccount, nemari.",
                        "nd": "Ukhethe i-ZIPIT transfer. Sicela unikeze ibhange lomamukeli, inombolo ye-account, kanye lenani."
                    }
                },
                "rtgs_transfer": {
                    "keywords": ["4", "rtgs", "large amount"],
                    "responses": {
                        "en": "You selected RTGS transfer. Please provide recipient bank details, amount, and transfer reason.",
                        "sn": "Wasarudza RTGS transfer. Ndapota tumira details dzebhangi remugamuchiri, mari, nechikonzero chekutumira.",
                        "nd": "Ukhethe i-RTGS transfer. Sicela unikeze imininingwane yebhange lomamukeli, inani, lesizathu sokuthumela."
                    }
                }
            }
        },
        "bill_payment": {
            "intent": "bill_payment",
            "choices": {
                "electricity": {
                    "keywords": ["1", "electricity", "zesa", "power"],
                    "responses": {
                        "en": "You selected Electricity (ZESA). Please provide meter number and amount.",
                        "sn": "Wasarudza Magetsi (ZESA). Ndapota tumira meter number nemari.",
                        "nd": "Ukhethe uGesi (ZESA). Sicela unikeze i-meter number lenani."
                    }
                },
                "water": {
                    "keywords": ["2", "water", "city council"],
                    "responses": {
                        "en": "You selected Water bill. Please provide account number and amount.",
                        "sn": "Wasarudza bhiri reMvura. Ndapota tumira account number nemari.",
                        "nd": "Ukhethe ibhili lamaNzi. Sicela unikeze inombolo ye-account lenani."
                    }
                },
                "internet": {
                    "keywords": ["3", "internet", "wifi", "data"],
                    "responses": {
                        "en": "You selected Internet bill. Please provide provider name, account number, and amount.",
                        "sn": "Wasarudza bhiri reInternet. Ndapota tumira zita reprovider, account number, nemari.",
                        "nd": "Ukhethe ibhili le-Internet. Sicela unikeze igama le-provider, inombolo ye-account, lenani."
                    }
                }
            }
        },
        "card_request": {
            "intent": "card_request",
            "choices": {
                "report_lost": {
                    "keywords": ["1", "lost", "stolen", "missing card"],
                    "responses": {
                        "en": "You selected Lost/Stolen card. I have flagged your card for immediate block. Please confirm the last 4 digits.",
                        "sn": "Wasarudza kadhi yakarasika/yakabiwa. Ndaisa request yekuvhara pakarepo. Ndapota simbisa manhamba mana ekupedzisira.",
                        "nd": "Ukhethe ikhadi elilahlekileyo/elibiweyo. Sengifake isicelo sokuvala ngokuphuthumayo. Sicela uqinisekise izinombolo ezine zokucina."
                    }
                },
                "request_new": {
                    "keywords": ["2", "new card", "replacement"],
                    "responses": {
                        "en": "You selected New/Replacement card. Please confirm your preferred branch for collection.",
                        "sn": "Wasarudza kadhi itsva/replacement. Ndapota simbisa branch yaunoda kunotora kadhi.",
                        "nd": "Ukhethe ikhadi elitsha/replacement. Sicela uqinisekise i-branch ofuna ukulithatha kuyo."
                    }
                },
                "block_card": {
                    "keywords": ["3", "block", "freeze card"],
                    "responses": {
                        "en": "You selected Block card. I can place a temporary block now. Please confirm YES to continue.",
                        "sn": "Wasarudza kuvhara kadhi. Ndinogona kuisa temporary block izvozvi. Ndapota pindura YES kuti tienderere mberi.",
                        "nd": "Ukhethe ukuvala ikhadi. Ngingafaka ukuvalwa kwesikhashana khathesi. Sicela uphendule ngo-YES ukuze siqhubeke."
                    }
                }
            }
        }
    }

    CLARIFICATION_PROMPTS = {
        "en": "I can help with that. Please share one more detail so I can resolve this correctly: transaction reference, amount, account/wallet used, or your city/area.",
        "sn": "Ndinogona kukubatsira. Ndapota ndiudze chimwe chinhu chimwe chete kuti ndigadzirise nemazvo: reference yetransaction, mari, account/wallet yawashandisa, kana guta/nzvimbo.",
        "nd": "Ngingakusiza ngalokho. Sicela unikeze imininingwane eyodwa ukuze ngilungise kahle: i-reference ye-transaction, inani, i-account/wallet oyisebenzisileyo, kumbe idolobho/indawo yakho.",
    }

    CONTEXTUAL_CLARIFICATION_PROMPTS = {
        "network_connectivity": {
            "en": "I understand the issue is still not resolved. Could you tell me more? For example: Are you getting no signal at all, slow data, or error messages? Also, which area are you in? I can escalate this to our technical team.",
            "sn": "Ndinonzwisisa kuti dambudziko harisi kugadziriswa. Unganditsanangurira zvakawanda here? Semuenzaniso: Hauna network zvachose, data iri kunonoka, kana kuti pane error message? Uyewo, uri mundima ipi? Ndinogona kuendesa izvi kuboka redu rezvetekinoroji.",
            "nd": "Ngiyakuzwa ukuthi udaba alukaxazululwanga. Ungangitshela okwengeziweyo? Ngokwesibonelo: Awutholi i-signal nhlobo, i-data iyaphuza, kumbe kunama-error messages? Futhi, usendaweni bani? Ngingadlulisela lokhu ethimini lethu yezobuchwepheshe.",
        },
        "security_pin": {
            "en": "I want to make sure I help you correctly. Could you tell me: Did you forget your PIN, or was it blocked? Which service is affected (EcoCash, bank app, etc.)?",
            "sn": "Ndinoda kuita shuwa kuti ndikubatsire nemazvo. Unganditsanangurira here: Wakakanganwa PIN yako, kana kuti yakavharwa? Ndeapi service ari kukanganiswa (EcoCash, bank app, etc.)?",
            "nd": "Ngifuna ukuqinisekisa ukuthi ngikusiza kahle. Ungangitshela: Uyikhohlwe i-PIN yakho, noma ivalelwe? Yisiphi isevisi esithintekayo (EcoCash, i-bank app, njll)?",
        },
        "transaction_dispute": {
            "en": "I can help with that. Please share one more detail so I can resolve this correctly: transaction reference, amount, and the account/wallet used.",
            "sn": "Ndinogona kukubatsira. Ndapota ndiudze chimwe chinhu chimwe chete kuti ndigadzirise nemazvo: reference yetransaction, mari, ne account/wallet yawashandisa.",
            "nd": "Ngingakusiza ngalokho. Sicela unikeze imininingwane eyodwa ukuze ngilungise kahle: i-reference ye-transaction, inani, ne-account/wallet oyisebenzisileyo.",
        },
    }

    STRICT_ESCALATION_INTENTS = {
        "escalation_request",
    }

    HIGH_RISK_KEYWORDS = [
        "fraud", "scam", "stolen", "hacked", "unauthorized", "chargeback", "legal",
        "kubirwa", "kubiwa", "hacked account", "phishing", "money stolen",
        "ubuqili", "ukutshontshwa", "ukungena okungagunyaziwe"
    ]

    def __init__(self, model_name: str = "xlm-roberta-base", confidence_threshold: float = 0.85):
        """
        Initialize NLP Service
        
        Args:
            model_name: Name of the transformer model (not used in rule-based version)
            confidence_threshold: Minimum confidence score for autonomous handling
        """
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.tokenizer = None
        self.use_ml_model = False
        self.id2label = {i: label for i, label in enumerate(self.INTENT_LABELS)}
        self.label2id = {label: i for i, label in enumerate(self.INTENT_LABELS)}
        
        # Use imported comprehensive templates if available, fallback to class templates
        if TEMPLATES_AVAILABLE and RESPONSE_TEMPLATES:
            self._response_templates = RESPONSE_TEMPLATES
            logger.info("✅ Loaded comprehensive response templates")
        else:
            self._response_templates = self.RESPONSE_TEMPLATES
            logger.info("Using fallback response templates")
        
        # Try to load trained model (configured path / latest retrained folder / base folder)
        backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        default_trained_model_path = os.path.join(backend_root, "trained_model")
        configured_model_path = os.path.abspath(os.path.join(backend_root, settings.NLP_MODEL_PATH))

        retrained_candidates = []
        try:
            for child_name in os.listdir(backend_root):
                child_path = os.path.join(backend_root, child_name)
                if os.path.isdir(child_path) and child_name.startswith("trained_model_retrained_"):
                    retrained_candidates.append((os.path.getmtime(child_path), child_path))
        except Exception:
            retrained_candidates = []

        retrained_candidates.sort(key=lambda item: item[0], reverse=True)

        model_root_candidates: List[str] = []
        if os.path.exists(configured_model_path):
            model_root_candidates.append(configured_model_path)
        model_root_candidates.extend([path for _, path in retrained_candidates])
        if os.path.exists(default_trained_model_path):
            model_root_candidates.append(default_trained_model_path)

        if TRANSFORMERS_AVAILABLE and model_root_candidates:
            model_load_candidates: List[str] = []

            for model_root_path in model_root_candidates:
                model_load_candidates.append(model_root_path)

                checkpoint_candidates = []
                for child_name in os.listdir(model_root_path):
                    child_path = os.path.join(model_root_path, child_name)
                    if os.path.isdir(child_path) and child_name.startswith("checkpoint-"):
                        suffix = child_name.replace("checkpoint-", "")
                        if suffix.isdigit():
                            checkpoint_candidates.append((int(suffix), child_path))

                checkpoint_candidates.sort(key=lambda item: item[0], reverse=True)
                model_load_candidates.extend([path for _, path in checkpoint_candidates])

            loaded = False
            for candidate_path in model_load_candidates:
                try:
                    tokenizer_sources = [candidate_path, default_trained_model_path, model_name]
                    tokenizer = None
                    tokenizer_source_used = None
                    for tokenizer_source in tokenizer_sources:
                        try:
                            tokenizer = AutoTokenizer.from_pretrained(tokenizer_source)
                            tokenizer_source_used = tokenizer_source
                            break
                        except Exception:
                            continue

                    if tokenizer is None:
                        raise RuntimeError("No tokenizer source available for model loading")

                    model = AutoModelForSequenceClassification.from_pretrained(candidate_path)
                    model.eval()

                    self.tokenizer = tokenizer
                    self.model = model

                    config_id2label = getattr(model.config, "id2label", {}) or {}
                    config_label2id = getattr(model.config, "label2id", {}) or {}
                    if config_id2label:
                        self.id2label = {
                            int(k): normalize_intent(v)
                            for k, v in config_id2label.items()
                        }
                    if config_label2id:
                        self.label2id = {
                            normalize_intent(k): int(v)
                            for k, v in config_label2id.items()
                        }

                    candidate_parent = os.path.dirname(candidate_path)

                    # Load label mappings from the same model root first, then default trained_model.
                    label_mappings_candidates = [
                        os.path.join(candidate_path, "label_mappings.json"),
                        os.path.join(candidate_parent, "label_mappings.json"),
                        os.path.join(default_trained_model_path, "label_mappings.json")
                    ]
                    expected_num_labels = int(getattr(model.config, "num_labels", 0) or 0)
                    for label_mappings_path in label_mappings_candidates:
                        if os.path.exists(label_mappings_path):
                            try:
                                with open(label_mappings_path, "r", encoding="utf-8") as f:
                                    mappings = json.load(f)

                                id2label_raw = mappings.get("id2label", {})
                                label2id_raw = mappings.get("label2id", {})

                                parsed_id2label = {
                                    int(k): normalize_intent(v)
                                    for k, v in id2label_raw.items()
                                }
                                parsed_label2id = {
                                    normalize_intent(k): int(v)
                                    for k, v in label2id_raw.items()
                                }

                                if expected_num_labels and len(parsed_id2label) != expected_num_labels:
                                    logger.warning(
                                        f"Skipping label mappings from {label_mappings_path}: "
                                        f"expected {expected_num_labels}, found {len(parsed_id2label)}"
                                    )
                                    continue

                                self.id2label = parsed_id2label
                                self.label2id = parsed_label2id
                                break
                            except Exception as mapping_error:
                                logger.warning(
                                    f"Failed to read label mappings at {label_mappings_path}: {mapping_error}"
                                )

                    self.use_ml_model = True
                    logger.info(
                        f"✅ Trained ML model loaded successfully from {candidate_path} "
                        f"(tokenizer: {tokenizer_source_used})"
                    )
                    loaded = True
                    break
                except Exception as e:
                    logger.warning(f"Model load failed for {candidate_path}: {e}")

            if not loaded:
                logger.info("Falling back to rule-based NLP")
        elif TRANSFORMERS_AVAILABLE:
            logger.info("Transformers library available but no trained model found")
            logger.info("Using rule-based NLP. Run model_training.py to train a model.")
        else:
            logger.info("Transformers library not available - using rule-based NLP")
    
    def detect_language(self, text: str) -> str:
        """
        Detect the language of the input text.
        
        Args:
            text: Input text from user
            
        Returns:
            Language code ('en', 'sn', or 'nd')
        """
        text_lower = (text or "").lower().strip()
        if not text_lower:
            return "en"

        # Strong markers first (high precision)
        strong_scores = {"en": 0, "sn": 0, "nd": 0}
        for lang, markers in self.LANGUAGE_STRONG_MARKERS.items():
            for marker in markers:
                marker_pattern = re.escape(marker)
                if re.search(rf"\b{marker_pattern}\b", text_lower):
                    strong_scores[lang] += 2

        # Weighted keyword scoring using word boundaries
        scores = {"en": 0, "sn": 0, "nd": 0}
        for lang, keywords in self.LANGUAGE_KEYWORDS.items():
            for keyword in keywords:
                keyword_pattern = re.escape(keyword)
                if re.search(rf"\b{keyword_pattern}\b", text_lower):
                    scores[lang] += 1

        combined_scores = {
            lang: scores[lang] + strong_scores[lang]
            for lang in {"en", "sn", "nd"}
        }

        # Tie-breakers for closely-related Bantu language structures
        if combined_scores["nd"] == combined_scores["sn"] and combined_scores["nd"] > 0:
            ndebele_bias_terms = ["ngi", "ngi", "ngicela", "ngifuna", "nginenkinga", "imali", "yami"]
            shona_bias_terms = ["ndi", "ndiri", "ndine", "ndapota", "mari", "yangu"]
            nd_bias = sum(1 for term in ndebele_bias_terms if re.search(rf"\b{re.escape(term)}", text_lower))
            sn_bias = sum(1 for term in shona_bias_terms if re.search(rf"\b{re.escape(term)}", text_lower))
            if nd_bias > sn_bias:
                combined_scores["nd"] += 1
            elif sn_bias > nd_bias:
                combined_scores["sn"] += 1

        detected_lang = max(combined_scores, key=combined_scores.get) if max(combined_scores.values()) > 0 else "en"
        logger.info(f"Detected language: {detected_lang} for text: '{text[:50]}...'")
        return detected_lang

    def optimize_prompt(self, message: str, language: str = "en") -> str:
        """
        Normalize user input before intent processing to improve consistency.
        """
        optimized = (message or "").strip()
        optimized = re.sub(r"\s+", " ", optimized)
        optimized = re.sub(r"[\u200b-\u200f\ufeff]", "", optimized)
        optimized = re.sub(r"([!?.,])\1+", r"\1", optimized)

        typo_map = self.TYPO_NORMALIZATION_MAP.get(language, {})
        if typo_map:
            for wrong, correct in typo_map.items():
                optimized = re.sub(
                    rf"\b{re.escape(wrong)}\b",
                    correct,
                    optimized,
                    flags=re.IGNORECASE,
                )

        shortcuts = self.PROMPT_SHORTCUTS.get(language, {})
        if shortcuts:
            words = optimized.split(" ")
            normalized_words = [shortcuts.get(word.lower(), word) for word in words]
            optimized = " ".join(normalized_words)

        return optimized

    def _resolve_structured_option(
        self,
        text: str,
        language: str,
        previous_intent: Optional[str]
    ) -> Optional[Dict[str, any]]:
        """
        Deterministic option response flow for intents that provide explicit choices.
        """
        if not previous_intent:
            return None

        flow = self.STRUCTURED_OPTION_FLOWS.get(previous_intent)
        if not flow:
            return None

        text_lower = text.lower().strip()

        for choice_data in flow.get("choices", {}).values():
            for keyword in choice_data.get("keywords", []):
                keyword_lower = keyword.lower()
                if text_lower == keyword_lower or keyword_lower in text_lower:
                    responses = choice_data.get("responses", {})
                    response_text = responses.get(language) or responses.get("en")
                    if response_text:
                        return {
                            "language": language,
                            "intent": flow.get("intent", previous_intent),
                            "confidence": 0.99,
                            "entities": {},
                            "response": response_text,
                            "needs_escalation": False,
                            "timestamp": datetime.now().isoformat()
                        }

        return None

    def _normalize_intent(self, intent: str) -> str:
        normalized = normalize_intent(intent)
        if not normalized:
            return "general_inquiry"
        return normalized
    
    def classify_intent(self, text: str, language: str = "en", previous_intent: Optional[str] = None) -> Tuple[str, float]:
        """
        Classify the intent of the user's message using hybrid ML + rule-based approach.
        
        Args:
            text: User's message
            language: Detected language
            
        Returns:
            Tuple of (intent, confidence_score)
        """
        text_lower = text.lower().strip()
        
        # For very short messages (1-2 words), always check rules first
        # This handles simple greetings like "hi", "hello", "makadini" reliably
        if len(text.split()) <= 2:
            rule_intent, rule_confidence = self._classify_with_rules(text, previous_intent)
            if rule_confidence >= 0.90:  # High confidence rule match
                logger.info(f"[Hybrid] Short message matched by rules: {rule_intent} ({rule_confidence:.2%})")
                return self._normalize_intent(rule_intent), rule_confidence
        
        # Always check rules first for specific phrase matches
        rule_intent, rule_confidence = self._classify_with_rules(text, previous_intent)
        if rule_confidence >= 0.92:  # Very high confidence rule match
            logger.info(f"[Hybrid] High-confidence rule match: {rule_intent} ({rule_confidence:.2%})")
            return self._normalize_intent(rule_intent), rule_confidence
        
        # Use ML model if available
        if self.use_ml_model and self.model is not None and self.tokenizer is not None:
            ml_intent, ml_confidence = self._classify_with_ml(text)
            
            # If ML confidence is high (above 60%), prefer ML
            if ml_confidence >= 0.60:
                return self._normalize_intent(ml_intent), ml_confidence
            
            # For medium ML confidence (40-60%), compare with rule-based
            if ml_confidence >= 0.40:
                # Use rule-based if it has good confidence
                if rule_confidence >= 0.75:
                    logger.info(f"[Hybrid] ML medium ({ml_confidence:.2%}), using rules: {rule_intent} ({rule_confidence:.2%})")
                    return self._normalize_intent(rule_intent), rule_confidence
                return self._normalize_intent(ml_intent), ml_confidence
            
            # For low ML confidence, use rule-based if available
            if rule_confidence >= 0.70:
                logger.info(f"[Hybrid] ML confidence too low ({ml_confidence:.2%}), using rule-based: {rule_intent} ({rule_confidence:.2%})")
                return self._normalize_intent(rule_intent), rule_confidence
            
            # Otherwise return ML result (even if low confidence)
            return self._normalize_intent(ml_intent), ml_confidence
        
        # Fall back to rule-based classification if no ML model
        return self._normalize_intent(rule_intent), rule_confidence
    
    def _classify_with_ml(self, text: str) -> Tuple[str, float]:
        """Classify intent using the trained ML model."""
        try:
            import torch
            
            # Tokenize input
            encoding = self.tokenizer(
                text,
                truncation=True,
                padding='max_length',
                max_length=128,
                return_tensors='pt'
            )
            
            # Get prediction
            with torch.no_grad():
                outputs = self.model(**encoding)
                probabilities = torch.softmax(outputs.logits, dim=1)
                confidence, predicted_class = torch.max(probabilities, dim=1)
            
            intent = self.id2label.get(predicted_class.item(), "general_inquiry")
            intent = self._normalize_intent(intent)
            confidence_score = confidence.item()
            
            logger.info(f"[ML] Classified intent: {intent} with confidence: {confidence_score:.4f}")
            return intent, confidence_score
            
        except Exception as e:
            logger.error(f"ML classification failed: {e}")
            # Fall back to rules
            return self._classify_with_rules(text)
    
    def _classify_with_rules(self, text: str, previous_intent: Optional[str] = None) -> Tuple[str, float]:
        """Classify intent using rule-based approach."""
        text_lower = text.lower().strip()

        # Explicit profile update requests should not be confused with security/PIN intent.
        profile_update_terms = [
            "update profile", "update my profile", "change my profile",
            "change my phone number", "update phone number", "new phone number",
            "change my email", "update email", "email address",
            "change address", "update address", "kuchinja email", "kuchinja nhamba",
            "update my details", "change my details"
        ]
        if any(term in text_lower for term in profile_update_terms):
            return "update_profile", 0.97

        # Explicit account closure requests should map to account_closure.
        account_closure_terms = [
            "close my account", "close account", "account closure", "terminate my account",
            "delete my account", "cancel my account", "kuvhara account", "vala i-account",
            "kurasa line", "kurasa account", "ndoda kurasa", "cancel my line",
        ]
        # Also match "close my X account" pattern (e.g., "close my ecocash account")
        has_closure_verb = any(v in text_lower for v in ["close", "terminate", "delete", "cancel", "kuvhara", "kurasa"])
        has_account_word = "account" in text_lower or "line" in text_lower
        if any(term in text_lower for term in account_closure_terms) or (has_closure_verb and has_account_word):
            return "account_closure", 0.97

        # Explicit wallet fee queries should not be routed to transfer/dispute intents.
        wallet_fee_terms = [
            "wallet fee", "wallet fees", "ecocash fee", "ecocash fees", "transfer fee",
            "transfer fees", "transaction fee", "transaction fees", "withdrawal fee",
            "withdrawal fees", "imtt", "charges", "service charge", "how much fee",
            "mari ye charge", "fee inobhadharwa", "tax inobhadharwa",
            "cost to send", "how much to send", "how much does it cost",
        ]
        if any(term in text_lower for term in wallet_fee_terms):
            return "mobile_wallet_fees", 0.97

        # Keep Shona/Ndebele borrowing language anchored to loan intent.
        loan_native_terms = ["kukwereta", "kuborra", "imboleko", "ukuboleka"]
        if any(term in text_lower for term in loan_native_terms):
            return "loan_inquiry", 0.97

        # Structured dispute evidence payload (reference + amount + phone).
        has_reference = bool(re.search(r"\b(?:tc|trx|ref)[a-z0-9]{8,}\b", text_lower))
        has_amount = bool(re.search(r"\$?\d+(?:\.\d{1,2})?", text_lower))
        has_phone = bool(re.search(r"\b(?:0|263)\d{9}\b", text_lower))
        if has_reference and has_amount and has_phone:
            return "transaction_dispute", 0.98

        # Provider-priority support: if a user asks generally about a mobile wallet,
        # keep intent aligned to that institution before generic transfer/network rules.
        # Exclude closure/fee/password queries that happen to mention a provider.
        provider_terms = ["ecocash", "onemoney", "one money", "innbucks", "telecash"]
        provider_support_terms = ["help", "issue", "problem", "not working", "wallet", "services", "transfer", "send money", "work", "register", "sign up", "open"]
        provider_exclusion_terms = ["close", "terminate", "delete", "cancel", "fee", "charge", "cost", "password", "forgot", "login", "pin"]
        if (any(term in text_lower for term in provider_terms)
            and any(term in text_lower for term in provider_support_terms)
            and not any(term in text_lower for term in provider_exclusion_terms)):
            return "mobile_money", 0.96

        # Strong priority for explicit escalation intent phrases
        escalation_phrases = [
            "escalate", "talk to agent", "human agent", "real person",
            "speak to an agent", "customer care", "representative", "connect me"
        ]
        if any(phrase in text_lower for phrase in escalation_phrases):
            return "escalation_request", 0.98

        # Strong complaint signals
        complaint_phrases = ["unacceptable", "not happy", "disappointed", "frustrated", "worst service"]
        if any(phrase in text_lower for phrase in complaint_phrases):
            return "complaint", 0.97

        # Strong priority for airtime/bundle deduction disputes
        airtime_terms = ["airtime", "top up", "topup", "bundle", "recharge", "mhepo"]
        dispute_terms = [
            "deducted", "debited", "did not receive", "didnt receive", "didn't receive",
            "did not recieve", "didnt recieve", "didn't recieve", "not received", "not recieved",
            "failed", "missing", "yakabviswa", "haina kupinda", "handina kuwana", "isina kupinda",
            "ikhutshwe", "angikatholi", "angitholanga"
        ]
        if any(term in text_lower for term in airtime_terms) and any(term in text_lower for term in dispute_terms):
            logger.info("[Rules] Airtime deduction dispute detected")
            return "transaction_dispute", 0.98

        # PIN reset / change PIN / blocked PIN → security_pin (before provider rule grabs EcoCash PIN)
        pin_terms = ["reset my pin", "change my pin", "pin is blocked", "pin blocked",
                     "forgot my pin", "pin reset", "change pin", "unblock my pin",
                     "kuchinja pin", "pin yangu", "reset pin"]
        if any(term in text_lower for term in pin_terms):
            logger.info("[Rules] PIN security issue detected")
            return "security_pin", 0.97
        # "PIN" mentioned alongside reset/forgot/change/block verbs (handles "reset my ecocash pin")
        if "pin" in text_lower and any(v in text_lower for v in ["reset", "forgot", "change", "block", "unblock"]):
            logger.info("[Rules] PIN + action verb → security_pin")
            return "security_pin", 0.97

        # Strong priority for SIM security issues
        if "sim" in text_lower and ("pin" in text_lower or "puk" in text_lower):
            logger.info("[Rules] SIM PIN/PUK security issue detected")
            return "security_pin", 0.98

        # SIM stolen / block SIM / lost SIM → security
        if "sim" in text_lower and any(t in text_lower for t in ["stolen", "block", "lost", "yabiwa", "vhara"]):
            logger.info("[Rules] SIM stolen/lost/block security issue detected")
            return "security_pin", 0.97

        # If the user is already in a complaint flow and sends their details (substantial message),
        # detect this as complaint detail submission rather than reclassifying.
        if previous_intent in ("complaint", "complaint_received") and len(text_lower) > 5:
            logger.info("[Rules] Complaint detail submission detected (previous_intent=complaint)")
            return "complaint_received", 0.95

        # If the user is in a transaction dispute flow and sends another message (any substantive
        # content) treat it as dispute details submitted — prevents infinite detail-gather loop.
        _simple_words = {
            "ok", "okay", "yes", "no", "yep", "nope", "fine", "sure", "thanks", "thank you",
            "hi", "hello", "hey", "mhoro", "mhoroi", "sawubona", "makadii", "makadini",
            "ndeipi", "ko", "yebo", "hie",
        }
        if previous_intent == "transaction_dispute" and len(text_lower) > 3 and text_lower.strip() not in _simple_words:
            logger.info("[Rules] Dispute detail submission detected (previous_intent=transaction_dispute)")
            return "dispute_details", 0.95

        # Card not working / card issues → card_request (before complaint catches 'not working')
        # But if the user is already in a complaint flow and sends substantial details, don't override
        if "card" in text_lower and any(t in text_lower for t in ["not working", "haisi kushanda", "lost", "stolen", "block", "replace", "new"]) \
                and previous_intent not in ("complaint", "complaint_received"):
            logger.info("[Rules] Card issue detected")
            return "card_request", 0.95

        # Shona: money was stolen / money taken → transaction_dispute (before balance rules match "mari yangu")
        shona_dispute_terms = [
            "mari yangu yakabiwa", "yakabiwa mari", "yakabviswa mari",
            "mari yakabiwa", "mari yaenda", "mari haina kupinda",
            "ndatumira mari kunumber isiriyo", "number isiriyo",
        ]
        if any(term in text_lower for term in shona_dispute_terms):
            return "transaction_dispute", 0.95

        # Shona: can't access account → password_reset
        shona_login_terms = [
            "kupinda mu account", "handisi kugona kupinda", "handikwanise kupinda",
            "handisi kukwanisa kupinda", "haigone kupinda", "login haisi kushanda",
        ]
        if any(term in text_lower for term in shona_login_terms):
            return "password_reset", 0.95

        # Shona: asking about my money / balance inquiry
        shona_balance_terms = [
            "nezvemari yangu", "kubvunza nezvemari", "mari yangu iri papi",
            "mari yangu yakamira", "kuona mari yangu",
        ]
        if any(term in text_lower for term in shona_balance_terms):
            return "balance_inquiry", 0.93

        # Shona: generic help request → general_inquiry
        shona_help_exact = ["ndinoda rubatsiro", "ndibatsireiwo", "ndibatsireiwo please", "ndinoda kubatsirwa"]
        if text_lower in shona_help_exact:
            return "general_inquiry", 0.93

        # Shona: phone refusing to send SMS / messages → network
        if any(t in text_lower for t in ["kutumira meseji", "kutumira sms", "sms harisi", "meseji harisi", "kuramba kutumira meseji"]):
            return "network_connectivity", 0.95

        # Shona: kubhadhara magetsi (pay electricity) → bill_payment
        shona_bill_terms = [
            "kubhadhara magetsi", "kubhadhara zesa", "kubhadhara dstv",
            "kubhadhara mvura", "kubhadhara bill", "kubhadhara mabhiri",
            "ndoda kubhadhara", "bhadhara magetsi", "bhadhara zesa",
            "haina kubhadharwa", "zesa yangu",
        ]
        if any(term in text_lower for term in shona_bill_terms):
            return "bill_payment", 0.95

        # Shona: open/create account → account_opening
        shona_opening_terms = ["kuvhura account", "ndoda kuvhura", "vhura account"]
        if any(term in text_lower for term in shona_opening_terms):
            return "account_opening", 0.93

        # "Econet shop" → branch_location (not ATM)
        if "econet shop" in text_lower or "nearest econet" in text_lower:
            return "branch_location", 0.95

        # Buy data / buy bundles → bill_payment (purchase intent, not network issue)
        buy_data_terms = ["buy data", "buy bundle", "buy bundles", "purchase data", "data bundle"]
        if any(term in text_lower for term in buy_data_terms):
            return "bill_payment", 0.95

        # Strong priority for connectivity/data quality issues
        network_strong_terms = [
            "5g", "activate 5g", "data depleted", "depleting fast",
            "data is being depleted", "depleted fast",
            "failing to buy data", "cannot buy data",
            "data harisi kushanda", "data haris kushanda", "data haisi kushanda",
            "data rangu", "data yangu", "internet harisi", "internet haisi",
            "network harisi", "network haisi", "network haris",
            "data inopera", "data yapera", "data yangu yapera",
            "haisi kubrowsa", "harisi kubrowsa", "kubrowsa harisi",
            "foni yangu haisi kubata network", "haisi kubata",
            "signal harisi", "signal haisi",
            "i-data ayisebenzi", "i-data ayilungi",
            "i-network ayisebenzi", "i-network ayibambi",
            "data not working", "internet not working", "network not working",
            "no signal", "no network", "no data",
            "can't browse", "cannot browse",
            "internet iri kuramba", "data iri kuramba", "network iri kuramba",
            "internet yaramba", "data yaramba",
            "ndakabatidza data", "ndabatidza data",
            "hapana network", "hapana signal",
        ]
        if any(term in text_lower for term in network_strong_terms):
            logger.info("[Rules] High-priority network/connectivity issue detected")
            return "network_connectivity", 0.97

        # Combinatorial: "data/internet/network" + Shona/Ndebele/English "not working" terms
        connectivity_subjects = ["data", "internet", "network", "signal", "4g", "lte"]
        not_working_terms = [
            "kushanda", "kubata", "haisi", "harisi", "haris",
            "ayisebenzi", "ayibambi", "ayilungi",
            "not working", "doesn't work", "won't work", "isn't working",
            "kuramba", "yaramba", "iri kuramba",
        ]
        if any(s in text_lower for s in connectivity_subjects) and any(t in text_lower for t in not_working_terms):
            logger.info("[Rules] Combinatorial network/connectivity issue detected")
            return "network_connectivity", 0.97

        # Strong priority for explicit escalation requests
        escalation_exact = {
            "agent", "human", "escalate", "real person", "talk to agent",
            "human agent", "representative", "customer care"
        }
        if text_lower in escalation_exact:
            logger.info(f"[Rules] Exact escalation match: {text_lower}")
            return "escalation_request", 0.99

        # Distinguish statement/history requests that include activity/history context.
        history_context_terms = ["zvandakaita", "history", "recent transactions", "last transactions", "svondo"]
        if "statement" in text_lower and any(term in text_lower for term in history_context_terms):
            return "transaction_history", 0.95

        # Handle statement period follow-up when previous turn was statement-related
        period_patterns = [
            r"\b(last\s+)?(7|30|60|90)\s+days\b",
            r"\bthis\s+(week|month)\b",
            r"\bprevious\s+month\b",
            r"\bcustom\b"
        ]
        if previous_intent in {"account_statement", "transaction_history"} and any(re.search(p, text_lower) for p in period_patterns):
            logger.info(f"[Rules] Statement follow-up period detected after {previous_intent}: {text_lower}")
            return "account_statement", 0.97
        
        # First: Check for exact match greetings (highest priority for simple messages)
        greeting_exact = [
            "hi", "hello", "hey", "mhoro", "mhoroi", "sawubona", "makadii", "makadini", 
            "masikati", "manheru", "mangwanani", "good morning", "good afternoon",
            "good evening", "hie", "howzit", "heita", "salibonani", "avuxeni",
            "goeie more", "molo", "dumelang", "sawubona", "ndeipi", "zvakaita sei",
            "zvirisei", "zvirissei", "zvakanaka", "kunjani", "yebo", "yo", "wena",
            "sei", "kwaziwai", "aah", "ko"
        ]
        
        if text_lower in greeting_exact:
            logger.info(f"[Rules] Exact greeting match: {text_lower}")
            return "greeting", 0.98
        
        # Check for greetings at the start of message
        for greeting in greeting_exact:
            if text_lower.startswith(greeting + " ") or text_lower.startswith(greeting + ",") or text_lower.startswith(greeting + "!"):
                logger.info(f"[Rules] Greeting prefix match: {greeting}")
                return "greeting", 0.95
        
        # Check for account statement specifically (often misclassified)
        # "statement" as a standalone word maps directly to account_statement
        if text_lower == "statement":
            logger.info(f"[Rules] Exact account_statement match: statement")
            return "account_statement", 0.95
        account_statement_phrases = [
            "account statement", "bank statement", "statement please", "get statement",
            "email statement", "send statement", "my statement", "statement of account",
            "mini statement", "full statement", "monthly statement", "statement copy",
            "last 7 days", "last 30 days", "last 60 days", "last 90 days"
        ]
        for phrase in account_statement_phrases:
            if phrase in text_lower:
                logger.info(f"[Rules] Account statement match: {phrase}")
                return "account_statement", 0.95

        # Balance inquiry phrase matches (before keyword scoring to avoid general_inquiry)
        balance_phrases = [
            "how much money", "my balance", "check balance", "account balance",
            "money in my account", "money do i have", "in my account",
        ]
        if any(p in text_lower for p in balance_phrases):
            return "balance_inquiry", 0.93
        # "balance" as standalone concept (not in compound like "balance transfer")
        if "balance" in text_lower and not any(x in text_lower for x in ["transfer", "fee", "charge"]):
            return "balance_inquiry", 0.92

        # Transaction history phrase matches
        transaction_phrases = [
            "transactions did i make", "recent transactions", "transaction history",
            "transactions this week", "transactions today", "past transactions",
        ]
        if any(p in text_lower for p in transaction_phrases):
            return "transaction_history", 0.93

        # Loan inquiry phrase matches
        loan_phrases = [
            "interest rate", "interest rates", "loan", "borrow money",
        ]
        if any(p in text_lower for p in loan_phrases):
            return "loan_inquiry", 0.93

        # Check for goodbye messages
        goodbye_exact = [
            "bye", "goodbye", "thanks", "thank you", "cheers", "later", "ok thanks",
            "maita basa", "ndatenda", "chisarai", "ngiyabonga", "sala kahle", 
            "hamba kahle", "fambai zvakanaka", "siyabonga", "done", "that's all"
        ]
        if text_lower in goodbye_exact:
            logger.info(f"[Rules] Exact goodbye match: {text_lower}")
            return "goodbye", 0.95
        
        # Rule-based intent classification (expanded for Zimbabwe financial services)
        intent_keywords = {
            "balance_inquiry": ["balance", "mari yangu", "imali yami", "how much do i have", "how much money", "ndine", "nginalo", "kuona mari", "account balance", "check balance", "show balance", "my money", "money in my account", "my account balance"],
            "account_statement": ["account statement", "bank statement", "mini statement", "email statement", "statement of account", "monthly statement", "statement copy", "last 7 days", "last 30 days", "last 60 days", "last 90 days", "7 days", "30 days", "60 days", "90 days"],
            "transaction_history": ["transaction history", "recent transactions", "past transactions", "last five", "what i spent", "zvandakaita", "imisebenzi", "record", "transactions did i make", "transactions this week", "transactions today"],
            "transfer_money": ["transfer", "send money", "tumira", "thumela", "kutumira", "wire", "send to", "pay someone", "ecocash send", "ukuthumela imali", "ngifuna ukuthumela"],
            "password_reset": ["password", "forgot", "reset", "kanganwa", "libala", "change password", "login problem", "can't login", "cannot login"],
            "loan_inquiry": ["loan", "borrow", "chikwereti", "imboleko", "mikwereti", "student loan", "interest rate", "lend me", "credit", "interest rates for loans"],
            "bill_payment": ["bill", "pay bill", "bhadhara", "khokhela", "zesa", "dstv", "airtime", "electricity", "water bill", "bundles", "pay for", "recharge", "magetsi", "kubhadhara"],
            "transaction_dispute": ["reverse", "wrong number", "refund", "dispute", "overcharged", "dzosera", "stolen", "unauthorized", "double charged", "imtt tax", "didn't receive", "failed but", "sent to wrong", "wrong recipient", "recover my money", "unknown number", "received funds from", "yakabiwa", "kunumber isiriyo"],
            "security_pin": ["pin", "blocked", "locked", "otp", "kyc", "suspicious", "limit", "link bank", "unauthorized access", "hacked", "lost phone", "vhara line", "change pin", "forgot pin", "reset pin", "puk", "sim replacement", "replace sim", "access to my line", "block this number", "unrecognized otp", "unknown otp"],
            "network_connectivity": ["ussd", "not working", "signal", "network", "data", "4g", "lte", "bundle", "browse", "system down", "sms", "sim card", "crashing", "offline", "app not working", "5g", "activate 5g", "data depleted", "depleting fast", "failing to buy data", "cannot buy data", "buy bundle failed"],
            "mobile_wallet_fees": ["fee", "charge", "cost", "monthly fee", "imtt", "withdrawal fee", "hidden charge", "how much to send", "transaction fee", "ecocash fee", "sending fee"],
            "account_opening": ["open account", "new account", "vhura account", "create account", "register", "sign up", "nyoresa", "join", "become member"],
            "card_request": ["card", "mastercard", "debit card", "credit card", "new card", "replacement card", "lost card", "stolen card", "block card", "ecocash mastercard", "card not working"],
            "branch_location": ["branch", "nearest branch", "location", "hours", "open saturday", "gweru branch", "harare branch", "bulawayo branch", "where is", "find branch", "ecocash shop"],
            "atm_location": ["atm", "cash out", "ecocash agent", "withdraw", "kuburitsa", "atm near me", "nearest atm", "cash point", "cash agent", "nearest ecocash agent", "nearest shop"],
            "escalation_request": ["human", "agent", "speak to", "talk to", "manager", "customer care", "call back", "real person", "supervisor", "someone help", "connect me", "escalate", "talk to agent", "human agent", "call me", "representative"],
            "greeting": ["hello", "hi", "hey", "mhoro", "mhoroi", "sawubona", "makadii", "makadini", "masikati", "good morning", "good afternoon", "mangwanani", "manheru", "ndeipi", "zvirisei", "zvirissei", "sei", "kwaziwai"],
            "goodbye": ["bye", "goodbye", "chisarai", "ndatenda", "sala kahle", "see you", "thanks", "thank you", "mazvita", "ngiyabonga", "done", "exit", "that's all"],
            "complaint": ["complain", "complaint", "problem", "issue", "dambudziko", "inkinga", "not working", "unhappy", "terrible", "worst", "disappointed", "angry", "frustrated", "unacceptable", "not happy"],
            "mobile_money": ["ecocash", "onemoney", "telecash", "innbucks", "mobile money", "mobile wallet", "wallet", "mukuru"],
            "general_inquiry": ["help", "info", "information", "question", "ndibatsireiwo", "how does", "what is", "requirements", "how to", "can you"],
        }
        
        # Count matches with weighted scoring
        intent_scores = {}
        for intent, keywords in intent_keywords.items():
            score = 0
            for keyword in keywords:
                keyword_pattern = re.escape(keyword)
                if re.search(rf"\b{keyword_pattern}\b", text_lower):
                    # Give higher weight to longer/more specific phrases
                    weight = len(keyword.split())
                    score += weight
            if score > 0:
                intent_scores[intent] = score / len(keywords)  # Normalize
        
        if intent_scores:
            best_intent = max(intent_scores, key=intent_scores.get)
            confidence = min(intent_scores[best_intent] + 0.7, 0.95)  # Boost for demo
            logger.info(f"[Rules] Classified intent: {best_intent} with confidence: {confidence}")
            return best_intent, confidence
        
        return "general_inquiry", 0.5
    
    def extract_entities(self, text: str, intent: str) -> Dict[str, str]:
        """
        Extract relevant entities from the text based on intent.
        
        Args:
            text: User's message
            intent: Classified intent
            
        Returns:
            Dictionary of extracted entities
        """
        entities = {}
        
        # Extract amounts (numbers with currency symbols or standalone)
        amount_pattern = r'\$?[\d,]+\.?\d*'
        amounts = re.findall(amount_pattern, text)
        if amounts:
            entities['amount'] = amounts[0]
        
        # Extract phone numbers (simple pattern)
        phone_pattern = r'\b\d{10,}\b'
        phones = re.findall(phone_pattern, text)
        if phones:
            entities['phone_number'] = phones[0]
        
        return entities
    
    def generate_response(self, intent: str, language: str, context: Dict = None) -> str:
        """
        Generate a response based on intent and language.
        
        Args:
            intent: Classified intent
            language: User's language
            context: Additional context (account data, etc.)
            
        Returns:
            Generated response string
        """
        context = context or {}
        
        # Get template - use instance templates (comprehensive if available)
        template = self._response_templates.get(intent, {}).get(
            language,
            self._response_templates.get(intent, {}).get("en", "I can help you with that.")
        )
        
        # Replace placeholders with actual data (support both ${key} and {key} formats)
        for key, value in context.items():
            placeholder = f"${{{key}}}"
            template = template.replace(placeholder, str(value))
            placeholder_alt = f"{{{key}}}"
            template = template.replace(placeholder_alt, str(value))
            if placeholder in template:
                template = template.replace(placeholder, str(value))
        
        return template

    def _clarification_response(self, language: str, provider_name: Optional[str] = None, previous_intent: Optional[str] = None) -> str:
        # Use context-aware prompt when previous intent has a specific template
        if previous_intent and previous_intent in self.CONTEXTUAL_CLARIFICATION_PROMPTS:
            prompts = self.CONTEXTUAL_CLARIFICATION_PROMPTS[previous_intent]
            base = prompts.get(language, prompts.get("en", ""))
        else:
            base = self.CLARIFICATION_PROMPTS.get(language, self.CLARIFICATION_PROMPTS["en"])
        if provider_name:
            return f"[{provider_name}] {base}"
        return base

    def _should_escalate(
        self,
        intent: str,
        confidence: float,
        message: str,
        context: Optional[Dict],
    ) -> bool:
        if intent in self.STRICT_ESCALATION_INTENTS:
            return True

        lower_message = (message or "").lower()
        if any(keyword in lower_message for keyword in self.HIGH_RISK_KEYWORDS) and confidence < 0.45:
            return True

        return False
    
    def process_message(
        self,
        message: str,
        user_language: str = None,
        context: Dict = None
    ) -> Dict[str, any]:
        """
        Process a user message end-to-end.
        
        Args:
            message: User's message
            user_language: User's preferred language (optional)
            context: Additional context
            
        Returns:
            Dict containing language, intent, confidence, entities, and response
        """
        preferred_language = (user_language or "").lower()
        language = preferred_language if preferred_language in {"en", "sn", "nd"} else self.detect_language(message)
        optimized_message = self.optimize_prompt(message, language)
        
        previous_intent = (context or {}).get("previous_intent")

        option_response = self._resolve_structured_option(
            text=optimized_message,
            language=language,
            previous_intent=previous_intent
        )
        if option_response:
            logger.info(f"Structured option selected for intent: {previous_intent}")
            return option_response

        # Classify intent
        intent, confidence = self.classify_intent(optimized_message, language, previous_intent=previous_intent)
        
        # Extract entities
        entities = self.extract_entities(optimized_message, intent)
        
        # Generate response
        response = self.generate_response(intent, language, context)
        
        provider_name = (context or {}).get("provider_name")

        # Determine if escalation is needed (resolve-first policy)
        needs_escalation = self._should_escalate(
            intent=intent,
            confidence=confidence,
            message=optimized_message,
            context=context,
        )

        # Low confidence does not auto-escalate; ask targeted clarification
        if confidence < self.confidence_threshold and not needs_escalation:
            # For short continuation messages, carry forward the previous intent
            # so the clarification prompt is contextually relevant
            effective_previous = previous_intent
            if effective_previous and effective_previous in self.CONTEXTUAL_CLARIFICATION_PROMPTS:
                intent = effective_previous
            else:
                intent = "general_inquiry"
            response = self._clarification_response(language, provider_name, previous_intent=effective_previous)
        
        result = {
            "language": language,
            "intent": intent,
            "confidence": confidence,
            "entities": entities,
            "response": response,
            "needs_escalation": needs_escalation,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Processed message - Intent: {intent}, Confidence: {confidence}, Escalation: {needs_escalation}")
        return result


# Singleton instance - uses threshold from config
nlp_service = NLPService(confidence_threshold=settings.NLP_CONFIDENCE_THRESHOLD)
