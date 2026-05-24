#!/usr/bin/env python3
"""
Ultimate Comprehensive Training Data Generator
Creates massive diverse datasets with semantic variations and real-world scenarios
"""

import json
import random
from typing import List, Dict
from collections import Counter
from pathlib import Path

class UltimateDataGenerator:
    """Generate comprehensive training data with semantic diversity"""
    
    def __init__(self):
        random.seed(42)
        
        # Numeric variations for realistic scenarios
        self.amounts = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000]
        self.account_types = ["main", "savings", "business", "checking", "student", "joint"]
        self.common_names = ["John", "Mary", "Gift", "Blessing", "Tendai", "Mutsa", "Amahle", "Sipho"]
        self.banks = ["EcoCash", "OneMoney", "Telecash", "ZIPIT"]
        self.days = ["yesterday", "last week", "today", "this morning", "recently", "just now"]
        
    def generate_shona_comprehensive(self) -> List[Dict]:
        """Generate comprehensive Shona dataset with multiple strategies"""
        records = []
        
        intent_generators = {
            "balance_inquiry": self._generate_shona_balance,
            "transaction_history": self._generate_shona_transaction_history,
            "transfer_money": self._generate_shona_transfer,
            "password_reset": self._generate_shona_password,
            "loan_inquiry": self._generate_shona_loan,
            "bill_payment": self._generate_shona_bill,
            "mobile_money": self._generate_shona_mobile,
            "account_statement": self._generate_shona_statement,
            "transaction_dispute": self._generate_shona_dispute,
            "account_opening": self._generate_shona_account_open,
            "card_request": self._generate_shona_card,
            "atm_location": self._generate_shona_atm,
            "greeting": self._generate_shona_greeting,
            "goodbye": self._generate_shona_goodbye,
            "complaint": self._generate_shona_complaint,
            "general_inquiry": self._generate_shona_general,
            "update_profile": self._generate_shona_update_profile,
            "account_closure": self._generate_shona_closure,
            "security_pin": self._generate_shona_security_pin,
            "network_connectivity": self._generate_shona_network,
            "mobile_wallet_fees": self._generate_shona_fees,
            "branch_location": self._generate_shona_branch,
            "escalation_request": self._generate_shona_escalation,
        }
        
        for intent, gen_func in intent_generators.items():
            intent_records = gen_func()
            records.extend(intent_records)
            print(f"    ✓ {intent}: {len(intent_records)} records")
        
        return records
    
    def generate_ndebele_comprehensive(self) -> List[Dict]:
        """Generate comprehensive Ndebele dataset"""
        records = []
        
        intent_generators = {
            "balance_inquiry": self._generate_ndebele_balance,
            "transaction_history": self._generate_ndebele_transaction_history,
            "transfer_money": self._generate_ndebele_transfer,
            "password_reset": self._generate_ndebele_password,
            "loan_inquiry": self._generate_ndebele_loan,
            "bill_payment": self._generate_ndebele_bill,
            "mobile_money": self._generate_ndebele_mobile,
            "account_statement": self._generate_ndebele_statement,
            "transaction_dispute": self._generate_ndebele_dispute,
            "account_opening": self._generate_ndebele_account_open,
            "card_request": self._generate_ndebele_card,
            "atm_location": self._generate_ndebele_atm,
            "greeting": self._generate_ndebele_greeting,
            "goodbye": self._generate_ndebele_goodbye,
            "complaint": self._generate_ndebele_complaint,
            "general_inquiry": self._generate_ndebele_general,
            "update_profile": self._generate_ndebele_update_profile,
            "account_closure": self._generate_ndebele_closure,
            "security_pin": self._generate_ndebele_security_pin,
            "network_connectivity": self._generate_ndebele_network,
            "mobile_wallet_fees": self._generate_ndebele_fees,
            "branch_location": self._generate_ndebele_branch,
            "escalation_request": self._generate_ndebele_escalation,
        }
        
        for intent, gen_func in intent_generators.items():
            intent_records = gen_func()
            records.extend(intent_records)
            print(f"    ✓ {intent}: {len(intent_records)} records")
        
        return records
    
    # SHONA GENERATORS (650+ records each)
    def _generate_shona_balance(self) -> List[Dict]:
        variations = []
        amount = random.choice(self.amounts)
        acct = random.choice(self.account_types)
        base_phrases = [
            f"Ndipei balance yangu", 
            f"Ndikumbire {acct} account balance", 
            f"Cheka mari yangu",
            f"Ndikumbire ingcediso yangu",
            f"Mari yangu yava mangani",
            f"Account yangu ine mari mangani?",
            f"Ndipei summary yeaccount yangu",
            f"Cheka {acct} balance yangu",
            f"Ndipei detailed statement yangu",
            f"Account yangu yakanaka here",
            f"Ndipei funds available",
            f"Cheka account yangu zvino",
            f"Ndipei current balance",
            f"Mari yangu ndayapihwa here",
            f"Ndikumbire available funds",
        ]
        
        for _ in range(650):
            text = random.choice(base_phrases)
            if random.random() > 0.5:
                text += "?"
            variations.append({
                "text": text,
                "intent": "balance_inquiry",
                "language": "sn"
            })
        return variations
    
    def _generate_shona_transaction_history(self) -> List[Dict]:
        variations = []
        day = random.choice(self.days)
        bank = random.choice(self.banks)
        
        phrases = [
            f"Ndipei transaction history yangu",
            f"Matranzaction angu {day}",
            f"Cheka mari yandaituma {day}",
            f"Ndifuna kuzoona transactions angu",
            f"Mari yandakatuma kupi {day}",
            f"Statement yangu {day}",
            f"Ndipei transfer history yangu",
            f"Cheka zvandakataura",
            f"Ndikumbire payment history",
            f"Transactions yangu chii?",
            f"Ndipei {bank} history yangu",
            f"Cheka activity yangu",
            f"Matranzaction angu {day}?",
            f"Ndifuna kuzoona activity yangu",
            f"Ndipei full statement yangu",
        ]
        
        for _ in range(650):
            text = random.choice(phrases)
            if random.random() > 0.5:
                text += "?"
            variations.append({
                "text": text,
                "intent": "transaction_history",
                "language": "sn"
            })
        return variations
    
    def _generate_shona_transfer(self) -> List[Dict]:
        variations = []
        amount = random.choice(self.amounts)
        name = random.choice(self.common_names)
        day = random.choice(self.days)
        
        phrases = [
            f"Ndingakataura mari ku{name}?",
            f"Tumai {amount} ku{name}",
            f"Ndingakabhadhura {amount} seiko?",
            f"Ndinoda kutuma {amount} kudzimba",
            f"Ndingakaisa {amount} muaccount yangu?",
            f"Tumai mari yangu {day}",
            f"Ndingakatuma mari kunzira?",
            f"Transfer {amount} ngakumbira",
            f"Ndikumbire transfer option",
            f"Ndingakataura seiko?",
            f"Mari yangu ingakaisa kupi?",
            f"Tumai money yangu nguo",
            f"Ndingakabhadhura mari seiko?",
            f"Katuma {amount} immediately",
            f"Ndingakasiyana mari kunzira?",
        ]
        
        for _ in range(650):
            text = random.choice(phrases)
            if random.random() > 0.5:
                text += "?"
            variations.append({
                "text": text,
                "intent": "transfer_money",
                "language": "sn"
            })
        return variations
    
    def _generate_shona_password(self) -> List[Dict]:
        variations = []
        phrases = [
            "Ndakakoseseka password yangu",
            "Reset password yangu ngapota",
            "Ndakasikwa PIN yangu",
            "Ndipei password yatsva",
            "Ndikumbire PIN reset",
            "Password yangu yatowakwa",
            "Ndinoda kuchange PIN",
            "Kunzira yekureset password?",
            "Security PIN yangu yatowa",
            "Ndakakoseseka login credentials",
            "Ndinoda password yatsva",
            "Reset PIN yangu kare",
            "Ndakasikwa account access",
            "Ndipei access back",
            "Kunzira yokudulula password?",
            "Ndikombire new credentials",
            "Ndakakoseseka mumwe PIN",
            "Kunzira yekubhadhura credentials?",
            "Password yangu yawa",
            "PIN reset request",
        ]
        
        for _ in range(650):
            text = random.choice(phrases)
            if random.random() > 0.5:
                text += "?"
            variations.append({
                "text": text,
                "intent": "password_reset",
                "language": "sn"
            })
        return variations
    
    def _generate_shona_loan(self) -> List[Dict]:
        variations = []
        amount = random.choice(self.amounts)
        
        phrases = [
            f"Ndingakakopa {amount}?",
            f"Loan yatsva ndingakora?",
            f"Interest rate ndipei?",
            f"Ndingakakopa seiko?",
            f"Kurapidza loan {amount}",
            f"Loan application process",
            f"Ndikumbire loan details",
            f"Mari yakopwa inodiwa?",
            f"Ndingakakora business loan?",
            f"Loan approval time?",
            f"Ndipei loan options",
            f"Kutenda loan requirements",
            f"Ndingakakopa personal loan?",
            f"Ndikumbire loan quote",
            f"Loan eligibility check",
            f"Ndinoda kurapidza loan",
            f"Ndipei repayment terms",
            f"Loan inoshandira seiko?",
            f"Ndikumbire loan estimation",
            f"Kurapidza {amount} loan",
        ]
        
        for _ in range(650):
            text = random.choice(phrases)
            if random.random() > 0.5:
                text += "?"
            variations.append({
                "text": text,
                "intent": "loan_inquiry",
                "language": "sn"
            })
        return variations
    
    def _generate_shona_bill(self) -> List[Dict]:
        variations = []
        bills = ["electricity", "water", "internet", "phone", "rent", "tax", "school fees"]
        
        phrases = [
            f"Bhadzurai stima yangu ngapota",
            f"Bill payment options",
            f"Ndingabhadhura seiko?",
            f"Bilini yangu ndipei",
            f"Bhadzurai mbazi yangu",
            f"Payment process kunzira?",
            f"Ndikumbire bill statement",
            f"Kana kubhadhura kare?",
            f"Billing history yangu?",
            f"Ndipei outstanding balance",
            f"Bhadzurai now please",
            f"Bill payment seiko?",
            f"Ndingabhadhura online?",
            f"Bill installation plan",
            f"Ndikumbire payment reference",
            f"Bhadzurai immediately",
            f"Bill inquiries now",
            f"Ndikumbire invoice",
            f"Payment status request",
            f"Bhadzurai through account",
        ]
        
        for _ in range(650):
            text = random.choice(phrases)
            if random.random() > 0.5:
                text += "?"
            variations.append({
                "text": text,
                "intent": "bill_payment",
                "language": "sn"
            })
        return variations
    
    # Simplified generators for remaining intents (shorter, balanced)
    def _generate_shona_mobile(self) -> List[Dict]:
        phrases = ["Ecocash unganditsanangura", "Mobile money details", "Ndipei wallet info", "ZIPIT services", "Mobile payment seiko", "Wallet balance check", "Mobile services available", "Ecocash account setup", "ZIPIT transfer how", "Mobile wallet features"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "mobile_money", "language": "sn"} for _ in range(650)]
    
    def _generate_shona_statement(self) -> List[Dict]:
        phrases = ["Ndipei statement yangu", "Statement download how", "Account statement PDF", "Monthly statement please", "Statement sent email", "Tax statement needed", "Statement history check", "Ndikumbire full statement", "Statement yatowa here", "Detailed statement required"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "account_statement", "language": "sn"} for _ in range(650)]
    
    def _generate_shona_dispute(self) -> List[Dict]:
        phrases = ["Transaction nguvangirire", "Mari yaikohwichitai", "Dispute request ngapota", "Mhaka yetransaction", "Refund needed urgently", "Charge yaikohwichitai", "Ndakasadya transaction ino", "Investigation requested", "Unauthorized charge report", "Reversion request please"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "transaction_dispute", "language": "sn"} for _ in range(650)]
    
    def _generate_shona_account_open(self) -> List[Dict]:
        phrases = ["Account yatsva kunzira", "Account opening process", "Ndikumbire account details", "New account setup how", "Account eligibility check", "Requirements feuaccount", "Account types available", "Account opening fee", "Documents needed please", "Account activation timing"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "account_opening", "language": "sn"} for _ in range(650)]
    
    def _generate_shona_card(self) -> List[Dict]:
        phrases = ["Card yatsva kunzira", "Debit card application", "Card delivery time", "Card activation please", "Replacement card needed", "Card status check", "Card features info", "Virtual card available", "Card security details", "Card request form"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "card_request", "language": "sn"} for _ in range(650)]
    
    def _generate_shona_atm(self) -> List[Dict]:
        phrases = ["ATM kupi isinakure", "ATM location finder", "Branch ATM available", "ATM hours chii", "Nearest ATM please", "ATM network coverage", "ATM withdrawal limit", "ATM installation places", "Other ATM usage allowed", "ATM fees charged"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "atm_location", "language": "sn"} for _ in range(650)]
    
    def _generate_shona_greeting(self) -> List[Dict]:
        phrases = ["Mangwanani", "Mwayi", "Masikati", "Howzit", "Yo", "Jambai", "Ndapota", "Hie"]
        return [{"text": random.choice(phrases), "intent": "greeting", "language": "sn"} for _ in range(100)]
    
    def _generate_shona_goodbye(self) -> List[Dict]:
        phrases = ["Chidzokero", "Dzai", "Bye", "Mwasakata", "Zuva nako", "Kuonana", "Nyarara nako"]
        return [{"text": random.choice(phrases), "intent": "goodbye", "language": "sn"} for _ in range(100)]
    
    def _generate_shona_complaint(self) -> List[Dict]:
        phrases = ["Ndinoda kupikirisa", "Service yakaipa zvino", "Complaint kuzviitai", "Ndakasadya batsirwa", "Ndakasadya kushanda", "Mufananidzo hauwanikwa", "Zvakaipa here", "Zuva rega rega"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "complaint", "language": "sn"} for _ in range(200)]
    
    def _generate_shona_general(self) -> List[Dict]:
        phrases = ["Ndinoda kubudirira", "Ungandibatsira", "Ndipei info", "Unditsanangure sei", "Services yenyu chii", "Details chii"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "general_inquiry", "language": "sn"} for _ in range(200)]
    
    def _generate_shona_update_profile(self) -> List[Dict]:
        phrases = ["Profile yatsva kunzira", "Details kuchange", "Phone number new", "Email update needed", "Address change please", "Name update request", "Profile modification how", "Information update process"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "update_profile", "language": "sn"} for _ in range(200)]
    
    def _generate_shona_closure(self) -> List[Dict]:
        phrases = ["Account vhara kunzira", "Account closure request", "Account termination how", "Delete account please", "Close account now", "Account closure process"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "account_closure", "language": "sn"} for _ in range(200)]
    
    def _generate_shona_security_pin(self) -> List[Dict]:
        phrases = ["PIN yangu yatowa", "PIN reset please", "PIN change needed", "PIN forgotten help", "New PIN setup how", "Security PIN details", "PIN reset process"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "security_pin", "language": "sn"} for _ in range(200)]
    
    def _generate_shona_network(self) -> List[Dict]:
        phrases = ["Mhuri yava pasi", "Internet issue here", "App yakaputsika", "Loading inoita slow", "Connection error message", "Server yava pasi", "Page hayikuvhura"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "network_connectivity", "language": "sn"} for _ in range(200)]
    
    def _generate_shona_fees(self) -> List[Dict]:
        phrases = ["Ndipei charges", "Mari yatora mangani", "Transaction fee chii", "Withdrawal fee how much", "Monthly fees pane", "Fee structure please", "Charges detail"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "mobile_wallet_fees", "language": "sn"} for _ in range(200)]
    
    def _generate_shona_branch(self) -> List[Dict]:
        phrases = ["Branch kupi isina kure", "Office address please", "Branch hours chii", "Nearest branch location", "Branch network where", "Branch opening times"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "branch_location", "language": "sn"} for _ in range(200)]
    
    def _generate_shona_escalation(self) -> List[Dict]:
        phrases = ["Manager with please", "Escalate urgent", "Supervisor needed", "Speak senior agent", "Escalation request now"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "escalation_request", "language": "sn"} for _ in range(200)]
    
    # NDEBELE GENERATORS (similar structure)
    def _generate_ndebele_balance(self) -> List[Dict]:
        phrases = ["Ngiphe balance yami", "Ungandibele imali yami", "Chekela ingcediso yami", "Imali yami idlala kangakanani", "Account yami ngubani", "Ungandite balance"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "balance_inquiry", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_transaction_history(self) -> List[Dict]:
        phrases = ["Chekela izililo zami", "Ungandibele matranzaction", "Izililo zami zithini", "Imali endithlela kupi", "Ungandite history"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "transaction_history", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_transfer(self) -> List[Dict]:
        phrases = ["Ngingakwazi ukukhuluma", "Unganditsanangura transfer", "Tumai imali yami", "Ukukhuluma seiko", "Ungandibele"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "transfer_money", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_password(self) -> List[Dict]:
        phrases = ["Ndikhohlwe i-password", "Reset PIN yami", "Password yatsva", "Ungandibele", "PIN forgotten"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "password_reset", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_loan(self) -> List[Dict]:
        phrases = ["Ngingakwazi okuboleke", "Ungandibele amaloan", "Loan yatsva", "Interest rate ngubani", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "loan_inquiry", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_bill(self) -> List[Dict]:
        phrases = ["Ngingakwazi okurhoxisa", "Ungandibele ibhele", "Bhejula ngakanani", "Ungandite", "Bill payment"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "bill_payment", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_mobile(self) -> List[Dict]:
        phrases = ["Chii mobile money", "Ungandibele i-ecocash", "Mobile wallet details", "Ungandite services"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "mobile_money", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_statement(self) -> List[Dict]:
        phrases = ["Ngiphe statement", "Ungandibele isithelelo", "Statement yengu", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "account_statement", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_dispute(self) -> List[Dict]:
        phrases = ["Ndifuna okuphikisana", "Ungandibele umkhiphe", "Imali yami idlale kahle", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "transaction_dispute", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_account_open(self) -> List[Dict]:
        phrases = ["Ngingakwazi okubukulula", "Ungandibele i-account", "Account yatsva", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "account_opening", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_card(self) -> List[Dict]:
        phrases = ["Ngingakwazi okucelula", "Ungandibele ikhadi", "Card yatsva", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "card_request", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_atm(self) -> List[Dict]:
        phrases = ["Ngiphe iATM", "Ungandibele iindawo", "ATM kupi", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "atm_location", "language": "nd"} for _ in range(650)]
    
    def _generate_ndebele_greeting(self) -> List[Dict]:
        phrases = ["Sawubona", "Unjani", "Helele", "Yoo"]
        return [{"text": random.choice(phrases), "intent": "greeting", "language": "nd"} for _ in range(100)]
    
    def _generate_ndebele_goodbye(self) -> List[Dict]:
        phrases = ["Sala kahle", "Bawo", "Hlala kahle", "Bonana"]
        return [{"text": random.choice(phrases), "intent": "goodbye", "language": "nd"} for _ in range(100)]
    
    def _generate_ndebele_complaint(self) -> List[Dict]:
        phrases = ["Ndifuna okukhala", "Usebenzeli akukulungile", "Ungandibele", "Complaint"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "complaint", "language": "nd"} for _ in range(200)]
    
    def _generate_ndebele_general(self) -> List[Dict]:
        phrases = ["Ndifuna imbuzi", "Ungandibele", "Chii", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "general_inquiry", "language": "nd"} for _ in range(200)]
    
    def _generate_ndebele_update_profile(self) -> List[Dict]:
        phrases = ["Ngingakwazi okuguqula", "Ungandibele", "Update profile", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "update_profile", "language": "nd"} for _ in range(200)]
    
    def _generate_ndebele_closure(self) -> List[Dict]:
        phrases = ["Ngingakwazi okuvalela", "Ungandibele", "Close account", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "account_closure", "language": "nd"} for _ in range(200)]
    
    def _generate_ndebele_security_pin(self) -> List[Dict]:
        phrases = ["Ndikhohlwe i-PIN", "Reset PIN", "Ungandibele", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "security_pin", "language": "nd"} for _ in range(200)]
    
    def _generate_ndebele_network(self) -> List[Dict]:
        phrases = ["Inethiweki ayisebenzeli", "Internet issue", "App ayisebenzeli", "Ungandibele"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "network_connectivity", "language": "nd"} for _ in range(200)]
    
    def _generate_ndebele_fees(self) -> List[Dict]:
        phrases = ["Ngiphe izindleko", "Ungandibele fees", "Imali yami", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "mobile_wallet_fees", "language": "nd"} for _ in range(200)]
    
    def _generate_ndebele_branch(self) -> List[Dict]:
        phrases = ["Ngiphe i-branch", "Ungandibele indawo", "Branch kupi", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "branch_location", "language": "nd"} for _ in range(200)]
    
    def _generate_ndebele_escalation(self) -> List[Dict]:
        phrases = ["Ndifuna okukhuluma", "Ungandibele", "Escalate please", "Ungandite"]
        return [{"text": random.choice(phrases) + ("?" if random.random() > 0.5 else ""), "intent": "escalation_request", "language": "nd"} for _ in range(200)]


def main():
    print("\n" + "="*70)
    print("🚀 ULTIMATE COMPREHENSIVE TRAINING DATA GENERATOR")
    print("="*70)
    
    generator = UltimateDataGenerator()
    
    # Load existing
    existing_path = Path("backend/generated/retraining_dataset_phase4_final_balanced.json")
    existing = json.load(open(existing_path)) if existing_path.exists() else []
    print(f"\n✓ Existing dataset: {len(existing):,} records")
    
    # Generate new Shona data
    print("\n📝 GENERATING SHONA (Chishona)...")
    shona_new = generator.generate_shona_comprehensive()
    print(f"  ✓ Total Shona generated: {len(shona_new):,} records")
    
    # Generate new Ndebele data
    print("\n📝 GENERATING NDEBELE (Isindebele)...")
    ndebele_new = generator.generate_ndebele_comprehensive()
    print(f"  ✓ Total Ndebele generated: {len(ndebele_new):,} records")
    
    # Combine all
    all_data = existing + shona_new + ndebele_new
    print(f"\n📊 Combined before dedup: {len(all_data):,}")
    
    # Deduplicate
    seen = set()
    final = []
    for rec in all_data:
        key = (rec["text"].lower().strip(), rec["intent"], rec["language"])
        if key not in seen:
            seen.add(key)
            final.append(rec)
    
    # Analyze
    by_lang = Counter(r["language"] for r in final)
    by_intent = Counter(r["intent"] for r in final)
    
    print(f"\n✅ FINAL DATASET: {len(final):,} unique records")
    print(f"\n📊 BY LANGUAGE:")
    total = len(final)
    for lang in ["en", "sn", "nd"]:
        count = by_lang.get(lang, 0)
        pct = (count / total * 100) if total > 0 else 0
        label = {"en": "English", "sn": "Shona", "nd": "Ndebele"}.get(lang)
        print(f"  {label:<12}: {count:>8,} ({pct:>5.1f}%)")
    
    print(f"\n📊 TOP INTENTS:")
    for intent, count in by_intent.most_common(10):
        pct = (count / total * 100) if total > 0 else 0
        print(f"  {intent:<30}: {count:>7,} ({pct:>5.1f}%)")
    
    # Save
    output = Path("backend/generated/retraining_dataset_comprehensive_final.json")
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(final, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ SAVED: {output}")
    print(f"\n📈 READY FOR TRAINING!")


if __name__ == "__main__":
    main()
