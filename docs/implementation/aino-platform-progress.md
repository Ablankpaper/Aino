# Aino Platform Integration Progress

## Baseline Information

**Date Started:** 2026-09-14

**Repositories:**
- Aino: `/Users/zizimutou/Protect/Aino`
  - Branch: `codex/aino-platform-identity-models-billing`
  - Base SHA: `3bb72e32b1b2a83896439587651d73dd9a3d2319`
- Aino-API: `/Users/zizimutou/Protect/Aino-API`
  - Branch: `codex/aino-platform-identity-models-billing`
  - Base SHA: `bdb42e22f81fcb633ff0a060961211dd2bcb515b`

**Remotes:**
- Aino: `https://github.com/Ablankpaper/Aino.git`
- Aino-API: `https://github.com/Ablankpaper/Aino-API.git`

---

## Phase A: SMS and Unified Account (短信与统一账户)

### A1: Phone Identity, Database & Legacy Compatibility
- [ ] A1-Step1: Normalization and placeholder email tests
- [ ] A1-Step2: Run red tests
- [ ] A1-Step3: Implement normalization/reserved domain
- [ ] A1-Step4: Real PostgreSQL migration and constraint tests
- [ ] A1-Step5: Generate and review
- [ ] A1-Step6: Commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### A2: SMS Sender, Redis Challenge & Configuration
- [ ] A2-Step1: Create real Redis fixture and controllable sender
- [ ] A2-Step2: Red tests
- [ ] A2-Step3: Implement rate limiting and consumption
- [ ] A2-Step4: Aliyun adapter and dev guard
- [ ] A2-Step5: Error matrix validation
- [ ] A2-Step6: Regression and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### A3: Login, Account Binding & Auth Policy
- [ ] A3-Step1: Behavior-level handler/integration fixture
- [ ] A3-Step2: Red tests
- [ ] A3-Step3: Implement real transactions
- [ ] A3-Step4: Reuse auth completion mechanism
- [ ] A3-Step5: Policy and authorization coverage
- [ ] A3-Step6: Regression and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### A4: Website Login, Profile, SMS Management & Terms
- [ ] A4-Step1: UI contract tests
- [ ] A4-Step2: Run red tests
- [ ] A4-Step3: Implement three independent modules
- [ ] A4-Step4: State and privacy handling
- [ ] A4-Step5: Validation
- [ ] A4-Step6: Commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### A5: Electron Platform Account, Token & Typed IPC
- [ ] A5-Step1: Main binding target and secret export tests
- [ ] A5-Step2: Run red tests
- [ ] A5-Step3: Endpoint/token isolation
- [ ] A5-Step4: Independent secure token store
- [ ] A5-Step5: IPC and multi-window broadcast
- [ ] A5-Step6: Validation and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### A6: Desktop Login Window & My Account Wiring
- [ ] A6-Step1: Account independent of backend behavior tests
- [ ] A6-Step2: Red tests
- [ ] A6-Step3: Global platform account scope
- [ ] A6-Step4: Phone/existing account/TOTP states
- [ ] A6-Step4a: Captcha integration
- [ ] A6-Step5: My account and migration
- [ ] A6-Step6: Automated and native validation
- [ ] A6-Step7: Commit and complete Phase A threshold

**Status:** Not started  
**Commit SHA:**  
**Notes:**

---

## Phase B: Built-in Models & Runtime (内置模型与运行时)

### B1: Official Model Catalog & Bootstrap
- [ ] B1-Step1: Permission contract tests
- [ ] B1-Step2: Red tests
- [ ] B1-Step3: Read-only aggregation
- [ ] B1-Step4: Backend configurable entry
- [ ] B1-Step5: Response and compatibility validation
- [ ] B1-Step6: Test and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### B2: User-specific Inference Credentials & Revocation
- [ ] B2-Step1: Real concurrency/parent session revocation tests
- [ ] B2-Step2: Red tests
- [ ] B2-Step3: create/reuse/renew implementation
- [ ] B2-Step4: Revocation and permissions
- [ ] B2-Step5: Prevent response secret re-persistence
- [ ] B2-Step6: Validation and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### B3: Main Process to Target Session Binding
- [ ] B3-Step1: Main binding and secret outlet tests
- [ ] B3-Step2: Red tests
- [ ] B3-Step3: Main resolution and target authentication
- [ ] B3-Step4: RPC lifecycle implementation
- [ ] B3-Step5: Permission, async, persistence tests
- [ ] B3-Step6: Regression and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### B4: Agent Init, Restart Recovery & Real Model Protocol
- [ ] B4-Step1: Real Agent init/recovery red tests
- [ ] B4-Step2: Red tests
- [ ] B4-Step3: Draft-then-bind implementation
- [ ] B4-Step4: Real protocol/recovery
- [ ] B4-Step5: Renewal, switching, cache invariants
- [ ] B4-Step6: Validation and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### B5: Auxiliary Billing Scope & Turn Correlation
- [ ] B5-Step1: Real resolution chain red tests
- [ ] B5-Step2: Red tests
- [ ] B5-Step3: Scope propagation
- [ ] B5-Step4: Auth/stream recovery
- [ ] B5-Step5: Actual consumer coverage
- [ ] B5-Step6: Regression and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### B6: Model Settings, Input Box, Blank Home & Error Recovery
- [ ] B6-Step1: Home and conversation shared state red tests
- [ ] B6-Step2: Red tests
- [ ] B6-Step3: Model catalog/grouping
- [ ] B6-Step4: Unified submission entry
- [ ] B6-Step5: Experience and feature regression
- [ ] B6-Step6: Validation and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

