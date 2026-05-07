import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

const Web3Context = createContext();

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Example Local Ganache Address (will be updated post-deployment)

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

  useEffect(() => {
    checkIfWalletIsConnected();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if(accounts.length > 0) {
          setAccount(accounts[0]);
          fetchUserProfile(accounts[0]);
        } else {
          setAccount(null);
          setUserProfile(null);
        }
      });
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
    if(account) {
      await initializeContract(account, newAddress);
    }
  }

  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) {
        setLoading(false);
        return;
      }
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length) {
        setAccount(accounts[0]);
        await initializeContract(accounts[0], customAddress);
      } else {
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
      const signer = await provider.getSigner();
      const escContract = new ethers.Contract(addressArg, contractABI, signer);
      setContract(escContract);
      await fetchUserProfile(accountAddress, escContract);
    } catch(err) {
      console.error("Initialization err", err);
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
