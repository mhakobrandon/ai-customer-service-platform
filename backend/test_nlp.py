"""Test NLP Service Hybrid Approach"""
import sys
sys.path.insert(0, '.')

from app.services.nlp_service import nlp_service
import asyncio

async def test_messages():
    test_cases = [
        "hi",
        "hello",
        "mhoro",
        "ndikuda kuona mari hangu",
        "what is my balance",
        "I forgot my password",
        "how do I transfer money",
        "makadii",
        "bye",
    ]
    
    print("\n" + "="*70)
    print("TESTING HYBRID ML + RULE-BASED NLP")
    print("="*70 + "\n")
    
    for msg in test_cases:
        result = await nlp_service.process_message(msg)
        status = "✅" if not result["needs_escalation"] else "⚠️ ESCALATE"
        print(f"Message: '{msg}'")
        print(f"  Intent: {result['intent']} ({result['confidence']*100:.1f}%)")
        print(f"  Response: {result['response'][:60]}...")
        print(f"  Status: {status}")
        print()

if __name__ == "__main__":
    asyncio.run(test_messages())
