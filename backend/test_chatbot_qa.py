"""
Comprehensive Chatbot Q&A Test Suite
Tests all 23 intents across English, Shona, and Ndebele.
Outputs a clear pass/fail report for each test case.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

# Suppress heavy model-loading logs
import logging
logging.disable(logging.WARNING)

from app.services.nlp_service import nlp_service

# ── Test cases: (question, expected_intent, language_hint) ───
TEST_CASES = [
    # ===== balance_inquiry =====
    ("How much money do I have in my account?", "balance_inquiry", "en"),
    ("Check my balance", "balance_inquiry", "en"),
    ("What is my EcoCash balance?", "balance_inquiry", "en"),
    ("Mari yangu yakamira papi?", "balance_inquiry", "sn"),
    ("Ndine mari yakawanda sei?", "balance_inquiry", "sn"),
    ("Imali yami ingakanani?", "balance_inquiry", "nd"),
    ("Ngifuna ukubona imali yami", "balance_inquiry", "nd"),

    # ===== transaction_history =====
    ("Show me my recent transactions", "transaction_history", "en"),
    ("What transactions did I make this week?", "transaction_history", "en"),
    ("Ndoda kubona imisebenzi yami yakamuva", "transaction_history", "nd"),
    ("Ndiratidze zvandakaita nemari", "transaction_history", "sn"),

    # ===== transfer_money =====
    ("I want to send money to my brother", "transfer_money", "en"),
    ("Transfer $50 to 0771234567", "transfer_money", "en"),
    ("Ndoda kutumira mari kumama wangu", "transfer_money", "sn"),
    ("Ngifuna ukuthumela imali", "transfer_money", "nd"),
    ("Send money to my friend", "transfer_money", "en"),

    # ===== account_statement =====
    ("I need my bank statement", "account_statement", "en"),
    ("Can I get a mini statement?", "account_statement", "en"),
    ("Send me my account statement for last 30 days", "account_statement", "en"),
    ("Email me my monthly statement", "account_statement", "en"),

    # ===== password_reset =====
    ("I forgot my password", "password_reset", "en"),
    ("I can't login to my account", "password_reset", "en"),
    ("How do I reset my password?", "password_reset", "en"),
    ("Ndakanganwa password yangu", "password_reset", "sn"),

    # ===== update_profile =====
    ("I want to change my phone number", "update_profile", "en"),
    ("Update my email address", "update_profile", "en"),
    ("Change my profile details", "update_profile", "en"),
    ("Ndoda kuchinja email yangu", "update_profile", "sn"),

    # ===== loan_inquiry =====
    ("Can I get a loan?", "loan_inquiry", "en"),
    ("What are the interest rates for loans?", "loan_inquiry", "en"),
    ("I want to borrow money", "loan_inquiry", "en"),
    ("Ndoda kukwereta mari", "loan_inquiry", "sn"),
    ("Ngifuna ukuboleka imali", "loan_inquiry", "nd"),

    # ===== bill_payment =====
    ("I want to pay my ZESA bill", "bill_payment", "en"),
    ("Buy airtime for 0771234567", "bill_payment", "en"),
    ("Pay my DSTV subscription", "bill_payment", "en"),
    ("Ndoda kubhadhara magetsi", "bill_payment", "sn"),
    ("How do I buy data bundles?", "bill_payment", "en"),
    ("Recharge my phone", "bill_payment", "en"),

    # ===== mobile_money =====
    ("How does EcoCash work?", "mobile_money", "en"),
    ("Tell me about OneMoney services", "mobile_money", "en"),
    ("What services does InnBucks offer?", "mobile_money", "en"),
    ("I want to register for EcoCash", "mobile_money", "en"),

    # ===== transaction_dispute =====
    ("I sent money to the wrong number", "transaction_dispute", "en"),
    ("I was overcharged on my transaction", "transaction_dispute", "en"),
    ("Please reverse my last transaction", "transaction_dispute", "en"),
    ("I didn't receive the money that was sent to me", "transaction_dispute", "en"),
    ("Ndatumira mari kunumber isiriyo", "transaction_dispute", "sn"),
    ("I want a refund", "transaction_dispute", "en"),
    ("Transaction failed but money was deducted", "transaction_dispute", "en"),

    # ===== security_pin =====
    ("My PIN is blocked", "security_pin", "en"),
    ("I need to change my PIN", "security_pin", "en"),
    ("How do I reset my EcoCash PIN?", "security_pin", "en"),
    ("I got a suspicious OTP", "security_pin", "en"),
    ("Someone hacked my account", "security_pin", "en"),
    ("My SIM card was stolen, help me block it", "security_pin", "en"),
    ("Ndoda kuchinja PIN yangu", "security_pin", "sn"),

    # ===== network_connectivity =====
    ("My data is not working", "network_connectivity", "en"),
    ("I have no signal on my phone", "network_connectivity", "en"),
    ("USSD is not working", "network_connectivity", "en"),
    ("Data rangu harisi kushanda", "network_connectivity", "sn"),
    ("Internet yangu haisi kushanda", "network_connectivity", "sn"),
    ("The network keeps dropping", "network_connectivity", "en"),
    ("I can't browse even though I have data", "network_connectivity", "en"),
    ("Foni yangu haisi kubata network", "network_connectivity", "sn"),
    ("Data haris kushanda asi ndika secha ririmo", "network_connectivity", "sn"),
    ("Internet iri kuramba chero ndakabatidza data", "network_connectivity", "sn"),

    # ===== mobile_wallet_fees =====
    ("How much does it cost to send money?", "mobile_wallet_fees", "en"),
    ("What are the EcoCash transaction fees?", "mobile_wallet_fees", "en"),
    ("What is the withdrawal fee?", "mobile_wallet_fees", "en"),
    ("How much is the IMTT tax?", "mobile_wallet_fees", "en"),

    # ===== account_closure =====
    ("I want to close my account", "account_closure", "en"),
    ("How do I terminate my account?", "account_closure", "en"),
    ("Close my EcoCash account", "account_closure", "en"),
    ("Delete my account permanently", "account_closure", "en"),

    # ===== account_opening =====
    ("How do I open a new account?", "account_opening", "en"),
    ("I want to register for an account", "account_opening", "en"),
    ("What do I need to create a new account?", "account_opening", "en"),
    ("Ndoda kuvhura account", "account_opening", "sn"),

    # ===== card_request =====
    ("I need a new debit card", "card_request", "en"),
    ("My card was stolen", "card_request", "en"),
    ("How do I get an EcoCash Mastercard?", "card_request", "en"),
    ("I want to block my lost card", "card_request", "en"),
    ("My card is not working", "card_request", "en"),

    # ===== atm_location =====
    ("Where is the nearest ATM?", "atm_location", "en"),
    ("Find an EcoCash agent near me", "atm_location", "en"),
    ("I need to withdraw cash", "atm_location", "en"),
    ("Nearest cash agent in Harare", "atm_location", "en"),

    # ===== branch_location =====
    ("Where is the nearest Econet shop?", "branch_location", "en"),
    ("Find a branch near Gweru", "branch_location", "en"),
    ("What are your branch hours?", "branch_location", "en"),
    ("Is the Bulawayo branch open on Saturday?", "branch_location", "en"),

    # ===== escalation_request =====
    ("I want to speak to a human", "escalation_request", "en"),
    ("Connect me to an agent", "escalation_request", "en"),
    ("Let me talk to a manager", "escalation_request", "en"),
    ("I need customer care", "escalation_request", "en"),
    ("human agent", "escalation_request", "en"),

    # ===== greeting =====
    ("Hello", "greeting", "en"),
    ("Hi there!", "greeting", "en"),
    ("Mhoro", "greeting", "sn"),
    ("Sawubona", "greeting", "nd"),
    ("Makadii", "greeting", "sn"),
    ("Good morning", "greeting", "en"),
    ("Ndeipi", "greeting", "sn"),

    # ===== goodbye =====
    ("Bye", "goodbye", "en"),
    ("Thank you, goodbye", "goodbye", "en"),
    ("Ndatenda", "goodbye", "sn"),
    ("Ngiyabonga", "goodbye", "nd"),
    ("That's all, thanks", "goodbye", "en"),

    # ===== complaint =====
    ("I am very unhappy with your service!", "complaint", "en"),
    ("This is unacceptable!", "complaint", "en"),
    ("I want to file a complaint", "complaint", "en"),
    ("Your service is terrible", "complaint", "en"),
    ("I am frustrated and disappointed", "complaint", "en"),

    # ===== general_inquiry =====
    ("What services do you offer?", "general_inquiry", "en"),
    ("I need some information", "general_inquiry", "en"),
    ("How does this work?", "general_inquiry", "en"),
    ("Can you help me?", "general_inquiry", "en"),

    # ===== Edge cases / tricky Shona messages =====
    ("Ndoda kubvunza nezvemari yangu", "balance_inquiry", "sn"),  # asking about "my money"
    ("Foni yangu iri kuramba kutumira meseji", "network_connectivity", "sn"),  # phone refusing to send SMS
    ("Handisi kugona kupinda mu account yangu", "password_reset", "sn"),  # can't get into account
    ("Mari yangu yakabiwa", "transaction_dispute", "sn"),  # my money was stolen
    ("Ndinoda rubatsiro", "general_inquiry", "sn"),  # I need help
    ("Ndiri kudawo kuziva nezvema loan", "loan_inquiry", "sn"),  # wanting to know about loans
    ("Zesa yangu haina kubhadharwa asi mari yaenda", "transaction_dispute", "sn"),  # ZESA not paid but money gone
    ("Hapana network munzvimbo mangu", "network_connectivity", "sn"),  # no network in my area
    ("Ndoda kurasa line yangu", "account_closure", "sn"),  # want to cancel my line
    ("Ndoda kubhadhara bill yangu ye DSTV", "bill_payment", "sn"),  # want to pay DSTV bill
]

def run_tests():
    passed = 0
    failed = 0
    failures = []

    print(f"\n{'='*90}")
    print(f"  CHATBOT NLP CLASSIFICATION TEST SUITE  —  {len(TEST_CASES)} test cases")
    print(f"{'='*90}\n")

    for i, (question, expected_intent, lang) in enumerate(TEST_CASES, 1):
        intent, confidence = nlp_service.classify_intent(question, lang)
        status = "PASS" if intent == expected_intent else "FAIL"

        if intent != expected_intent:
            failed += 1
            failures.append((i, question, lang, expected_intent, intent, confidence))
            marker = "  X FAIL"
        else:
            passed += 1
            marker = "  > PASS"

        conf_pct = f"{confidence*100:.0f}%"
        # Print every result
        print(f"  {i:3d}. [{lang}] {marker}  {conf_pct:>4s}  {intent:<25s}  {question[:60]}")

    print(f"\n{'='*90}")
    print(f"  RESULTS:  {passed} passed  |  {failed} failed  |  {len(TEST_CASES)} total")
    print(f"{'='*90}")

    if failures:
        print(f"\n  FAILURES DETAIL:")
        print(f"  {'—'*84}")
        for idx, question, lang, expected, actual, conf in failures:
            print(f"  #{idx:3d} [{lang}] \"{question}\"")
            print(f"        Expected: {expected}  |  Got: {actual} ({conf*100:.0f}%)")
            print()
    else:
        print("\n  All tests passed!\n")

    return failures


if __name__ == "__main__":
    failures = run_tests()
    sys.exit(1 if failures else 0)
