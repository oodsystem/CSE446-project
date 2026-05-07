# Humanitarian Aid & Relief Escrow DApp

A decentralized application (DApp) built on the Ethereum blockchain for managing humanitarian aid missions through a transparent, trustless escrow system. Donors, Relief Agencies, and a UN Arbiter interact via a Web3-powered interface — with all data stored entirely on-chain, no database required.

---

## Project Structure

```
CSE446-project/
├── truffle-project/        # Smart contract source, migrations, and Truffle config
│   ├── contracts/          # Solidity smart contracts
│   ├── migrations/         # Truffle deployment scripts
│   └── truffle-config.js
├── dapp-frontend/          # HTML/CSS/JavaScript frontend
│   ├── index.html
│   ├── app.js              # Web3.js integration & contract interaction
│   └── style.css
├── scripts/                # Helper/automation scripts
└── package.json
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or above)
- [Truffle](https://trufflesuite.com/) — `npm install -g truffle`
- [Ganache](https://trufflesuite.com/ganache/) — local Ethereum blockchain
- [MetaMask](https://metamask.io/) — browser extension for wallet interaction

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/oodsystem/CSE446-project.git
cd CSE446-project
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Ganache

Open the Ganache desktop app, or run via CLI:

```bash
npx ganache --port 7545
```

### 4. Deploy the Smart Contract

```bash
cd truffle-project
truffle migrate --reset --network development
```

### 5. Configure MetaMask

- Add a custom network in MetaMask:
  - RPC URL: `http://127.0.0.1:7545`
  - Chain ID: `1337`
- Import a Ganache account using its private key.

### 6. Run the Frontend

```bash
npx live-server dapp-frontend
```

---

## Features

### Role-Based Dashboard
- Detects the active MetaMask account and renders the correct view for **Donor**, **Relief_Agency**, or **UN_Arbiter**.
- New users can register their name and role — wallet address is pulled automatically from MetaMask.

### Global Relief Mission Feed
- Displays all **Pending** missions available for funding.
- Sort by **Highest Max Budget** and filter by **Category** or **Region** — all handled efficiently on the frontend.

### Donor
- Post missions with Category, Region, and Max Budget (in ETH).
- View pledges from Relief Agencies and fund a mission via MetaMask.
- Shows a **"Funds in Escrow"** badge on successful transaction.
- **Approve Delivery** or **Dispute** a mission after delivery is marked.

### Relief Agency
- Submit pledges on Pending missions (cannot exceed Max Budget).
- Pledge button disabled if **Reputation Score** drops below 40.
- Private **"My Missions"** section with a **"Mark as Delivered"** button for funded missions.

### UN Arbiter Panel
- View all **Disputed** missions and resolve with:
  - **Outcome A** — Refund Donor & Penalize Agency
  - **Outcome B** — Pay Agency (False Alarm)
- Displays total **platform treasury** (contract balance).

---

## Smart Contract Overview

The `HumanitarianEscrow` contract handles:

- Role-based user registration (`Donor`, `Relief_Agency`, `UN_Arbiter`)
- Mission lifecycle: `Pending → In_Transit → Delivered → Completed / Disputed`
- Trustless escrow — funds released only on confirmed delivery or arbiter resolution
- Reputation scoring for agencies (default: 100, penalized on disputes)
- Platform fee collection on successful missions

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Solidity | Smart contract language |
| Truffle | Compilation & deployment |
| Ganache | Local Ethereum blockchain |
| Web3.js | Blockchain interaction from frontend |
| MetaMask | Wallet & transaction signing |
| HTML/CSS/JS | Frontend interface |

---

## Key Design Decisions

- **Fully on-chain** — no MongoDB, SQL, or any off-chain database. All missions, pledges, users, and reputation scores live on the blockchain.
- **Real-time UI** — listens to smart contract events via Web3.js and updates automatically without page reloads.
