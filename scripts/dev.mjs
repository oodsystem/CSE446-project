import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const truffleDir = path.join(rootDir, "truffle-project");
const frontendDir = path.join(rootDir, "dapp-frontend");
const contractArtifactPath = path.join(truffleDir, "build", "contracts", "HumanitarianEscrow.json");
const frontendContextPath = path.join(frontendDir, "src", "context", "Web3Context.jsx");
const host = "127.0.0.1";
const port = 7545;

function run(command, args, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

function spawnBackground(command, args, cwd) {
  return spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });
}

function waitForPort(targetHost, targetPort, timeoutMs = 15000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket();

      socket.setTimeout(1000);
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("timeout", () => socket.destroy());
      socket.once("error", () => socket.destroy());
      socket.once("close", () => {
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${targetHost}:${targetPort}`));
          return;
        }
        setTimeout(tryConnect, 300);
      });

      socket.connect(targetPort, targetHost);
    };

    tryConnect();
  });
}

async function isPortOpen(targetHost, targetPort) {
  try {
    await waitForPort(targetHost, targetPort, 1000);
    return true;
  } catch {
    return false;
  }
}

async function updateFrontendContractAddress() {
  const artifactRaw = await fs.readFile(contractArtifactPath, "utf8");
  const artifact = JSON.parse(artifactRaw);
  const networkIds = Object.keys(artifact.networks || {});

  if (networkIds.length === 0) {
    throw new Error("No deployed contract network found in artifact.");
  }

  const latestNetworkId = networkIds[networkIds.length - 1];
  const deployedAddress = artifact.networks[latestNetworkId]?.address;

  if (!deployedAddress) {
    throw new Error("Deployed contract address missing from artifact.");
  }

  const source = await fs.readFile(frontendContextPath, "utf8");
  const updated = source.replace(
    /const contractAddress = "[^"]+";/,
    `const contractAddress = "${deployedAddress}";`
  );

  if (source !== updated) {
    await fs.writeFile(frontendContextPath, updated, "utf8");
    console.log(`Updated frontend contract address to ${deployedAddress}`);
  } else {
    console.log(`Frontend contract address already set to ${deployedAddress}`);
  }
}

async function main() {
  const nodeBin = process.execPath;
  const ganacheCli = path.join(truffleDir, "node_modules", "ganache", "dist", "node", "cli.js");
  const truffleCli = path.join(truffleDir, "node_modules", "truffle", "build", "cli.bundled.js");
  const viteCli = path.join(frontendDir, "node_modules", "vite", "bin", "vite.js");

  let ganacheProcess = null;
  const ganacheAlreadyRunning = await isPortOpen(host, port);

  if (ganacheAlreadyRunning) {
    console.log(`Ganache already running on http://${host}:${port}`);
  } else {
    console.log(`Starting Ganache on http://${host}:${port}`);
    ganacheProcess = spawnBackground(
      nodeBin,
      [ganacheCli, "--server.host", host, "--server.port", String(port), "--wallet.deterministic", "true", "--chain.chainId", "1337"],
      truffleDir
    );
    await waitForPort(host, port);
  }

  try {
    console.log("Deploying smart contract with Truffle...");
    await run(nodeBin, [truffleCli, "migrate", "--network", "development", "--reset"], truffleDir);

    console.log("Syncing deployed contract address into the frontend...");
    await updateFrontendContractAddress();

    console.log("Starting Vite dev server...");
    await run(nodeBin, [viteCli, "--host", "0.0.0.0"], frontendDir);
  } finally {
    if (ganacheProcess && !ganacheProcess.killed) {
      ganacheProcess.kill("SIGTERM");
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
