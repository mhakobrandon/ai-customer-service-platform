"""Phase 2 dataset cleanup and augmentation planning.

This script takes a training dataset and its Phase 1 scored report context,
then produces:
- cleaned dataset (noise/conflict reduced)
- cleanup report
- augmentation target plan

Cleanup actions:
- remove low quality rows (quality_score < threshold)
- remove exact duplicate extras (same normalized text + language + intent)
- remove exact duplicate label conflicts (same normalized text + language, different intent)
- remove near-duplicate label conflicts (similar text across different intents)
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def normalize_text(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def count_intents(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    total = len(records)
    counts = Counter(str(r.get("intent", "")) for r in records)
    return [
        {
            "intent": intent,
            "count": count,
            "percentage": round((count / total) * 100, 2) if total else 0.0,
        }
        for intent, count in sorted(counts.items(), key=lambda x: x[1], reverse=True)
    ]


def count_languages(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    total = len(records)
    counts = Counter(str(r.get("language", "en")).lower() for r in records)
    return [
        {
            "language": language,
            "count": count,
            "percentage": round((count / total) * 100, 2) if total else 0.0,
        }
        for language, count in sorted(counts.items(), key=lambda x: x[1], reverse=True)
    ]


def allocate_proportionally(total: int, weights: Dict[str, int]) -> Dict[str, int]:
    if total <= 0 or not weights:
        return {key: 0 for key in weights}

    positive = {k: v for k, v in weights.items() if v > 0}
    if not positive:
        return {key: 0 for key in weights}

    weight_sum = sum(positive.values())
    raw = {k: (total * v / weight_sum) for k, v in positive.items()}
    base = {k: int(value) for k, value in raw.items()}
    remainder = total - sum(base.values())

    if remainder > 0:
        order = sorted(raw.items(), key=lambda x: (x[1] - int(x[1])), reverse=True)
        for key, _ in order[:remainder]:
            base[key] += 1

    result = {key: 0 for key in weights}
    result.update(base)
    return result


def detect_exact_duplicate_actions(records_with_meta: List[Dict[str, Any]]) -> Dict[str, Any]:
    grouped: Dict[Tuple[str, str], List[Dict[str, Any]]] = defaultdict(list)
    for row in records_with_meta:
        key = (row["normalized_text"], row["language"])
        grouped[key].append(row)

    duplicate_extra_ids = set()
    duplicate_conflict_ids = set()
    duplicate_group_count = 0
    label_conflict_group_count = 0

    sample_duplicate_groups: List[Dict[str, Any]] = []
    sample_conflict_groups: List[Dict[str, Any]] = []

    for (norm_text, language), rows in grouped.items():
        if len(rows) < 2:
            continue

        intents = sorted({r["intent"] for r in rows})
        duplicate_group_count += 1

        entry = {
            "normalized_text": norm_text,
            "language": language,
            "count": len(rows),
            "intents": intents,
            "row_ids": [r["row_id"] for r in rows],
        }

        if len(sample_duplicate_groups) < 100:
            sample_duplicate_groups.append(entry)

        if len(intents) == 1:
            keep_id = rows[0]["row_id"]
            for row in rows:
                if row["row_id"] != keep_id:
                    duplicate_extra_ids.add(row["row_id"])
        else:
            label_conflict_group_count += 1
            if len(sample_conflict_groups) < 100:
                sample_conflict_groups.append(entry)
            for row in rows:
                duplicate_conflict_ids.add(row["row_id"])

    return {
        "duplicate_group_count": duplicate_group_count,
        "label_conflict_group_count": label_conflict_group_count,
        "duplicate_extra_ids": duplicate_extra_ids,
        "duplicate_conflict_ids": duplicate_conflict_ids,
        "sample_duplicate_groups": sample_duplicate_groups,
        "sample_conflict_groups": sample_conflict_groups,
    }


def detect_near_duplicate_conflicts(
    records_with_meta: List[Dict[str, Any]],
    threshold: float,
) -> Dict[str, Any]:
    conflicts: List[Dict[str, Any]] = []
    conflict_ids = set()

    language_set = sorted({r["language"] for r in records_with_meta})
    for language in language_set:
        lang_rows = [r for r in records_with_meta if r["language"] == language]
        if len(lang_rows) < 2:
            continue

        texts = [r["normalized_text"] for r in lang_rows]
        vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=1)
        matrix = vectorizer.fit_transform(texts)
        similarity = cosine_similarity(matrix, dense_output=False).tocoo()

        for i, j, value in zip(similarity.row, similarity.col, similarity.data):
            if i >= j:
                continue
            if value < threshold:
                continue

            left = lang_rows[i]
            right = lang_rows[j]

            if left["normalized_text"] == right["normalized_text"]:
                continue

            if left["intent"] == right["intent"]:
                continue

            item = {
                "row_id_a": left["row_id"],
                "row_id_b": right["row_id"],
                "language": language,
                "similarity": round(float(value), 4),
                "intent_a": left["intent"],
                "intent_b": right["intent"],
                "text_a": left["text"],
                "text_b": right["text"],
            }
            conflicts.append(item)
            conflict_ids.add(left["row_id"])
            conflict_ids.add(right["row_id"])

    conflicts = sorted(conflicts, key=lambda x: x["similarity"], reverse=True)
    return {
        "near_duplicate_conflict_pair_count": len(conflicts),
        "near_duplicate_conflict_ids": conflict_ids,
        "sample_conflict_pairs": conflicts[:200],
    }


def build_augmentation_plan(
    cleaned_records: List[Dict[str, Any]],
    target_intent_min: int,
    target_sn_min: int,
    target_nd_min: int,
) -> Dict[str, Any]:
    intent_counts = Counter(str(r.get("intent", "")) for r in cleaned_records)
    language_counts = Counter(str(r.get("language", "en")).lower() for r in cleaned_records)

    intent_deficits = {
        intent: max(0, target_intent_min - count)
        for intent, count in sorted(intent_counts.items(), key=lambda x: x[0])
    }
    intent_deficits = {k: v for k, v in intent_deficits.items() if v > 0}

    sn_deficit = max(0, target_sn_min - language_counts.get("sn", 0))
    nd_deficit = max(0, target_nd_min - language_counts.get("nd", 0))

    total_intent_additions_needed = sum(intent_deficits.values())
    total_minority_gap = sn_deficit + nd_deficit
    minority_budget = min(total_intent_additions_needed, total_minority_gap)

    minority_per_intent = allocate_proportionally(minority_budget, intent_deficits)
    minority_language_weights = {"sn": sn_deficit, "nd": nd_deficit}

    by_intent_language: List[Dict[str, Any]] = []
    by_intent_summary: List[Dict[str, Any]] = []

    for intent, deficit in sorted(intent_deficits.items(), key=lambda x: x[1], reverse=True):
        intent_minority_total = minority_per_intent.get(intent, 0)
        split = allocate_proportionally(intent_minority_total, minority_language_weights)

        add_sn = split.get("sn", 0)
        add_nd = split.get("nd", 0)
        add_en = max(0, deficit - add_sn - add_nd)

        if add_sn > 0:
            by_intent_language.append(
                {"intent": intent, "language": "sn", "recommended_additions": add_sn}
            )
        if add_nd > 0:
            by_intent_language.append(
                {"intent": intent, "language": "nd", "recommended_additions": add_nd}
            )
        if add_en > 0:
            by_intent_language.append(
                {"intent": intent, "language": "en", "recommended_additions": add_en}
            )

        by_intent_summary.append(
            {
                "intent": intent,
                "current_count": intent_counts[intent],
                "target_count": target_intent_min,
                "deficit": deficit,
                "recommended_sn": add_sn,
                "recommended_nd": add_nd,
                "recommended_en": add_en,
            }
        )

    by_intent_language = sorted(
        by_intent_language,
        key=lambda x: x["recommended_additions"],
        reverse=True,
    )

    return {
        "targets": {
            "min_examples_per_intent": target_intent_min,
            "min_shona_examples": target_sn_min,
            "min_ndebele_examples": target_nd_min,
        },
        "current_distribution": {
            "intent_counts": [
                {"intent": intent, "count": count}
                for intent, count in sorted(intent_counts.items(), key=lambda x: x[1], reverse=True)
            ],
            "language_counts": [
                {"language": language, "count": count}
                for language, count in sorted(language_counts.items(), key=lambda x: x[1], reverse=True)
            ],
        },
        "deficits": {
            "intent_deficits": [
                {"intent": intent, "deficit": deficit}
                for intent, deficit in sorted(intent_deficits.items(), key=lambda x: x[1], reverse=True)
            ],
            "language_deficits": [
                {"language": "sn", "deficit": sn_deficit},
                {"language": "nd", "deficit": nd_deficit},
            ],
        },
        "recommended_additions_summary": {
            "total_intent_additions_needed": total_intent_additions_needed,
            "minority_language_budget_applied": minority_budget,
            "remaining_budget_to_en": max(0, total_intent_additions_needed - minority_budget),
        },
        "recommended_additions_by_intent": by_intent_summary,
        "recommended_additions_by_intent_language": by_intent_language,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Phase 2 cleanup and augmentation plan")
    parser.add_argument(
        "--input",
        default="./generated/retraining_dataset.json",
        help="Path to input dataset JSON",
    )
    parser.add_argument(
        "--scored-input",
        default="./generated/retraining_dataset_scored.json",
        help="Path to Phase 1 scored dataset JSON",
    )
    parser.add_argument(
        "--cleaned-output",
        default="./generated/retraining_dataset_phase2_cleaned.json",
        help="Path to save cleaned dataset JSON",
    )
    parser.add_argument(
        "--cleanup-report-output",
        default="./generated/phase2_cleanup_report.json",
        help="Path to save cleanup report JSON",
    )
    parser.add_argument(
        "--augmentation-plan-output",
        default="./generated/phase2_augmentation_plan.json",
        help="Path to save augmentation plan JSON",
    )
    parser.add_argument(
        "--quality-threshold",
        type=int,
        default=4,
        help="Remove rows with quality_score below this threshold",
    )
    parser.add_argument(
        "--near-duplicate-threshold",
        type=float,
        default=0.90,
        help="Threshold for near-duplicate conflict detection",
    )
    parser.add_argument(
        "--target-intent-min",
        type=int,
        default=120,
        help="Target minimum examples per intent",
    )
    parser.add_argument(
        "--target-sn-min",
        type=int,
        default=500,
        help="Target minimum Shona examples",
    )
    parser.add_argument(
        "--target-nd-min",
        type=int,
        default=500,
        help="Target minimum Ndebele examples",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    input_path = Path(args.input)
    scored_path = Path(args.scored_input)
    cleaned_output = Path(args.cleaned_output)
    cleanup_report_output = Path(args.cleanup_report_output)
    augmentation_plan_output = Path(args.augmentation_plan_output)

    raw = load_json(input_path)
    scored = load_json(scored_path)

    if not isinstance(raw, list) or not isinstance(scored, list):
        raise ValueError("Input and scored datasets must be JSON arrays")

    if len(raw) != len(scored):
        raise ValueError("Input dataset and scored dataset length mismatch")

    records_with_meta: List[Dict[str, Any]] = []
    low_quality_ids = set()

    for index, (raw_item, scored_item) in enumerate(zip(raw, scored), start=1):
        text = str(raw_item.get("text", "")).strip()
        intent = str(raw_item.get("intent", "")).strip()
        language = str(raw_item.get("language", "en")).strip().lower() or "en"

        quality_score = int(scored_item.get("quality_score", 10))
        if quality_score < args.quality_threshold:
            low_quality_ids.add(index)

        records_with_meta.append(
            {
                "row_id": index,
                "text": text,
                "intent": intent,
                "language": language,
                "normalized_text": normalize_text(text),
            }
        )

    exact_actions = detect_exact_duplicate_actions(records_with_meta)
    near_actions = detect_near_duplicate_conflicts(records_with_meta, args.near_duplicate_threshold)

    remove_reasons: Dict[int, set] = defaultdict(set)

    for row_id in low_quality_ids:
        remove_reasons[row_id].add("low_quality")
    for row_id in exact_actions["duplicate_extra_ids"]:
        remove_reasons[row_id].add("exact_duplicate_extra")
    for row_id in exact_actions["duplicate_conflict_ids"]:
        remove_reasons[row_id].add("exact_duplicate_label_conflict")
    for row_id in near_actions["near_duplicate_conflict_ids"]:
        remove_reasons[row_id].add("near_duplicate_label_conflict")

    removal_ids = set(remove_reasons.keys())

    cleaned = [
        item
        for index, item in enumerate(raw, start=1)
        if index not in removal_ids
    ]

    cleanup_report = {
        "metadata": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "analysis_version": "phase2_v1",
            "source_dataset": str(input_path),
            "source_scored_dataset": str(scored_path),
            "quality_threshold": args.quality_threshold,
            "near_duplicate_threshold": args.near_duplicate_threshold,
        },
        "summary": {
            "before_count": len(raw),
            "after_count": len(cleaned),
            "removed_total": len(removal_ids),
            "removed_low_quality": len(low_quality_ids),
            "removed_exact_duplicate_extras": len(exact_actions["duplicate_extra_ids"]),
            "removed_exact_duplicate_conflicts": len(exact_actions["duplicate_conflict_ids"]),
            "removed_near_duplicate_conflicts": len(near_actions["near_duplicate_conflict_ids"]),
        },
        "distribution_before": {
            "intent_distribution": count_intents(raw),
            "language_distribution": count_languages(raw),
        },
        "distribution_after": {
            "intent_distribution": count_intents(cleaned),
            "language_distribution": count_languages(cleaned),
        },
        "exact_duplicate_analysis": {
            "duplicate_group_count": exact_actions["duplicate_group_count"],
            "label_conflict_group_count": exact_actions["label_conflict_group_count"],
            "sample_duplicate_groups": exact_actions["sample_duplicate_groups"],
            "sample_conflict_groups": exact_actions["sample_conflict_groups"],
        },
        "near_duplicate_conflict_analysis": {
            "near_duplicate_conflict_pair_count": near_actions["near_duplicate_conflict_pair_count"],
            "sample_conflict_pairs": near_actions["sample_conflict_pairs"],
        },
        "sample_removed_rows": [
            {
                "row_id": row_id,
                "text": records_with_meta[row_id - 1]["text"],
                "intent": records_with_meta[row_id - 1]["intent"],
                "language": records_with_meta[row_id - 1]["language"],
                "reasons": sorted(remove_reasons[row_id]),
            }
            for row_id in sorted(removal_ids)[:300]
        ],
    }

    augmentation_plan = {
        "metadata": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "analysis_version": "phase2_v1",
            "source_cleaned_dataset": str(cleaned_output),
        },
        "plan": build_augmentation_plan(
            cleaned_records=cleaned,
            target_intent_min=args.target_intent_min,
            target_sn_min=args.target_sn_min,
            target_nd_min=args.target_nd_min,
        ),
    }

    write_json(cleaned_output, cleaned)
    write_json(cleanup_report_output, cleanup_report)
    write_json(augmentation_plan_output, augmentation_plan)

    print("PHASE2_CLEANUP_COMPLETE")
    print(f"cleaned_output={cleaned_output}")
    print(f"cleanup_report_output={cleanup_report_output}")
    print(f"augmentation_plan_output={augmentation_plan_output}")
    print(f"before_count={cleanup_report['summary']['before_count']}")
    print(f"after_count={cleanup_report['summary']['after_count']}")
    print(f"removed_total={cleanup_report['summary']['removed_total']}")
    print(
        f"removed_low_quality={cleanup_report['summary']['removed_low_quality']}"
    )


if __name__ == "__main__":
    main()
