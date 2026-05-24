# CAPSTONE PROJECT 2 PROGRESS ASSESSMENT 1

## Slide 1: Title
- AI-Powered Customer Service Platform with Integrated Ticketing System
- Focus area: Zimbabwe financial services (banks + MNOs)
- Student: Brandon K Mhako (R223931W)
- Supervisor: Mrs Mhlanga
- Program: BSc Honours Computer Science

## Slide 2: Assessment Coverage
- Data Collection
- Data Processing
- Model Performance
- Application Modules (Login, Signup, Chatbot, Ticketing, Dashboard, Wallet/Banking)
- Testing Description and Results
- Not Achieved Items
- Score Sheet (95 technical + 5 presentation)

## Slide 3: Data Collection (Primary and Secondary)
- Secondary dataset (main training set): multilingual intent records in `backend/generated/retraining_dataset.json`.
- Secondary benchmark-style set: `backend/generated/retraining_dataset_banking77.json`.
- Primary data source: reviewed production-like corrections in `backend/generated/nlp_feedback_export.json`.
- Operational domain reference data: market and location artifacts in `backend/generated/market_rates.json` and `backend/generated/location_directory.json`.

Evidence highlights:
- Main dataset quality report shows 1,635 records, 23 intents, 3 languages in `backend/generated/initial_analysis_report.json`.
- Banking77 evaluation split shows 990 usable rows in `backend/generated/eval_phase2_full_on_banking77.json`.

## Slide 4: Data Processing Workflow
Processing pipeline is implemented with reproducible scripts:
- Phase 1 analysis: `backend/scripts/phase1_dataset_analysis.py`
  - duplicate detection
  - near-duplicate detection
  - heuristic quality scoring
  - language/intent imbalance profiling
- Phase 2 cleanup and planning: `backend/scripts/phase2_dataset_cleanup.py`
  - removed low-quality and conflicting records
  - generated augmentation plan and language balancing targets

Measured cleanup outputs from `backend/generated/phase2_cleanup_report.json`:
- Before count: 1,635
- After count: 1,623
- Removed total: 12
- Removed low quality: 6
- Removed near-duplicate conflicts: 6

## Slide 5: Model Training and Evaluation Process
- Training script: `backend/scripts/train_from_dataset.py`
- Model family: XLM-RoBERTa (`xlm-roberta-base`)
- Default training settings:
  - epochs: 8
  - batch size: 16
  - learning rate: 2e-5
- Evaluation script: `backend/scripts/evaluate_intent_model.py`
  - stratified holdout split
  - weighted and macro precision/recall/F1
  - reproducibility with fixed random_state

## Slide 6: Model Performance (Main Dataset)
Source files:
- Baseline: `backend/generated/eval_baseline_retrained20260302_on_main.json`
- Latest model: `backend/generated/eval_phase2_full_on_main.json`

Results (main set):
- Accuracy: 0.571865 -> 0.847095 (delta +0.275230)
- Weighted F1: 0.538936 -> 0.832949 (delta +0.294013)
- Macro F1: 0.597728 -> 0.705307 (delta +0.107579)

Interpretation:
- Significant overall improvement after cleanup + retraining.
- Macro metrics improved, but class-balance and minority-language enhancement is still relevant.

## Slide 7: Model Performance (Banking77 Set)
Source files:
- Baseline: `backend/generated/eval_baseline_retrained20260302_on_banking77.json`
- Latest model: `backend/generated/eval_phase2_full_on_banking77.json`

Results (banking77 set):
- Accuracy: 0.777778 -> 0.818182 (delta +0.040404)
- Weighted F1: 0.753813 -> 0.804122 (delta +0.050309)
- Macro F1: 0.672500 -> 0.719057 (delta +0.046557)

Interpretation:
- Generalization improved on external-style data, though gains are smaller than on the main set.

## Slide 8: Application Modules Implemented
Authentication and access:
- Login and signup UI in `frontend/src/components/auth/LoginPage.tsx` and `frontend/src/components/auth/RegisterPage.tsx`.
- Email OTP and phone OTP APIs in `backend/app/api/endpoints/auth.py`.

