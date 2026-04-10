"""
Retraining Pipeline
Builds updated training data by combining base examples with reviewed NLP feedback,
then optionally triggers model training.
"""

import argparse
import csv
import json
import os
import sqlite3
from typing import Dict, List, Tuple

from sqlalchemy import create_engine, text

from app.core.config import settings
from app.services.intent_catalog import INTENT_LABELS, normalize_intent
from app.services.model_training import train_model
from app.services.expanded_training_data import EXPANDED_TRAINING_DATA
from app.services.additional_training_data import ADDITIONAL_TRAINING_DATA
from app.services.banking77_adapter import build_banking77_examples


def _normalize_text(value: str) -> str:
    return " ".join((value or "").strip().split())


def _normalize_language(value: str) -> str:
    lang = (value or "en").strip().lower()
    if lang not in {"en", "sn", "nd"}:
        return "en"
    return lang


def _normalize_intent(value: str) -> str:
    return normalize_intent(value)


def _load_feedback_from_json(file_path: str) -> List[Dict]:
    with open(file_path, "r", encoding="utf-8") as file:
        payload = json.load(file)
    if isinstance(payload, list):
        return payload
    return []


def _load_feedback_from_csv(file_path: str) -> List[Dict]:
    with open(file_path, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        return list(reader)


def load_feedback_records(feedback_file: str = "") -> List[Dict]:
    """Load reviewed feedback rows from exported file or directly from DB."""
    if feedback_file:
        extension = os.path.splitext(feedback_file.lower())[1]
        if extension == ".json":
            return _load_feedback_from_json(feedback_file)
        if extension == ".csv":
            return _load_feedback_from_csv(feedback_file)
        raise ValueError("Unsupported feedback file format. Use .json or .csv")

    sql_text = """
        SELECT message_text, corrected_intent, language, reviewed
        FROM nlp_feedback
        WHERE reviewed = 1
          AND corrected_intent IS NOT NULL
          AND TRIM(corrected_intent) != ''
    """

    db_url = settings.DATABASE_URL

    if db_url.startswith("sqlite"):
        if db_url.startswith("sqlite+aiosqlite:///"):
            sqlite_path = db_url.replace("sqlite+aiosqlite:///", "", 1)
        elif db_url.startswith("sqlite:///"):
            sqlite_path = db_url.replace("sqlite:///", "", 1)
        else:
            raise ValueError("Unsupported SQLite URL format")

        sqlite_path = os.path.abspath(sqlite_path)
        if not os.path.exists(sqlite_path):
            return []

        with sqlite3.connect(sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(sql_text).fetchall()
            return [dict(row) for row in rows]

    sync_db_url = db_url.replace("+asyncpg", "")
    engine = create_engine(sync_db_url)
    sql = text(
        """
        SELECT message_text, corrected_intent, language, reviewed
        FROM nlp_feedback
        WHERE reviewed = 1
          AND corrected_intent IS NOT NULL
          AND TRIM(corrected_intent) != ''
        """
    )

    with engine.connect() as conn:
        rows = conn.execute(sql).mappings().all()

    return [dict(row) for row in rows]


def build_feedback_examples(feedback_rows: List[Dict]) -> Tuple[List[Dict], int]:
    """Convert feedback rows into training examples using corrected intents."""
    examples: List[Dict] = []
    skipped = 0

    for row in feedback_rows:
        message_text = _normalize_text(row.get("message_text", ""))
        corrected_intent = _normalize_intent(row.get("corrected_intent") or "")

        if not message_text or not corrected_intent:
            skipped += 1
            continue

        if corrected_intent not in INTENT_LABELS:
            skipped += 1
            continue

        examples.append(
            {
                "text": message_text,
                "intent": corrected_intent,
                "language": _normalize_language(row.get("language", "en")),
            }
        )

    return examples, skipped


def build_merged_training_data(feedback_examples: List[Dict]) -> List[Dict]:
    """Merge base dataset with reviewed examples, preferring reviewed labels."""
    merged_map: Dict[Tuple[str, str], Dict] = {}

    base_data = EXPANDED_TRAINING_DATA + ADDITIONAL_TRAINING_DATA
    for item in base_data:
        normalized_text = _normalize_text(item["text"])
        language = _normalize_language(item.get("language", "en"))
        key = (normalized_text.lower(), language)
        merged_map[key] = {
            "text": normalized_text,
            "intent": _normalize_intent(item["intent"]),
            "language": language,
        }

    for item in feedback_examples:
        normalized_text = _normalize_text(item["text"])
        language = _normalize_language(item.get("language", "en"))
        key = (normalized_text.lower(), language)
        normalized_intent = _normalize_intent(item["intent"])
        if normalized_intent not in INTENT_LABELS:
            continue

        merged_map[key] = {
            "text": normalized_text,
            "intent": normalized_intent,
            "language": language,
        }

    return list(merged_map.values())


def merge_external_examples(base_data: List[Dict], external_examples: List[Dict]) -> List[Dict]:
    merged_map: Dict[Tuple[str, str], Dict] = {}

    for item in base_data + external_examples:
        normalized_text = _normalize_text(item.get("text", ""))
        if not normalized_text:
            continue
        language = _normalize_language(item.get("language", "en"))
        normalized_intent = _normalize_intent(item.get("intent", ""))
        if normalized_intent not in INTENT_LABELS:
            continue

        key = (normalized_text.lower(), language)
        merged_map[key] = {
            "text": normalized_text,
            "intent": normalized_intent,
            "language": language,
        }

    return list(merged_map.values())


def save_dataset(dataset: List[Dict], output_file: str) -> None:
    directory = os.path.dirname(output_file)
    if directory:
        os.makedirs(directory, exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(dataset, file, ensure_ascii=False, indent=2)


def run_pipeline(
    feedback_file: str,
    output_data: str,
    train: bool,
    model_output: str,
    epochs: float,
    batch_size: int,
    learning_rate: float,
    include_banking77: bool,
    banking77_max_per_intent: int,
    model_name: str,
) -> None:
    feedback_rows = load_feedback_records(feedback_file=feedback_file)
    feedback_examples, skipped_count = build_feedback_examples(feedback_rows)
    merged_data = build_merged_training_data(feedback_examples)

    banking77_examples: List[Dict] = []
    if include_banking77:
        try:
            banking77_examples = build_banking77_examples(max_per_intent=banking77_max_per_intent)
            merged_data = merge_external_examples(merged_data, banking77_examples)
        except Exception as exc:
            print(f"Warning: BANKING77 load skipped due to error: {exc}")

    save_dataset(merged_data, output_data)

    print("=" * 60)
    print("RETRAINING DATASET PREPARATION COMPLETE")
    print("=" * 60)
    print(f"Feedback rows loaded: {len(feedback_rows)}")
    print(f"Feedback rows used:   {len(feedback_examples)}")
    print(f"Feedback rows skipped:{skipped_count}")
    print(f"BANKING77 added:      {len(banking77_examples)}")
    print(f"Merged dataset size:  {len(merged_data)}")
    print(f"Saved dataset to:     {output_data}")
    print("=" * 60)

    if train:
        train_model(
            model_name=model_name,
            output_dir=model_output,
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
            training_data=merged_data,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build retraining dataset from reviewed NLP feedback and optionally train model"
    )
    parser.add_argument(
        "--feedback-file",
        default="",
        help="Path to exported feedback file (.csv or .json). If omitted, reads reviewed records from DB.",
    )
    parser.add_argument(
        "--output-data",
        default="./generated/retraining_dataset.json",
        help="Path to save merged training dataset",
    )
    parser.add_argument(
        "--train",
        action="store_true",
        help="Run model training after dataset generation",
    )
    parser.add_argument(
        "--model-output",
        default="./trained_model",
        help="Model output directory (used with --train)",
    )
    parser.add_argument("--epochs", type=float, default=15)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument(
        "--include-banking77",
        action="store_true",
        help="Include mapped BANKING77 examples",
    )
    parser.add_argument(
        "--banking77-max-per-intent",
        type=int,
        default=120,
        help="Cap BANKING77 samples per mapped target intent",
    )
    parser.add_argument(
        "--model-name",
        default="xlm-roberta-base",
        help="HF model name or local path used for fine-tuning",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_pipeline(
        feedback_file=args.feedback_file,
        output_data=args.output_data,
        train=args.train,
        model_output=args.model_output,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        include_banking77=args.include_banking77,
        banking77_max_per_intent=args.banking77_max_per_intent,
        model_name=args.model_name,
    )
