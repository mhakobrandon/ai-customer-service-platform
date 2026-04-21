"""Phase 1 dataset analysis for multilingual intent classification.

This script analyzes dataset quality and balance for:
- class imbalance
- exact duplicates and label conflicts
- near-duplicates (>= similarity threshold)
- heuristic data quality scoring
- language distribution gaps

Outputs:
- initial analysis report (JSON)
- scored dataset with quality metadata (JSON)
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Any, Dict, List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

LANGUAGES = {"en", "sn", "nd"}

AMBIGUOUS_SINGLE_TERMS = {
    "help",
    "question",
    "info",
    "information",
    "yes",
    "no",
    "ok",
    "okay",
    "sure",
    "please",
}

AMBIGUOUS_MULTI_TERMS = {
    "need help",
    "can you help",
    "i need help",
    "i have a question",
    "need information",
}

ALLOWED_SHORT_INTENTS = {"greeting", "goodbye", "escalation_request"}


def normalize_text(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def vowel_ratio(token: str) -> float:
    vowels = set("aeiou")
    letters = [ch for ch in token.lower() if ch.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for ch in letters if ch in vowels) / float(len(letters))


def non_alnum_ratio(text: str) -> float:
    if not text:
        return 0.0
    non_alnum = sum(1 for ch in text if not ch.isalnum() and not ch.isspace())
    return non_alnum / float(len(text))


def score_quality(text: str, intent: str) -> Tuple[int, List[str]]:
    score = 10
    reasons: List[str] = []

    stripped = (text or "").strip()
    if not stripped:
        return 1, ["empty_text"]

    normalized = normalize_text(stripped)
    words = re.findall(r"[\w']+", stripped, flags=re.UNICODE)

    if len(stripped) < 4:
        score -= 6
        reasons.append("very_short_char_length")
    elif len(stripped) < 8:
        score -= 3
        reasons.append("short_char_length")

    if len(words) <= 1:
        score -= 3
        reasons.append("single_word")
    elif len(words) == 2:
        score -= 2
        reasons.append("two_words")

    if normalized in AMBIGUOUS_SINGLE_TERMS and intent not in ALLOWED_SHORT_INTENTS:
        score -= 4
        reasons.append("ambiguous_generic_term")

    if normalized in AMBIGUOUS_MULTI_TERMS and intent not in ALLOWED_SHORT_INTENTS:
        score -= 3
        reasons.append("ambiguous_generic_phrase")

    if re.search(r"(.)\1{3,}", normalized):
        score -= 2
        reasons.append("repeated_characters")

    consonant_heavy_tokens = [
        tok
        for tok in words
        if tok.isalpha() and len(tok) >= 7 and vowel_ratio(tok) < 0.2
    ]
    if consonant_heavy_tokens:
        score -= 2
        reasons.append("possible_gibberish_token")

    if non_alnum_ratio(stripped) > 0.45:
        score -= 2
        reasons.append("high_non_alnum_ratio")

    score = max(1, min(10, score))
    if not reasons:
        reasons.append("clean")

    return score, reasons


def detect_exact_duplicates(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    grouped: Dict[Tuple[str, str], List[Dict[str, Any]]] = defaultdict(list)

    for row in records:
        key = (row["normalized_text"], row["language"])
        grouped[key].append(row)

    duplicate_groups = []
    label_conflicts = []
    duplicate_extra_records = 0

    for (norm_text, language), rows in grouped.items():
        if len(rows) < 2:
            continue

        intents = sorted({r["intent"] for r in rows})
        duplicate_extra_records += len(rows) - 1

        entry = {
            "normalized_text": norm_text,
            "language": language,
            "count": len(rows),
            "intents": intents,
            "row_ids": [r["row_id"] for r in rows],
        }
        duplicate_groups.append(entry)

        if len(intents) > 1:
            label_conflicts.append(entry)

    return {
        "duplicate_group_count": len(duplicate_groups),
        "duplicate_extra_records": duplicate_extra_records,
        "label_conflict_group_count": len(label_conflicts),
        "sample_duplicate_groups": duplicate_groups[:100],
        "sample_label_conflicts": label_conflicts[:100],
    }


def detect_near_duplicates(records: List[Dict[str, Any]], threshold: float) -> Dict[str, Any]:
    pairs: List[Dict[str, Any]] = []

    for language in sorted({r["language"] for r in records}):
        lang_rows = [r for r in records if r["language"] == language]
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

            pairs.append(
                {
                    "row_id_a": left["row_id"],
                    "row_id_b": right["row_id"],
                    "language": language,
                    "similarity": round(float(value), 4),
                    "same_intent": left["intent"] == right["intent"],
                    "intent_a": left["intent"],
                    "intent_b": right["intent"],
                    "text_a": left["text"],
                    "text_b": right["text"],
                }
            )

    conflicting_pairs = [p for p in pairs if not p["same_intent"]]
    pairs_sorted = sorted(pairs, key=lambda p: p["similarity"], reverse=True)

    return {
        "similarity_threshold": threshold,
        "near_duplicate_pair_count": len(pairs_sorted),
        "near_duplicate_conflict_pair_count": len(conflicting_pairs),
        "sample_pairs": pairs_sorted[:200],
        "sample_conflict_pairs": conflicting_pairs[:200],
    }


def compute_class_and_language_stats(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    intent_counts = Counter(r["intent"] for r in records)
    language_counts = Counter(r["language"] for r in records)

    intent_items = sorted(intent_counts.items(), key=lambda item: item[1], reverse=True)
    lang_items = sorted(language_counts.items(), key=lambda item: item[1], reverse=True)

    min_count = min(intent_counts.values()) if intent_counts else 0
    max_count = max(intent_counts.values()) if intent_counts else 0
    imbalance_ratio = round(max_count / float(min_count), 2) if min_count else None

    under_120 = [
        {"intent": intent, "count": count, "deficit_to_120": 120 - count}
        for intent, count in sorted(intent_counts.items(), key=lambda item: item[1])
        if count < 120
    ]

    total = len(records)
    per_language_target_even = total / 3.0 if total else 0.0
    target_500 = 500

    language_gaps = []
    for lang in ["en", "sn", "nd"]:
        count = language_counts.get(lang, 0)
        language_gaps.append(
            {
                "language": lang,
                "count": count,
                "percentage": round((count / total) * 100, 2) if total else 0.0,
                "deficit_to_500": max(0, target_500 - count),
                "deficit_to_even_split": max(0, int(round(per_language_target_even - count))),
            }
        )

    return {
        "total_records": total,
        "unique_intents": len(intent_counts),
        "intent_distribution": [
            {
                "intent": intent,
                "count": count,
                "percentage": round((count / total) * 100, 2) if total else 0.0,
            }
            for intent, count in intent_items
        ],
        "language_distribution": [
            {
                "language": language,
                "count": count,
                "percentage": round((count / total) * 100, 2) if total else 0.0,
            }
            for language, count in lang_items
        ],
        "imbalance": {
            "min_class_count": min_count,
            "max_class_count": max_count,
            "imbalance_ratio_max_over_min": imbalance_ratio,
            "classes_under_120": under_120,
            "classes_under_120_count": len(under_120),
        },
        "language_gaps": {
            "target_minority_language_count": 500,
            "per_language_target_even_split": round(per_language_target_even, 2),
            "gaps": language_gaps,
        },
    }


def compute_quality_stats(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    quality_scores = [r["quality_score"] for r in records]
    low_quality = [r for r in records if r["quality_score"] < 4]

    by_intent: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in records:
        by_intent[row["intent"]].append(row)

    per_intent = []
    for intent, rows in sorted(by_intent.items(), key=lambda item: item[0]):
        scores = [r["quality_score"] for r in rows]
        low = [r for r in rows if r["quality_score"] < 4]
        per_intent.append(
            {
                "intent": intent,
                "count": len(rows),
                "avg_quality": round(mean(scores), 2),
                "min_quality": min(scores),
                "max_quality": max(scores),
                "low_quality_count": len(low),
            }
        )

    low_quality_sorted = sorted(low_quality, key=lambda r: r["quality_score"])

    return {
        "overall": {
            "avg_quality": round(mean(quality_scores), 2) if quality_scores else 0.0,
            "min_quality": min(quality_scores) if quality_scores else 0,
            "max_quality": max(quality_scores) if quality_scores else 0,
            "low_quality_threshold": 4,
            "low_quality_count": len(low_quality),
            "low_quality_percentage": round((len(low_quality) / len(records)) * 100, 2)
            if records
            else 0.0,
        },
        "per_intent": per_intent,
        "sample_low_quality_records": [
            {
                "row_id": row["row_id"],
                "text": row["text"],
                "intent": row["intent"],
                "language": row["language"],
                "quality_score": row["quality_score"],
                "quality_reasons": row["quality_reasons"],
            }
            for row in low_quality_sorted[:200]
        ],
    }


def build_report(records: List[Dict[str, Any]], near_duplicate_threshold: float, source_path: Path) -> Dict[str, Any]:
    class_lang_stats = compute_class_and_language_stats(records)
    exact_dup_stats = detect_exact_duplicates(records)
    near_dup_stats = detect_near_duplicates(records, threshold=near_duplicate_threshold)
    quality_stats = compute_quality_stats(records)

    recommended_dedup_removals = exact_dup_stats["duplicate_extra_records"]
    low_quality_removals = quality_stats["overall"]["low_quality_count"]

    return {
        "metadata": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "analysis_version": "phase1_v1",
            "source_dataset": str(source_path),
            "near_duplicate_threshold": near_duplicate_threshold,
        },
        "summary": {
            "total_records": class_lang_stats["total_records"],
            "unique_intents": class_lang_stats["unique_intents"],
            "duplicate_extra_records": exact_dup_stats["duplicate_extra_records"],
            "near_duplicate_pairs": near_dup_stats["near_duplicate_pair_count"],
            "low_quality_records_lt4": quality_stats["overall"]["low_quality_count"],
            "recommended_candidate_removals": {
                "exact_duplicate_extras": recommended_dedup_removals,
                "low_quality_lt4": low_quality_removals,
            },
        },
        "class_and_language_analysis": class_lang_stats,
        "exact_duplicate_analysis": exact_dup_stats,
        "near_duplicate_analysis": near_dup_stats,
        "quality_analysis": quality_stats,
        "next_step_recommendations": [
            "Increase Shona and Ndebele examples toward >=500 each.",
            "Raise low-frequency intents to >=120 examples each.",
            "Resolve label conflicts found in exact and near-duplicate pairs.",
            "Review low-quality records (quality_score < 4) before augmentation.",
        ],
    }


def load_records(input_path: Path) -> List[Dict[str, Any]]:
    with input_path.open("r", encoding="utf-8") as file:
        raw = json.load(file)

    if not isinstance(raw, list):
        raise ValueError("Input dataset must be a JSON list of objects")

    records: List[Dict[str, Any]] = []
    for index, item in enumerate(raw, start=1):
        text = str(item.get("text", "")).strip()
        intent = str(item.get("intent", "")).strip()
        language = str(item.get("language", "en")).strip().lower()
        language = language if language in LANGUAGES else "en"

        normalized = normalize_text(text)
        quality_score, quality_reasons = score_quality(text, intent)

        records.append(
            {
                "row_id": index,
                "text": text,
                "intent": intent,
                "language": language,
                "normalized_text": normalized,
                "quality_score": quality_score,
                "quality_reasons": quality_reasons,
            }
        )

    return records


def write_json(path: Path, payload: Dict[str, Any] | List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Phase 1 analysis for multilingual intent dataset")
    parser.add_argument(
        "--input",
        default="./generated/retraining_dataset.json",
        help="Path to input JSON dataset",
    )
    parser.add_argument(
        "--report-output",
        default="./generated/initial_analysis_report.json",
        help="Path to save analysis report JSON",
    )
    parser.add_argument(
        "--scored-output",
        default="./generated/retraining_dataset_scored.json",
        help="Path to save scored dataset JSON",
    )
    parser.add_argument(
        "--near-duplicate-threshold",
        type=float,
        default=0.90,
        help="Similarity threshold for near-duplicate detection",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    input_path = Path(args.input)
    report_output = Path(args.report_output)
    scored_output = Path(args.scored_output)

    records = load_records(input_path)
    report = build_report(records, args.near_duplicate_threshold, input_path)

    scored_records = [
        {
            "row_id": row["row_id"],
            "text": row["text"],
            "intent": row["intent"],
            "language": row["language"],
            "quality_score": row["quality_score"],
            "quality_reasons": row["quality_reasons"],
            "source": "original",
            "augmentation_method": "none",
        }
        for row in records
    ]

    write_json(report_output, report)
    write_json(scored_output, scored_records)

    print("PHASE1_ANALYSIS_COMPLETE")
    print(f"report_output={report_output}")
    print(f"scored_output={scored_output}")
    print(f"total_records={report['summary']['total_records']}")
    print(f"low_quality_lt4={report['summary']['low_quality_records_lt4']}")
    print(f"duplicate_extra_records={report['summary']['duplicate_extra_records']}")
    print(f"near_duplicate_pairs={report['summary']['near_duplicate_pairs']}")


if __name__ == "__main__":
    main()
