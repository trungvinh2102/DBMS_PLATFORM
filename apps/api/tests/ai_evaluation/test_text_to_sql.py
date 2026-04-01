"""
test_text_to_sql.py

Execution Accuracy (EX) Benchmark Suite for AI Text-to-SQL.
Runs AI-generated queries against a database and compares results with Gold Standard SQL.
"""
import sys
import os
import json
import logging
from typing import List, Dict, Any

from dotenv import load_dotenv

# Load env variables before doing any DB or service imports
base_dir = os.path.dirname(os.path.abspath(os.path.join(__file__, "..", "..")))
sys.path.append(base_dir)

env_path = os.path.join(base_dir, ".env")
load_dotenv(env_path)

from services.ai_service import ai_service
from services.base_service import BaseDatabaseService
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# TEST CASES: Run this against your internal dbms_platform DB
TEST_CASES = [
    {
        "name": "User Count",
        "prompt": "How many users are in the system?",
        "gold_sql": 'SELECT COUNT(*) FROM "users"',
        "database_id": "f0ea5ce8-a99e-4308-a3a3-05f69fb5451c",
        "schema": "public"
    },
    {
        "name": "Active AI Models",
        "prompt": "List the names of all active AI models.",
        "gold_sql": 'SELECT name FROM "ai_models" WHERE "isActive" = true',
        "database_id": "f0ea5ce8-a99e-4308-a3a3-05f69fb5451c",
        "schema": "public"
    },
    {
        "name": "Database Types",
        "prompt": "Show unique database types supported in the platform.",
        "gold_sql": 'SELECT DISTINCT type FROM "databases"',
        "database_id": "f0ea5ce8-a99e-4308-a3a3-05f69fb5451c",
        "schema": "public"
    }
]

class TextToSqlEvaluator:
    """Evaluates AI performance using Execution Accuracy (EX)."""

    def run_benchmark(self, cases: List[Dict]):
        """Executes the benchmark and prints results."""
        results = []
        passed = 0
        
        print("\n" + "="*50)
        print(" TEXT-TO-SQL EXECUTION ACCURACY BENCHMARK ")
        print("="*50 + "\n")

        for i, case in enumerate(cases):
            name = case["name"]
            db_id = case["database_id"]
            
            if db_id == "YOUR_DATABASE_ID_HERE":
                print(f"[{i+1}/{len(cases)}] SKIPPED: {name} (Please set database_id)")
                continue

            print(f"[{i+1}/{len(cases)}] Evaluating: {name}...")
            
            try:
                # 1. Get AI's SQL
                gen_res = ai_service.generate_sql(case["prompt"], db_id, case.get("schema", "public"))
                ai_sql = gen_res.get("sql")
                
                if not ai_sql:
                    results.append({"name": name, "status": "FAIL", "reason": "No SQL generated"})
                    continue

                # 2. Execute Gold SQL
                gold_data = self._execute(db_id, case["gold_sql"])
                
                # 3. Execute AI SQL
                ai_data = self._execute(db_id, ai_sql)
                
                # 4. Compare Results (Execution Accuracy)
                is_correct = self._compare_data(gold_data, ai_data)
                
                if is_correct:
                    passed += 1
                    print(f"   >>> SUCCESS: Results match.")
                    results.append({"name": name, "status": "PASS"})
                else:
                    print(f"   >>> FAIL: Logic mismatch.")
                    print(f"       AI SQL: {ai_sql}")
                    results.append({"name": name, "status": "FAIL", "reason": "Data mismatch", "ai_sql": ai_sql})

            except Exception as e:
                print(f"   >>> ERROR: {str(e)}")
                results.append({"name": name, "status": "ERROR", "reason": str(e)})

        total = len([r for r in results if r["status"] != "SKIPPED"])
        accuracy = (passed / total * 100) if total > 0 else 0
        
        print("\n" + "="*50)
        print(f" FINAL SCORE: {accuracy:.2f}% ({passed}/{total})")
        print("="*50 + "\n")
        return results

    def _execute(self, db_id: str, sql: str) -> List[Dict]:
        """Runs query and returns raw data for comparison."""
        db_svc = BaseDatabaseService()
        def _op(conn):
            # Normalizing column/row order can be tricky, but basic EX just compares results
            res = conn.execute(text(sql))
            return [list(row) for row in res.fetchall()]
        return db_svc.run_dynamic_query(db_id, _op)

    def _compare_data(self, gold: List, ai: List) -> bool:
        """Deep comparison of result sets."""
        if len(gold) != len(ai): return False
        
        # Sort both result sets to avoid failing on order-difference unless ORDER BY is in prompt
        try:
            gold.sort()
            ai.sort()
        except: pass # Objects might not be sortable
        
        return gold == ai

if __name__ == "__main__":
    evaluator = TextToSqlEvaluator()
    evaluator.run_benchmark(TEST_CASES)