Chat and support:
- Chat sessions/messages and escalation workflows in `backend/app/api/endpoints/chat.py`.
- Frontend chat with multi-session support in `frontend/src/components/chat/ChatInterface.tsx`.

Ticketing and dashboards:
- Ticket endpoint tests and flows covered in `backend/tests/test_api_endpoints.py`.
- Role-based route structure in `frontend/src/App.tsx`.

Banking/provider context:
- Linked account and provider-aware balance retrieval in `frontend/src/services/linkedPlatformsService.ts`.
- Provider context fields sent with chat messages in `frontend/src/services/apiService.ts`.

## Slide 9: Progress on Session Stability Bug
Issue addressed:
- Session selection could revert and show generic welcome state.

Implemented stabilization (frontend chat):
- guarded active session refs
- stale request protection
- one-time query session handling

Evidence in `frontend/src/components/chat/ChatInterface.tsx`:
- `activeSessionIdRef`
- `sessionLoadRequestRef`
- `handledRequestedSessionRef`
- explicit `handleSelectSession(...)`

Outcome:
- improved consistency when switching between session history items.

## Slide 10: Testing Description and Results
Automated test assets:
- API tests: `backend/tests/test_api_endpoints.py`
- NLP tests: `backend/tests/test_nlp_service.py`

Executed results (current verification run):
- `pytest tests/test_api_endpoints.py -q`
- Result: 17 collected, 16 passed, 1 failed
- Failure: `TestAuthEndpoints.test_register_user` expected status in [200, 201, 400], got 422

Additional run context:
- Full suite run collected 50 tests, but NLP suite runtime was long in this pass and was interrupted after initial progress.

## Slide 11: Not Achieved / Partially Achieved
1) Provider-first login flow not yet implemented
- Current login in `backend/app/api/endpoints/auth.py` is email/password first.

2) Server-side linked-provider ownership model not yet implemented
- `backend/app/models/user.py` has no provider-link relation fields.
- Frontend account linking still uses local storage as source of truth in `frontend/src/services/linkedPlatformsService.ts`.

3) OTP-gated provider linking UX is not yet active in current modal implementation
- Current `frontend/src/components/banking/LinkAccountModal.tsx` remains a 3-step flow without OTP verification step.

4) Backend enforcement of provider ownership on every provider-scoped action is not complete
- Provider context is accepted in chat payloads, but strict ownership validation policy is still pending.

## Slide 12: Immediate Next Sprint Plan
Priority actions:
1. Add persistent provider-link tables and active-provider state in backend data model.
2. Add provider selection/binding APIs in users/auth domain.
3. Enforce provider ownership checks in chat and banking endpoints.
4. Reintroduce OTP-gated linking UI flow in `LinkAccountModal.tsx`.
5. Fix auth test expectation mismatch (422 vs expected set) and complete full CI test run.

## Slide 13: Proposed Assessment Scoring Sheet
Technical rubric subtotal (out of 95):
- Data Collection: 18/20
- Data Processing: 18/20
- Model Performance: 17/20
- Application Modules: 20/25
- Testing and Validation: 8/10
- Proposed technical subtotal: 81/95

Presentation rubric (out of 5):
- Clarity, structure, and evidence alignment: 4/5 (proposed)

Proposed total:
- 85/100

Note:
- Final marks are assessor-controlled; these are internal proposed values based on current repository evidence.

## Slide 14: Assessor Fields (Template Block)
- Assessor Name: __________________________
- Signature: ______________________________
- Date: __________________________________
- Final Technical Score (/95): _____________
- Final Presentation Score (/5): ____________
- Final Total (/100): ______________________
- Remarks: ______________________________________________

## Slide 15: Conclusion
- Strong progress in multilingual NLP quality and core application module delivery.
- Clear evidence of measurable model gains and implemented API/UI modules.
- Remaining work is concentrated in provider-governance hardening and final test/UX closure.
- Project trajectory is on track for full capstone completion with focused final sprint execution.
