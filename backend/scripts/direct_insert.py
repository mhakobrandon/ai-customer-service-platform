"""
Enable WAL mode + insert with long timeout — works even with concurrent readers.
"""
import sqlite3, uuid, random
from datetime import datetime, timedelta

DB = "banking_mock.db"
con = sqlite3.connect(DB, timeout=30)
con.execute("PRAGMA journal_mode=WAL")
con.execute("PRAGMA busy_timeout=15000")
cur = con.cursor()

def _uuid(): return str(uuid.uuid4())
def _ref():  return f"TXN{uuid.uuid4().hex[:12].upper()}"

MERCHANTS = [
    "OK Supermarket","Chicken Inn","ZESA Prepaid","NetOne Airtime",
    "TelOne","Pick n Pay","Salary Credit","Transfer In",
    "ATM Withdrawal","Edgars Zimbabwe","Colcom Foods","Innscor Africa",
]

NEW_PHONES = [
    {"phone": "+263781900173", "name": "Brandon Mhako"},
    {"phone": "+263713980073", "name": "Brandon Mhako"},
]

cur.execute("SELECT id, name, code, currency FROM banking_providers")
providers = cur.fetchall()
now = datetime.utcnow()

for customer in NEW_PHONES:
    cur.execute("SELECT COUNT(*) FROM banking_accounts WHERE phone_number=?", (customer["phone"],))
    if cur.fetchone()[0] > 0:
        print(f"[SKIP] {customer['phone']} already has accounts")
        continue

    for idx, (prov_id, prov_name, prov_code, currency) in enumerate(providers):
        balance = round(random.uniform(200, 3000), 2)
        acc_id  = _uuid()
        acc_num = f"{prov_code[:3]}{abs(hash(customer['phone']+prov_code)) % 999999:06d}"
        ts      = now.isoformat()

        cur.execute(
            "INSERT INTO banking_accounts "
            "(id,provider_id,phone_number,account_number,account_name,balance,currency,is_active,is_primary,pin_hash,created_at,updated_at) "
            "VALUES (?,?,?,?,?,?,?,1,?,NULL,?,?)",
            (acc_id, prov_id, customer["phone"], acc_num, customer["name"],
             balance, currency, 1 if idx==0 else 0, ts, ts)
        )

        running = balance
        rows = []
        for i in range(12, 0, -1):
            t_type  = "credit" if i % 3 == 0 else "debit"
            amount  = round(random.uniform(5, 350), 2)
            running = round((running+amount) if t_type=="credit" else max(0, running-amount), 2)
            merchant = random.choice(MERCHANTS)
            t_ts    = (now - timedelta(days=i, hours=random.randint(0,23))).isoformat()
            rows.append((_uuid(), acc_id, _ref(), t_type, amount, currency, running,
                         f"{'Received from' if t_type=='credit' else 'Payment to'} {merchant}",
                         merchant, t_ts))

        cur.executemany(
            "INSERT INTO banking_transactions "
            "(id,account_id,transaction_ref,transaction_type,amount,currency,balance_after,description,merchant,status,timestamp,metadata_json) "
            "VALUES (?,?,?,?,?,?,?,?,?,'completed',?,NULL)",
            rows
        )
        print(f"[ADD] {customer['phone']} -> {prov_name}  bal={balance} {currency}  (12 txns)")

con.commit()
con.close()
print("\n[OK] All accounts inserted successfully.")
