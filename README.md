**Life Admin AI — Solana-Based Commitment & Accountability dApp**

**Life Admin AI** is a Solana-powered blockchain dApp that helps users complete important tasks on time by adding real economic accountability. Users create task-based NFTs and stake SOL on their own commitments. If the task is completed before the deadline and valid proof is submitted, the staked SOL is refunded; if the task is missed or the proof is rejected, the stake is forfeited.

Each task is minted as an NFT containing immutable metadata such as the goal, deadline, stake amount, and verifier. The staked SOL is transferred to an admin (escrow) wallet at creation time, ensuring real financial consequences. Users submit proof through the NFT, which appears in a dedicated **Verification Dashboard** for manual review. The verifier can approve or reject the proof, triggering either a refund or forfeiture of the stake.

The system includes an automated **email reminder engine** that sends confirmation emails when a commitment is created and deadline-based reminders (e.g., 30 minutes before expiry). The architecture is designed to support future AI-assisted proof verification (image/video analysis) and DAO-based verification to remove centralized trust.

This project demonstrates real-world use of **Solana transactions, NFT minting, escrow-style staking, off-chain verification logic, and automated reminders,** and was built as a production-oriented dApp rather than a demo.

**Key Features**
Real SOL staking on commitments
NFT-based task representation with immutable metadata
Manual verification dashboard for proof approval/rejection
Automated email reminders before deadlines
Stake refund or forfeiture based on task outcome
Designed for future AI-based proof verification

**Tech Stack**
Solana (Testnet)
Web3.js / Metaplex
React + Wallet Adapter
Node.js + Express
IPFS (Pinata)
Nodemailer (Email reminders)








# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
