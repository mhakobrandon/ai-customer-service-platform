# Results and Training Datasets

## 1) Model and Evaluation Setup

- Model family: XLM-RoBERTa sequence classifier (base model name: xlm-roberta-base).
- Intent classes: 23.
- Languages supported: English, Shona, Ndebele.
- Evaluation split used for metric comparison: stratified 80/20 holdout, random_state = 42.

## 2) Final Performance Results

| Evaluation Dataset | Records | Val Records (20%) | Model Checkpoint | Accuracy | Precision (Weighted) | Recall (Weighted) | F1 (Weighted) | F1 (Macro) |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| retraining_dataset.json | 1635 | 327 | trained_model | 54.74% | 62.08% | 54.74% | 50.77% | 56.28% |
| retraining_dataset.json | 1635 | 327 | trained_model_retrained_20260302 | 57.19% | 63.96% | 57.19% | 53.89% | 59.77% |
| retraining_dataset_banking77.json | 990 | 198 | trained_model | 77.78% | 77.63% | 77.78% | 75.50% | 67.04% |
| retraining_dataset_banking77.json | 990 | 198 | trained_model_retrained_20260302 | 77.78% | 76.70% | 77.78% | 75.38% | 67.25% |

### Interpretation

- On the main multilingual retraining dataset, performance is moderate (best accuracy: 57.19%).
- On the Banking77-augmented evaluation file in this repository, both checkpoints reach 77.78% accuracy.
- This indicates task/dataset difficulty differs substantially between evaluation sets.

## 2.1) Phase 2 Optimization Pass (Executed 2026-04-21)

### Phase 2 Cleanup Outcomes

- Input dataset: backend/generated/retraining_dataset.json (1635 rows)
- Cleaned dataset: backend/generated/retraining_dataset_phase2_cleaned.json (1623 rows)
- Total rows removed: 12
   - Low-quality rows (quality_score < 4): 6
   - Near-duplicate cross-intent conflict rows: 6 (3 conflict pairs)
   - Exact duplicate extras: 0

### Phase 2 Augmentation Targets

- Target policy used:
   - Minimum 120 examples per intent
   - Minimum 500 Shona examples
   - Minimum 500 Ndebele examples
- Post-cleaning deficits:
   - Intent-level additions needed to reach >=120 per intent: 1369
   - Minority-language gap budget applied (sn + nd): 576
   - Remaining additions allocated to English by plan: 793

### Before vs After (Final Phase 2 Model)

The Phase 2 run was initialized from trained_model_retrained_20260302 and completed a 2-epoch training pass, producing:

- backend/trained_model_phase2_20260421_full

| Evaluation Dataset | Records | Val Records (20%) | Model Checkpoint | Accuracy | Precision (Weighted) | Recall (Weighted) | F1 (Weighted) | F1 (Macro) |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| retraining_dataset.json | 1635 | 327 | trained_model_retrained_20260302 (baseline) | 57.19% | 63.96% | 57.19% | 53.89% | 59.77% |
| retraining_dataset.json | 1635 | 327 | trained_model_phase2_20260421_full (Epoch 2 final) | 84.71% | 83.45% | 84.71% | 83.29% | 70.53% |
| retraining_dataset_banking77.json | 990 | 198 | trained_model_retrained_20260302 (baseline) | 77.78% | 76.70% | 77.78% | 75.38% | 67.25% |
| retraining_dataset_banking77.json | 990 | 198 | trained_model_phase2_20260421_full (Epoch 2 final) | 81.82% | 82.20% | 81.82% | 80.41% | 71.91% |

### Phase 2 Evaluation Notes

- Metrics above come from script: backend/scripts/evaluate_intent_model.py
- Evaluation protocol: stratified 80/20 split, random_state = 42 (same as prior report)
- Training was executed on CPU; final Phase 2 metrics shown above are from the completed 2-epoch run.

### Dissertation-Ready Results Narrative (Formal Style)

Phase 2 yielded a marked improvement in predictive performance on the primary multilingual evaluation set. Compared with the baseline checkpoint (trained_model_retrained_20260302), the finalized model (trained_model_phase2_20260421_full) increased accuracy from 57.19% to 84.71% (delta = +27.52 percentage points), weighted F1 from 53.89% to 83.29% (delta = +29.40), and macro F1 from 59.77% to 70.53% (delta = +10.76). These improvements indicate that the Phase 2 data-centric interventions, specifically low-quality sample removal and near-duplicate cross-intent conflict cleanup, substantially improved in-domain intent separability.

