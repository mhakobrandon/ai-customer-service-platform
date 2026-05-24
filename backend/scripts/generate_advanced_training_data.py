#!/usr/bin/env python3
"""
Advanced Multilingual Training Data Generator v2
Generates diverse, realistic scenarios with contextual variations
"""

import json
import random
from typing import List, Dict, Tuple
from collections import Counter
from pathlib import Path
import itertools

class AdvancedMultilingualGenerator:
    """Generate diverse training data using multiple construction patterns"""
    
    # Shona sentence construction components
    SHONA_INTRO_POLITE = [
        "Ndapota", "Kana hari zviripo", "Mhangeri", "Ungandibatsira", 
        "Unganditsanangura", "Ndikumbire", "Ndibatsire", "Kana inodiwa",
        "Ndiyeyi", "Zvibatsire", "Ndakumbira", "Mhangeri ndapota",
        "Kana wakandiona", "Ndikunzwisira", "Chitete ichi"
    ]
    
    SHONA_URGENCY = [
        "Kare kare", "Manhinga", "Nguva ino", "Zvakare", "Pazvakurira",
        "Kudai", "Chikonzero", "Kwenguva iyi", "Zvipo", "Sakuwanda"
    ]
    
    SHONA_ACCOUNT_CONTEXT = [
        "account yangu", "account yebhizinesi", "savings account", 
        "checking account", "account yevashandi", "account yeshukela",
        "account yenyama", "account yepakumikirira"
    ]
    
    SHONA_TIME_REFS = [
        "ndima", "kunze", "mangwanani", "mangwanani apa", 
        "zuva rose", "nyara", "kare", "kusvika zvino"
    ]
    
    # Ndebele sentence construction components
    NDEBELE_INTRO_POLITE = [
        "Ngiyakucela", "Unganditsanangura", "Ungandibele", "Ngibuze",
        "Ngiphe", "Ndifuna", "Ungandibetshelela", "Ngisize",
        "Ungandikuthele", "Ngiwe", "Ungisize", "Ngizakuthola",
        "Ngiyamkela", "Ngathule", "Ngithini"
    ]
    
    NDEBELE_URGENCY = [
        "Ngoku", "Manje", "Kabusha", "Imali", "Amadolo",
        "Ngasinye", "Kanje", "Ngamela", "Kuthela", "Kamathubu"
    ]
    
    NDEBELE_ACCOUNT_CONTEXT = [
        "i-account yami", "i-business account", "i-savings account",
        "i-checking account", "i-student account", "i-family account",
        "i-joint account", "i-professional account"
    ]
    
    NDEBELE_TIME_REFS = [
        "namuhla", "nkosana", "ekuseni", "ntambama",
        "nkosikazi", "kusikhathi", "emandulo", "nantsi"
    ]
    
    # Intent-specific templates
    SHONA_INTENT_PATTERNS = {
        "balance_inquiry": [
            "{intro} {account} mari yangu yava mangani?",
            "{intro} {account} balance yangu ndipei?",
            "Ndipei {account} balance yangu {time}?",
            "{intro} {account} ndipei mari ?",
            "{account} yami ine mari mangani {urgency}?",
            "Cheka {account} yangu {time}",
            "{intro} {account} ndipei ingcediso?",
            "Ndikumbire {account} balance yangu",
            "{urgency} {account} balance yangu?",
            "{intro} ndinoda kuzoona {account} yangu",
        ],
        "transaction_history": [
            "{intro} ndipei {account} history yangu?",
            "Cheka {account} matranzaction angu {time}",
            "{intro} {{account}} mari yandaituma kupi?",
            "Ndifuna kuzoona {account} transaction records",
            "{urgency} ndipei {account} zvandakataura?",
            "Matranzaction angu {account} edzimapfuura?",
            "{intro} ndipei statement yangu",
            "Cheka {account} zvamari zvandakatuma",
            "{time} {account} transaction history yangu?",
            "{intro} {{account}} {{urgency}} history yangu?",
        ],
        "transfer_money": [
            "{intro} ndingakataura {account} mari?",
            "Tumai {account} mari yangu {time}",
            "{intro} ndingakataura mari kunzira?",
            "{urgency} ndingakataura {account} mari?",
            "Ndifuna okukatuma {account} mari",
            "{intro} {{account}} {{urgency}} transfer?",
            "Ndingakabhadhura {{account}} mari seiko?",
            "{{account}} mari yangu ikatambe",
            "{{intro}} kundirana {{account}} transfer",
            "{{urgency}} {{account}} mari",
        ],
        "password_reset": [
            "{intro} ndakakoseseka {account} password",
            "Ndipei {account} password yatsva {urgency}",
            "{intro} ndakasikwa security PIN yangu",
            "{urgency} reset {account} password yangu",
            "Ndakakoseseka {account} login credentials",
            "{intro} ndipei {account} PIN yatsva",
            "Password yangu {account} yatowa {time}",
            "{intro} ndikope {account} password",
            "{urgency} ndikope {account} PIN",
            "Ndakakoseseka {account} credentials",
        ],
        "loan_inquiry": [
            "{intro} ndingakakopa {account} mari?",
            "Ndipei {{account}} loan details {time}",
            "{intro} {{account}} {{urgency}} mari yakopwa?",
            "Ndingakakora {{account}} interest rate ngani?",
            "{{intro}} {{account}} loan yatsva?",
            "{{urgency}} {{account}} loan application?",
            "{{intro}} {{account}} {{urgency}} kurapidza loan",
            "Ndifuna {{account}} business loan",
            "{{intro}} {{account}} personal loan",
            "{{urgency}} {{account}} {{time}} loan?",
        ],
        "bill_payment": [
            "{intro} ndingabhadhura {{account}} bili?",
            "Bhadzurai {{account}} {{urgency}} mbazi yangu",
            "{{intro}} {{account}} {{urgency}} stima yangu?",
            "{{account}} water bill {{urgency}}?",
            "{{intro}} {{account}} internet bill ndipei?",
            "{{urgency}} {{account}} tax payment",
            "{{intro}} {{account}} {{time}} bill payment?",
            "Bhadzurai {{account}} rent yangu {{urgency}}",
            "{{intro}} {{account}} school fees?",
            "{{urgency}} {{account}} {{intro}} utilities",
        ],
        "mobile_money": [
            "{intro} chii {{account}} mobile money?",
            "Unganditsanangura {{account}} {{urgency}} ecocash",
            "{{intro}} {{account}} mobile wallet {{time}}?",
            "{{urgency}} {{account}} {{intro}} mobile payment",
            "Ecocash {{account}} {{intro}} [[time]]?",
            "{{intro}} {{account}} {{urgency}} mobile services",
            "{{urgency}} {{account}} {{intro}} ZIPIT",
            "{{intro}} {{account}} {{urgency}} wallet fees",
            "Mobile {{account}} [[urgency]] security?",
            "{{intro}} {{account}} {{urgency}} transfer mobile",
        ],
    }
    
    NDEBELE_INTENT_PATTERNS = {
        "balance_inquiry": [
            "{{intro}} {{account}} imali yami idlala kangakanani?",
            "{{intro}} {{account}} {{urgency}} ingcediso yami?",
            "Ungandibele {{account}} balance yami {{time}}",
            "{{account}} yami idlale {{urgency}}?",
            "{{intro}} {{account}} {{time}} umnotho wami",
            "Chekela {{account}} {{urgency}} imali yami",
            "{{intro}} {{account}} {{urgency}} ndizwe",
            "{{account}} yami idlala {{time}} [[urgency]]",
            "{{urgency}} {{account}} {{intro}} imali?",
            "{{intro}} {{account}} {{urgency}} balance",
        ],
        "transaction_history": [
            "{{intro}} {{account}} {{urgency}} izililo zami?",
            "Chekela {{account}} {{time}} matranzaction",
            "{{intro}} {{account}} {{urgency}} imali endithlela",
            "{{urgency}} {{account}} {{intro}} transaction records",
            "{{account}} yami {{urgency}} history",
            "{{intro}} {{account}} {{time}} activities",
            "{{urgency}} {{account}} [[intro]] ezalikhona",
            "{{intro}} {{account}} [[urgency]] statement",
            "{{account}} yami {{urgency}} past transactions",
            "[[intro]] [[account]] [[urgency]] amaqoqela",
        ],
        "transfer_money": [
            "{{intro}} {{account}} {{urgency}} ukukhuluma?",
            "Unganditsanangura {{account}} {{time}} transfer",
            "{{urgency}} {{account}} {{intro}} imali yangu",
            "{{intro}} {{account}} {{urgency}} sending",
            "{{account}} imali {{urgency}} ithunyelwe",
            "{{intro}} {{account}} {{time}} payment?",
            "{{urgency}} [[account]] [[intro]] moving money",
            "{{intro}} {{account}} [[urgency]] beneficiary",
            "[[account]] [[urgency]] [[intro]] amounts",
            "{{intro}} {{account}} [[urgency]] recipients",
        ],
    }
    
    def __init__(self):
        random.seed(42)
        self.intents = [
            "balance_inquiry", "transaction_history", "transfer_money", "password_reset",
            "loan_inquiry", "bill_payment", "mobile_money", "account_statement",
            "transaction_dispute", "account_opening", "card_request", "atm_location",
            "greeting", "goodbye", "complaint", "general_inquiry", "update_profile",
            "account_closure", "security_pin", "network_connectivity", "mobile_wallet_fees",
            "branch_location", "escalation_request"
        ]
    
    def apply_template(self, template: str, language: str) -> str:
        """Apply placeholders to template based on language"""
        if language == "sn":
            intro = random.choice(self.SHONA_INTRO_POLITE)
            urgency = random.choice(self.SHONA_URGENCY)
            account = random.choice(self.SHONA_ACCOUNT_CONTEXT)
            time_ref = random.choice(self.SHONA_TIME_REFS)
        else:  # Ndebele
            intro = random.choice(self.NDEBELE_INTRO_POLITE)
            urgency = random.choice(self.NDEBELE_URGENCY)
            account = random.choice(self.NDEBELE_ACCOUNT_CONTEXT)
            time_ref = random.choice(self.NDEBELE_TIME_REFS)
        
        result = template
        result = result.replace("{intro}", intro)
        result = result.replace("{urgency}", urgency)
        result = result.replace("{account}", account)
        result = result.replace("{time}", time_ref)
        result = result.replace("{{intro}}", intro)
        result = result.replace("{{urgency}}", urgency)
        result = result.replace("{{account}}", account)
        result = result.replace("{{time}}", time_ref)
        
        return result.strip()
    
    def generate_variations(self, base_text: str, language: str, count: int = 3) -> List[str]:
        """Generate variations of base text"""
        variations = [base_text]
        
        # Add interrogative variations
        if not base_text.endswith("?"):
            variations.append(base_text + "?")
        
        # Add polite variations  
        if language == "sn":
            variations.append(f"Ndapota {base_text.lower()}")
        else:
            variations.append(f"Ngiyakucela {base_text.lower()}")
        
        # Add urgent variations
        if language == "sn":
            variations.append(f"Kare kare {base_text.lower()}")
        else:
            variations.append(f"Ngoku {base_text.lower()}")
        
        return variations[:count]
    
    def generate_dataset_v2(self, language: str, target_size: int = 15000) -> List[Dict]:
        """Generate diverse dataset using templates"""
        records = []
        lang_code = "sn" if language == "shona" else "nd"
        records_per_intent = max(target_size // len(self.intents), 200)
        
        print(f"  Targeting {records_per_intent} records per intent...")
        
        for intent in self.intents:
            intent_records = 0
            
            # Get patterns for this intent if available
            if language == "shona":
                patterns = self.SHONA_INTENT_PATTERNS.get(intent, [])
            else:
                patterns = self.NDEBELE_INTENT_PATTERNS.get(intent, [])
            
            # Generate using templates
            if patterns:
                pattern_idx = 0
                for _ in range(records_per_intent):
                    template = patterns[pattern_idx % len(patterns)]
                    text = self.apply_template(template, lang_code)
                    
                    records.append({
                        "text": text,
                        "intent": intent,
                        "language": lang_code
                    })
                    intent_records += 1
                    pattern_idx += 1
            else:
                # Generate generic variations for intents without patterns
                base = f"Help with {intent}".replace("_", " ")
                for var_idx in range(records_per_intent):
                    variations = self.generate_variations(base, lang_code, 1)
                    records.append({
                        "text": variations[0],
                        "intent": intent,
                        "language": lang_code
                    })
                    intent_records += 1
        
        return records


def main():
    """Generate and save enhanced multilingual datasets"""
    print("🚀 Advanced Multilingual Training Data Generator v2")
    print("=" * 60)
    
    generator = AdvancedMultilingualGenerator()
    
    # Load existing dataset
    existing_path = Path("backend/generated/retraining_dataset_phase4_final_balanced.json")
    existing_data = json.load(open(existing_path)) if existing_path.exists() else []
    print(f"\n✓ Loaded existing dataset: {len(existing_data):,} records")
    
    # Create separate lists by language
    existing_by_lang = {"en": [], "sn": [], "nd": []}
    for record in existing_data:
        lang = record.get("language", "en")
        existing_by_lang[lang].append(record)
    
    print(f"  - English: {len(existing_by_lang['en']):,}")
    print(f"  - Shona: {len(existing_by_lang['sn']):,}")
    print(f"  - Ndebele: {len(existing_by_lang['nd']):,}")
    
    # Generate new data
    all_new = []
    
    for lang, lang_name in [("shona", "Shona"), ("ndebele", "Ndebele")]:
        print(f"\n📝 Generating {lang_name} variations...")
        new_data = generator.generate_dataset_v2(lang, target_size=15000)
        all_new.extend(new_data)
        print(f"  ✓ Generated {len(new_data):,} {lang_name} records")
    
    # Combine all data
    combined = existing_data + all_new
    print(f"\n📊 Pre-dedup total: {len(combined):,} records")
    
    # Intelligent deduplication: Keep one of each unique text within intent+language
    # to preserve diversity while avoiding exact duplicates
    seen_keys = {}
    unique_data = []
    duplicates = 0
    
    for record in combined:
        key = (record["text"].lower().strip(), record["intent"], record["language"])
        if key not in seen_keys:
            seen_keys[key] = True
            unique_data.append(record)
        else:
            duplicates += 1
    
    print(f"✓ Removed {duplicates:,} exact duplicates")
    print(f"✓ Final unique records: {len(unique_data):,}")
    
    # Analyze final distribution
    by_lang = Counter(r["language"] for r in unique_data)
    by_intent = Counter(r["intent"] for r in unique_data)
    
    print(f"\n📊 FINAL DISTRIBUTION BY LANGUAGE:")
    print(f"  {'Language':<12} {'Count':>10} {'%':<6}")
    print(f"  {'-'*28}")
    total = len(unique_data)
    for lang in ["en", "sn", "nd"]:
        count = by_lang.get(lang, 0)
        pct = (count / total * 100) if total > 0 else 0
        print(f"  {lang:<12} {count:>10,} {pct:>5.1f}%")
    
    print(f"\n📊 TOP 15 INTENTS:")
    print(f"  {'Intent':<30} {'Count':>8} {'%':<6}")
    print(f"  {'-'*44}")
    for intent, count in by_intent.most_common(15):
        pct = (count / total * 100) if total > 0 else 0
        print(f"  {intent:<30} {count:>8,} {pct:>5.1f}%")
    
    # Save final dataset
    output_path = Path("backend/generated/retraining_dataset_shona_ndebele_enhanced.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(unique_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ SAVED: {output_path}")
    print(f"   Total records: {len(unique_data):,}")
    print(f"   Shona: {by_lang.get('sn', 0):,}")
    print(f"   Ndebele: {by_lang.get('nd', 0):,}")
    print(f"   English: {by_lang.get('en', 0):,}")
    print(f"\n✓ Ready for model training!")


if __name__ == "__main__":
    main()
