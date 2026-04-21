"""Evaluate a trained intent model on a dataset with a fixed stratified split."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import torch
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Ensure imports like app.services.* work when running this file directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.intent_catalog import INTENT_LABELS, normalize_intent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate intent model checkpoint")
    parser.add_argument(
        "--model-path",
        required=True,
        help="Path to trained model checkpoint",
    )
    parser.add_argument(
        "--dataset",
        default="./generated/retraining_dataset.json",
        help="Path to evaluation dataset JSON",
    )
    parser.add_argument(
        "--tokenizer-path",
        default="",
        help="Optional tokenizer path if model path does not include tokenizer files",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Holdout proportion for evaluation",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed for stratified split",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for inference",
    )
    parser.add_argument(
        "--output",
        default="",
        help="Optional JSON output path",
    )
    parser.add_argument(
        "--tag",
        default="",
        help="Optional run tag",
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def resolve_label_map(model_path: Path, model: AutoModelForSequenceClassification) -> Dict[str, int]:
    mapping_path = model_path / "label_mappings.json"
    if mapping_path.exists():
        payload = load_json(mapping_path)
        label2id = payload.get("label2id", {}) if isinstance(payload, dict) else {}
        if isinstance(label2id, dict) and label2id:
            return {str(k): int(v) for k, v in label2id.items()}

    config_label2id = getattr(model.config, "label2id", None)
    if isinstance(config_label2id, dict) and config_label2id:
        if all(str(k).startswith("LABEL_") for k in config_label2id.keys()):
            return {label: idx for idx, label in enumerate(INTENT_LABELS)}
        return {str(k): int(v) for k, v in config_label2id.items()}

    return {label: idx for idx, label in enumerate(INTENT_LABELS)}


def prepare_holdout(
    dataset: List[Dict[str, Any]],
    label2id: Dict[str, int],
    test_size: float,
    random_state: int,
) -> Tuple[List[str], List[int], Dict[str, int]]:
    usable_texts: List[str] = []
    usable_labels: List[int] = []
    filtered_out = 0

    for row in dataset:
        text = str(row.get("text", "")).strip()
        intent = normalize_intent(str(row.get("intent", "")).strip())
        if not text or intent not in label2id:
            filtered_out += 1
            continue
        usable_texts.append(text)
        usable_labels.append(label2id[intent])

    if not usable_texts:
        raise ValueError("No usable rows found for evaluation")

    _, val_texts, _, val_labels = train_test_split(
        usable_texts,
        usable_labels,
        test_size=test_size,
        random_state=random_state,
        stratify=usable_labels,
    )

    stats = {
        "usable_rows": len(usable_texts),
        "filtered_out_rows": filtered_out,
        "val_rows": len(val_texts),
    }
    return val_texts, val_labels, stats


def batched_predict(
    model: AutoModelForSequenceClassification,
    tokenizer: AutoTokenizer,
    texts: List[str],
    batch_size: int,
    device: torch.device,
) -> List[int]:
    predictions: List[int] = []
    model.eval()

    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        enc = tokenizer(
            batch,
            truncation=True,
            padding=True,
            max_length=128,
            return_tensors="pt",
        )
        enc = {k: v.to(device) for k, v in enc.items()}

        with torch.no_grad():
            outputs = model(**enc)
            preds = torch.argmax(outputs.logits, dim=1).cpu().numpy().tolist()
        predictions.extend(preds)

    return predictions


def main() -> None:
    args = parse_args()

    dataset_path = Path(args.dataset)
    model_path = Path(args.model_path)
    tokenizer_path = Path(args.tokenizer_path) if args.tokenizer_path else model_path

    dataset = load_json(dataset_path)
    if not isinstance(dataset, list):
        raise ValueError("Dataset must be a JSON array")

    tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_path))
    model = AutoModelForSequenceClassification.from_pretrained(str(model_path))
    label2id = resolve_label_map(model_path, model)

    val_texts, val_labels, split_stats = prepare_holdout(
        dataset=dataset,
        label2id=label2id,
        test_size=args.test_size,
        random_state=args.random_state,
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    pred_labels = batched_predict(
        model=model,
        tokenizer=tokenizer,
        texts=val_texts,
        batch_size=args.batch_size,
        device=device,
    )

    acc = accuracy_score(val_labels, pred_labels)
    p_w, r_w, f1_w, _ = precision_recall_fscore_support(
        val_labels,
        pred_labels,
        average="weighted",
        zero_division=0,
    )
    p_m, r_m, f1_m, _ = precision_recall_fscore_support(
        val_labels,
        pred_labels,
        average="macro",
        zero_division=0,
    )

    result = {
        "tag": args.tag,
        "model_path": str(model_path),
        "tokenizer_path": str(tokenizer_path),
        "dataset": str(dataset_path),
        "test_size": args.test_size,
        "random_state": args.random_state,
        "split_stats": split_stats,
        "label_space_size": len(label2id),
        "label_distribution_val": dict(Counter(val_labels)),
        "metrics": {
            "accuracy": round(float(acc), 6),
            "precision_weighted": round(float(p_w), 6),
            "recall_weighted": round(float(r_w), 6),
            "f1_weighted": round(float(f1_w), 6),
            "precision_macro": round(float(p_m), 6),
            "recall_macro": round(float(r_m), 6),
            "f1_macro": round(float(f1_m), 6),
        },
    }

    print("EVAL_COMPLETE")
    print(f"tag={args.tag}")
    print(f"model={model_path}")
    print(f"tokenizer={tokenizer_path}")
    print(f"dataset={dataset_path}")
    print(f"val_rows={split_stats['val_rows']}")
    print(f"accuracy={result['metrics']['accuracy']:.6f}")
    print(f"precision_weighted={result['metrics']['precision_weighted']:.6f}")
    print(f"recall_weighted={result['metrics']['recall_weighted']:.6f}")
    print(f"f1_weighted={result['metrics']['f1_weighted']:.6f}")
    print(f"f1_macro={result['metrics']['f1_macro']:.6f}")

    if args.output:
        output_path = Path(args.output)
        write_json(output_path, result)
        print(f"output={output_path}")


if __name__ == "__main__":
    main()
