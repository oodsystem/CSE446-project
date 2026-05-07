import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

const Web3Context = createContext();

const contractAddress = "0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab";
const expectedChainId = 1337;

// Human Readable ABI
const contractABI = [
  "function registerUser(string _name, uint8 _role)",
  "function postMission(string _category, uint256 _maxBudgetEth, string _region)",
  "function pledgeToMission(uint256 _missionId, uint256 _bidAmountEth)",
  "function selectAndFund(uint256 _missionId, address _agency) payable",
  "function markAsDelivered(uint256 _missionId)",
  "function approveAndPay(uint256 _missionId)",
  "function raiseDispute(uint256 _missionId)",
  "function resolveDispute(uint256 _missionId, bool _agencyFault)",
  "function missionBids(uint256, address) view returns (uint256)",
  "function users(address) view returns (string name, uint8 role, uint256 reputation, bool isRegistered)",
  "function missions(uint256) view returns (uint256 id, address donor, string category, uint256 maxBudget, string region, uint8 status, address selectedAgency, uint256 agreedPrice)",
  "function missionCount() view returns (uint256)",
  "event MissionPosted(uint256 missionId, address donor)",
  "event BidPlaced(uint256 missionId, address agency, uint256 amount)",
  "event MissionFunded(uint256 missionId, address agency, uint256 amount)",
  "event DeliveredMarked(uint256 missionId)",
  "event FundsReleased(uint256 missionId, address agency, uint256 amount)"
];

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customAddress, setCustomAddress] = useState(contractAddress);
  const [chainId, setChainId] = useState(null);
  const [networkError, setNetworkError] = useState("");

  useEffect(() => {
    checkIfWalletIsConnected();
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          setLoading(true);
          setAccount(accounts[0]);
          await initializeContract(accounts[0], customAddress);
        } else {
          setAccount(null);
          setContract(null);
          setUserProfile(null);
          setLoading(false);
        }
      };

      const handleChainChanged = async () => {
        setLoading(true);
        await checkIfWalletIsConnected();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) return alert("Please install MetaMask.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      await initializeContract(accounts[0], customAddress);
    } catch (error) {
      console.error(error);
    }
  };

  const updateContractAddress = async (newAddress) => {
    setCustomAddress(newAddress);
    if (account) {
      await initializeContract(account, newAddress);
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) {
        setLoading(false);
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const activeChainId = Number(network.chainId);
      setChainId(activeChainId);

      if (activeChainId !== expectedChainId) {
        setNetworkError(`Wrong network selected in MetaMask. Switch to Ganache Local (chain ${expectedChainId}).`);
      } else {
        setNetworkError("");
      }

      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length) {
        setAccount(accounts[0]);
        await initializeContract(accounts[0], customAddress);
      } else {
        setAccount(null);
        setContract(null);
        setUserProfile(null);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const initializeContract = async (accountAddress, addressArg) => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const activeChainId = Number(network.chainId);
      setChainId(activeChainId);

      if (activeChainId !== expectedChainId) {
        setContract(null);
        setUserProfile(null);
        setNetworkError(`Wrong network selected in MetaMask. Switch to Ganache Local (chain ${expectedChainId}).`);
        return;
      }

      setNetworkError("");
      const signer = await provider.getSigner();
      const escContract = new ethers.Contract(addressArg, contractABI, signer);
      setContract(escContract);
      await fetchUserProfile(accountAddress, escContract);
    } catch (err) {
      console.error("Initialization err", err);
      setContract(null);
      setUserProfile(null);
    }
    setLoading(false);
  };

  const fetchUserProfile = async (acc, escContract = contract) => {
    if (!escContract) return;
    try {
      const profile = await escContract.users(acc);
      setUserProfile({
        name: profile.name,
        role: Number(profile.role),
        reputation: Number(profile.reputation),
        isRegistered: profile.isRegistered
      });
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        contract,
        userProfile,
        loading,
        chainId,
        networkError,
        connectWallet,
        fetchUserProfile,
        customAddress,
        updateContractAddress
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