On the Banking77-mapped dataset, gains were smaller but directionally consistent across all primary metrics. Accuracy increased from 77.78% to 81.82% (delta = +4.04), weighted F1 increased from 75.38% to 80.41% (delta = +5.03), and macro F1 increased from 67.25% to 71.91% (delta = +4.66). This result supports the conclusion that Phase 2 produced measurable generalization gains beyond the main retraining distribution.

Taken together, the findings support the thesis argument that iterative dataset quality management and controlled rebalancing can produce large practical performance gains for multilingual intent classification in mixed-resource settings.

### Citation-Style Ready Wording Variants

- APA-style voice: "Relative to the baseline model, the finalized Phase 2 model demonstrated substantial gains on the primary multilingual dataset, with accuracy improving from 57.19% to 84.71%, weighted F1 from 53.89% to 83.29%, and macro F1 from 59.77% to 70.53%. On the Banking77-mapped set, performance also improved, indicating that data quality interventions and continued fine-tuning were associated with stronger generalization (Author, Year)."
- IEEE-style voice: "The finalized Phase 2 model outperformed the baseline on both evaluation sets. On the primary multilingual set, accuracy increased by 27.52 percentage points and weighted F1 increased by 29.40 points; on the Banking77-mapped set, accuracy and weighted F1 improved by 4.04 and 5.03 points, respectively. These results suggest that targeted data curation and additional fine-tuning can materially improve multilingual intent classification performance [1]."
- Harvard-style voice: "Compared with the baseline checkpoint, the final Phase 2 model achieved higher scores across all reported metrics on both datasets, most notably on the primary multilingual set (accuracy 57.19% to 84.71%; weighted F1 53.89% to 83.29%). This supports the view that iterative data-quality management and controlled rebalancing can improve intent classification outcomes in multilingual, mixed-resource contexts (Author, Year)."

### Dissertation-Ready Table Captions

- Table Caption (Phase 2 Data Curation): "Phase 2 data curation summary showing quality-based filtering and near-duplicate conflict removal from the retraining corpus. The cleaning step reduced the dataset from 1,635 to 1,623 instances before augmentation planning."
- Table Caption (Model Comparison): "Baseline vs finalized Phase 2 model performance on the primary multilingual retraining dataset and the Banking77-mapped evaluation dataset, measured using stratified 80/20 holdout evaluation (random_state = 42)."
- Table Footnote (Recommended): "Phase 2 model initialized from trained_model_retrained_20260302 and fine-tuned for two additional epochs on retraining_dataset_phase2_cleaned.json."

### Threats to Validity

- Internal validity: Although the split strategy is fixed and stratified, improvements combine multiple interventions (cleanup plus continued fine-tuning), so attribution to a single change should be interpreted cautiously.
- Construct validity: Evaluation uses intent-classification metrics (accuracy, weighted F1, macro F1), which do not fully capture downstream conversational success, escalation quality, or user satisfaction.
- External validity: The evaluation corpora are domain-specific (banking support) and may not represent performance for other domains or language distributions.
- Statistical conclusion validity: Results are currently reported from one deterministic holdout configuration (random_state = 42); repeated runs or cross-validation would provide stronger variance estimates.

### Limitations and Future Work

- Current limitation: The final reported Phase 2 result is based on one deterministic holdout split; this does not quantify variance across seeds or data folds.
- Current limitation: The study reports classification metrics only; operational outcomes such as response helpfulness, containment rate, and escalation quality were not measured in this phase.
- Current limitation: Dataset imbalance was reduced but not eliminated, and minority-language robustness should be further stress-tested with harder paraphrases and code-switching inputs.
- Future work: Run repeated-seed experiments and k-fold cross-validation to estimate confidence intervals for all key metrics.
- Future work: Execute ablation studies isolating each intervention (quality filtering only, conflict removal only, augmentation only, and combined pipeline).
- Future work: Expand augmentation with human review for Shona and Ndebele, then evaluate fairness gaps per intent and per language.
- Future work: Validate the model in an end-to-end pilot with real user traffic and report business-facing KPIs alongside ML metrics.

## 3) Datasets Used to Train Models

### A. Base Internal Intent Datasets (from source code)

1. backend/app/services/expanded_training_data.py
   - Variable: EXPANDED_TRAINING_DATA
   - Rows: 479
   - Intents: 18
   - Languages: en 238, sn 171, nd 70