---

## Phase C: Wallet, Recharge & Reconciliation (钱包充值与对账)

### C1: Wallet Summary, Quote & Real Amounts
- [ ] C1-Step1: Precision and source contract
- [ ] C1-Step2: Red tests
- [ ] C1-Step3: Extract shared quote resolver
- [ ] C1-Step4: Wallet correct source and auth
- [ ] C1-Step5: Boundary coverage and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### C2: Usage Records, Turn Correlation & Settlement Status
- [ ] C2-Step1: Cross-user filtering and deduction tests
- [ ] C2-Step2: Red tests
- [ ] C2-Step3: Receive and strip reconciliation headers
- [ ] C2-Step4: Real recording/indexing
- [ ] C2-Step5: Display eventual consistency
- [ ] C2-Step6: Validation and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### C3: Order Persistent Idempotency, Exception Recovery & Callback Safety
- [ ] C3-Step1: Reproduce duplicate creation and external timeout
- [ ] C3-Step2: Red tests
- [ ] C3-Step3: Reserve persistent request then call channel
- [ ] C3-Step4: Handle external unknown and legacy client compatibility
- [ ] C3-Step5: Signature/idempotent credit regression
- [ ] C3-Step6: Test and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

### C4: Native Wallet, Recharge & Order Recovery UI
- [ ] C4-Step1: State and close recovery red tests
- [ ] C4-Step2: Red tests
- [ ] C4-Step3: My account wallet and history
- [ ] C4-Step4: Recharge steps
- [ ] C4-Step5: Polling and URL safety
- [ ] C4-Step6: Turn subtext and custom fees
- [ ] C4-Step7: Test and commit

**Status:** Not started  
**Commit SHA:**  
**Notes:**

---

## Phase D: Acceptance, Release & Delivery (验收、发布与交付)

### D1: Complete Isolated Integration Fixtures & Validation Records
- [ ] D1-Step1: Establish isolated infrastructure
- [ ] D1-Step2: Write cross-repo core scenarios
- [ ] D1-Step3: Establish legacy user upgrade scenario
- [ ] D1-Step4: Execute all coverage items in matrix

**Status:** Not started  
**Notes:**

### D2: Run Automated Validation & Native Desktop QA
- [ ] D2-Step1: API quality gates
- [ ] D2-Step2: Aino quality gates
- [ ] D2-Step3: Native QA
- [ ] D2-Step4: Multi-platform actual differences
- [ ] D2-Step5: Fix and regression
- [ ] D2-Step6: Commit this phase

**Status:** Not started  
**Notes:**

### D3: Real Service Integration & Production Release Preparation
- [ ] D3-Step1: Fill accurate operation sheet
- [ ] D3-Step2: Confirm deployment artifacts match paired version
- [ ] D3-Step3: Collect dependencies then real limited test
- [ ] D3-Step4: Real complete closed loop
- [ ] D3-Step5: Batch release order
- [ ] D3-Step6: Rollback drill
- [ ] D3-Step7: Record authorization and actual completion level

**Status:** Not started  
**Notes:**

### D4: Claude Delivery Report & Codex Final Review
- [ ] D4-Step1: Check differences and commit scope
- [ ] D4-Step2: Write report against matrix
- [ ] D4-Step3: Deliver to user
- [ ] D4-Step4: Codex takes over substantive issue checking

**Status:** Not started  
**Notes:**

---

## Test Execution Records

### Baseline Tests
**Date:**  
**Command:**  
**Result:**  
**Notes:**

### Integration Tests
**Date:**  
**Command:**  
**Result:**  
**Notes:**

### End-to-End Tests
**Date:**  
**Command:**  
**Result:**  
**Notes:**

---

## Known Issues and Blockers

None yet.

---

## External Dependencies Pending

- SMS template full text and variables
- SMS server credentials
- Telecom signature verification result
- Production deployment SHA and addresses
- Official model groups, model list, default model, pricing
- Payment channels and merchant configuration
- Terms/privacy policy and support contact
- Real SMS recipients, test amounts/counts and environment authorization
