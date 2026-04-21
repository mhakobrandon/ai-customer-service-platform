"""Train intent classifier from a JSON dataset file."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

# Ensure imports like app.services.* work when running this file directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.model_training import train_model


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train model from dataset JSON")
    parser.add_argument(
        "--input",
        default="./generated/retraining_dataset_phase2_cleaned.json",
        help="Path to training dataset JSON",
    )
    parser.add_argument(
        "--model-output",
        default="./trained_model_phase2",
        help="Directory to save trained model",
    )
    parser.add_argument(
        "--model-name",
        default="xlm-roberta-base",
        help="Model name or local checkpoint path",
    )
    parser.add_argument("--epochs", type=float, default=8)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    return parser.parse_args()


def load_dataset(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as file:
        payload = json.load(file)
    if not isinstance(payload, list):
        raise ValueError("Dataset file must contain a JSON array")
    return payload


def main() -> None:
    args = parse_args()

    input_path = Path(args.input)
    dataset = load_dataset(input_path)

    train_model(
        model_name=args.model_name,
        output_dir=args.model_output,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        training_data=dataset,
    )


if __name__ == "__main__":
    main()
