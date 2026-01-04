# 🏗️ Solana Commitment & Accountability Protocol (SCAP) - Design Doc

## 1. Executive Summary
SCAP is a decentralized protocol where users stake SOL against real-world tasks. The core philosophy is "Code over Trust"—if you fail to verify your task completion, your stake is slashed.

## 2. Core Architecture

### A. The Smart Contract (Escrow Program)
*Note: This would be built using Anchor Framework.*

**Account Structure:**
- **TaskAccount**: Stores state (`Pending`, `Verified`, `Failed`), `staked_amount`, `deadline`, `owner`, `verifier`.

**Instructions:**
1.  **`create_task(deadline, stake_amount, metadata_uri)`**:
    - Transfers `stake_amount` from User to Program PDA (Escrow).
    - Mints a "Task NFT" to the user (Soulbound/Frozen until resolution).
    - Sets state to `Pending`.
2.  **`submit_proof(proof_uri)`**:
    - Updates `TaskAccount` with IPFS link to evidence (photo, API log).
    - Emits event for Indexers/AI Agents.
3.  **`verify_task(decision: bool)`**:
    - Caller must be the assigned `verifier` (AI Agent's Wallet or DAO).
    - **If True**: Unlocks NFT, transfers Stake back to User.
    - **If False**: Burns NFT, transfers Stake to Treasury/Charity (Slashing).

### B. The NFT Metadata Standard (IPFS)
We will use the Metaplex standard but add specific attributes for filtering.

```json
{
  "name": "Commitment: Morning Run",
  "symbol": "COMMIT",
  "description": "I promise to run 5k by 10 AM.",
  "attributes": [
    { "trait_type": "Stake", "value": "0.5 SOL" },
    { "trait_type": "Deadline", "value": "1735689600" },
    { "trait_type": "Status", "value": "Pending" }
  ],
  "properties": {
    "files": [{ "uri": "ipfs://proof-image.jpg", "type": "image/jpeg" }]
  }
}
```

### C. The Verification Agent (AI Oracle)
A backend service listening for `submit_proof` events.
1.  **Listen**: Detects new proof submission on-chain.
2.  **Analyze**:
    - *Image*: Uses GPT-4o/Gemini Vision to analyze the photo (e.g., "Is this a picture of a running watch showing 5km?").
    - *Data*: Checks API (e.g., Strava).
3.  **Transact**: The Agent's Wallet signs the `verify_task` transaction on Solana.

---

## 3. User Experience Flow

1.  **Commit (The Stake)**
    - User lands on webapp.
    - Fills form: "Run 5k", Deadline: Tomorrow 10 AM, Stake: 0.1 SOL.
    - **UI**: 3D Coin toss animation.
    - **Tx**: Approve Transfer + Mint.

2.  **Execute (The Work)**
    - User does the task.
    - User uploads photo to Webapp.
    - **Tx**: `submit_proof`.

3.  **Judgment (The Verification)**
    - UI shows "Verifying... 🤖".
    - AI Agent processes in background (~30s).
    - **Notification**: "Task Verified! Funds Returned." OR "Task Rejected. Stake Slashed."

---

## 4. Implementation Steps (MVP)

Since we are in a frontend/backend environment, we will simulate the "Smart Contract" logic using a **Vault Wallet** pattern for the MVP.

**Phase 1: The "Soft" Escrow (Current Tech Stack)**
- **User** sends SOL to a central `Escrow_Wallet` (managed by our backend).
- **Backend** mints the NFT.
- **Backend** holds the SOL.
- **User** uploads proof.
- **Backend (AI)** verifies.
- **Backend** refunds SOL or sends to burn address.

**Phase 2: True Decentralization**
- Deploy Anchor Program.
- Replace Backend Wallet with Program PDA.

## 5. Next Integrated Step
We should update the `CreateReminderForm` to become the `CommitmentForm`, enabling the **Staking** input fields.