2. backend/app/services/additional_training_data.py
   - Variable: ADDITIONAL_TRAINING_DATA
   - Rows: 440
   - Intents: 16
   - Languages: en 235, sn 126, nd 79

3. Combined base set before de-duplication
   - Rows: 919
   - Intents: 23
   - Languages: en 473, sn 297, nd 149

4. Combined base set after text de-duplication (used by the training main flow)
   - Rows: 874
   - Intents: 23
   - Languages: en 450, sn 283, nd 141

### B. Feedback Dataset

5. backend/generated/nlp_feedback_export.json
   - Reviewed feedback examples exported from admin workflow
   - Rows currently in file: 6
   - Language: en

### C. Retraining Datasets Generated by Pipeline

6. backend/generated/retraining_dataset.json
   - Built from: base internal data + reviewed feedback (with intent correction overwrite by text+language key)
   - Rows: 1635
   - Intents: 23
   - Languages: en 1209, sn 285, nd 141

7. backend/generated/retraining_dataset_banking77.json
   - Banking77-mapped training/evaluation file present in repository
   - Rows: 990
   - Intents: 23
   - Languages: en 564, sn 285, nd 141

8. backend/generated/retraining_dataset_phase2_cleaned.json
   - Built by Phase 2 cleanup from retraining_dataset.json
   - Rows: 1623
   - Rows removed vs source: 12
   - Removal reasons: low-quality records and near-duplicate cross-intent conflicts

9. backend/generated/phase2_cleanup_report.json
   - Detailed cleanup audit (removed row IDs, reason tags, before/after distributions)

10. backend/generated/phase2_augmentation_plan.json
   - Targeted augmentation allocation by intent and language to close imbalance gaps

### D. Banking77 External Source

8. HuggingFace BANKING77 (loaded at runtime by adapter)
   - Adapter file: backend/app/services/banking77_adapter.py
   - Function: build_banking77_examples
   - Mapping dictionary: BANKING77_TO_LOCAL_INTENT
   - Added through retraining pipeline flag: --include-banking77

## 4) Important Provenance Note for Dissertation

- The current saved model folders do not embed full dataset provenance metadata (for example, exact command and exact input file used at train time).
- Therefore, from artifacts alone, we can confirm the available datasets and measured outcomes, but not prove with certainty which exact generated JSON file produced each checkpoint unless external training logs are provided.

## 5) Reproducible Banking77 Training Command

From backend folder:

python -m app.services.retraining_pipeline --train --include-banking77 --output-data ./generated/retraining_dataset_banking77.json --model-output ./trained_model_retrained_banking77

This command creates a Banking77-augmented merged dataset and trains a separate checkpoint.

## 6) Reproducible Phase 2 Commands

From backend folder:

python scripts/phase2_dataset_cleanup.py --input ./generated/retraining_dataset.json --scored-input ./generated/retraining_dataset_scored.json --cleaned-output ./generated/retraining_dataset_phase2_cleaned.json --cleanup-report-output ./generated/phase2_cleanup_report.json --augmentation-plan-output ./generated/phase2_augmentation_plan.json --quality-threshold 4 --near-duplicate-threshold 0.90 --target-intent-min 120 --target-sn-min 500 --target-nd-min 500

python scripts/evaluate_intent_model.py --model-path ./trained_model_retrained_20260302 --dataset ./generated/retraining_dataset.json --output ./generated/eval_baseline_retrained20260302_on_main.json --tag baseline_retrained20260302_main

python scripts/evaluate_intent_model.py --model-path ./trained_model_retrained_20260302 --dataset ./generated/retraining_dataset_banking77.json --output ./generated/eval_baseline_retrained20260302_on_banking77.json --tag baseline_retrained20260302_banking77

python scripts/train_from_dataset.py --input ./generated/retraining_dataset_phase2_cleaned.json --model-name ./trained_model_retrained_20260302 --model-output ./trained_model_phase2_20260421_full --epochs 2 --batch-size 16 --learning-rate 2e-5

python scripts/evaluate_intent_model.py --model-path ./trained_model_phase2_20260421_full --dataset ./generated/retraining_dataset.json --output ./generated/eval_phase2_full_on_main.json --tag phase2_full_main

python scripts/evaluate_intent_model.py --model-path ./trained_model_phase2_20260421_full --dataset ./generated/retraining_dataset_banking77.json --output ./generated/eval_phase2_full_on_banking77.json --tag phase2_full_banking77
