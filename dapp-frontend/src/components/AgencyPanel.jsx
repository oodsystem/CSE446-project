import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

const AgencyPanel = () => {
  const { account, contract } = useWeb3();
  const [myMissions, setMyMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyMissions();
    if(contract) {
       contract.on("MissionFunded", fetchMyMissions);
       contract.on("DeliveredMarked", fetchMyMissions);
       contract.on("FundsReleased", fetchMyMissions);
    }
  }, [contract, account]);

  const fetchMyMissions = async () => {
    if(!contract) return;
    try {
      const count = await contract.missionCount();
      const fetched = [];
      for (let i = count; i >= 1; i--) {
        const m = await contract.missions(i);
        // Only show missions where this agency was selected and funded
        if (m.selectedAgency.toLowerCase() === account.toLowerCase() && Number(m.status) > 0) {
          fetched.push({
            id: Number(m.id),
            category: m.category,
            region: m.region,
            status: Number(m.status),
            agreedPrice: ethers.formatEther(m.agreedPrice)
          });
        }
      }
      setMyMissions(fetched);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async (id) => {
    try {
      const tx = await contract.markAsDelivered(id);
      await tx.wait();
      alert("Mission marked as delivered! Awaiting Donor Approval.");
      fetchMyMissions();
    } catch(err) {
      console.error(err);
      alert("Failed to mark delivered.");
    }
  };

  const getStatusName = (statusCode) => {
    return ["Pending", "In_Transit", "Delivered", "Disputed", "Resolved"][statusCode];
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="mt-4">
      <h3>My Active Deliveries (Agency Wallet)</h3>
      {myMissions.length === 0 ? <p>You have not been selected for any missions yet.</p> : (
        <div className="grid">
          {myMissions.map((m) => {
            const status = getStatusName(m.status);
            return (
              <div key={m.id} className="card">
                <span className={`badge ${status}`}>{status}</span>
                <h4>{m.category} in {m.region}</h4>
                <p>Agreed Payout: <strong style={{color:'var(--gold)'}}>{m.agreedPrice} ETH</strong></p>
                <p>Mission #{m.id}</p>
                
                {status === "In_Transit" && (
                  <div className="mt-4">
                    <button className="btn btn-success w-100" style={{width:'100%'}} onClick={() => handleMarkDelivered(m.id)}>
                      Mark as Delivered
                    </button>
                  </div>
                )}
                {status === "Disputed" && (
                  <p className="mt-4" style={{color: 'var(--danger)'}}>Dispute Under Investigation</p>
                )}
                {status === "Resolved" && (
                  <p className="mt-4 text-muted">Issue Resolved</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgencyPanel;
