import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

const ArbiterPanel = () => {
  const { contract } = useWeb3();
  const [disputedMissions, setDisputedMissions] = useState([]);
  const [platformTreasury, setPlatformTreasury] = useState("0");

  useEffect(() => {
    fetchDisputesAndTreasury();
    if (contract) {
      contract.on("FundsReleased", fetchDisputesAndTreasury);
    }
    return () => {
      if (contract) {
        contract.removeAllListeners("FundsReleased");
      }
    };
  }, [contract]);

  const fetchDisputesAndTreasury = async () => {
    if(!contract) return;
    try {
      const count = await contract.missionCount();
      const fetched = [];
      for (let i = 1; i <= count; i++) {
        const m = await contract.missions(i);
        if (Number(m.status) === 3) { // 3 = Disputed
          fetched.push({
            id: Number(m.id),
            category: m.category,
            region: m.region,
            donor: m.donor,
            agency: m.selectedAgency,
            agreedPrice: ethers.formatEther(m.agreedPrice)
          });
        }
      }
      setDisputedMissions(fetched);

      // Fetch contract balance (Treasury)
      const provider = contract.runner.provider;
      const balance = await provider.getBalance(await contract.getAddress());
      
      // Calculate how much of the balance is pure Escrow (In Transit / Disputed) vs free fees collected
      let escrowLocked = BigInt(0);
      for (let i = 1; i <= count; i++) {
          const m = await contract.missions(i);
          if (Number(m.status) === 1 || Number(m.status) === 2 || Number(m.status) === 3) { 
              // In_transit, Delivered, Disputed hold escrow
              escrowLocked += m.agreedPrice;
          }
      }
      const fees = balance - escrowLocked;
      setPlatformTreasury(ethers.formatEther(fees > 0n ? fees : 0n));
      
    } catch(err) {
      console.error(err);
    }
  };

  const resolveAction = async (id, agencyFault) => {
    try {
      const tx = await contract.resolveDispute(id, agencyFault);
      await tx.wait();
      alert(`Dispute Resolved! (Agency Fault: ${agencyFault})`);
      fetchDisputesAndTreasury();
    } catch(err) {
      console.error(err);
      alert("Failed to resolve dispute");
    }
  };

  return (
    <div className="mt-4">
      <div className="glass-panel text-center mb-4" style={{borderColor: 'var(--gold)'}}>
         <h3>Platform Treasury (Fees Collected)</h3>
         <h1 style={{color: 'var(--gold)', fontSize: '36px'}}>{platformTreasury} ETH</h1>
      </div>

      <h3>Disputed Missions Awaiting Resolution</h3>
      {disputedMissions.length === 0 ? <p>No current disputes require attention. Great job!</p> : (
        <div className="grid">
          {disputedMissions.map(m => (
            <div key={m.id} className="card" style={{borderColor: 'var(--danger)'}}>
              <span className="badge Disputed">Action Required</span>
              <h4>{m.category} in {m.region}</h4>
              <p style={{fontSize: '13px', wordBreak: 'break-all'}}><strong>Donor:</strong> {m.donor}</p>
              <p style={{fontSize: '13px', wordBreak: 'break-all'}}><strong>Agency:</strong> {m.agency}</p>
              <p>Escrow: <strong style={{color:'var(--gold)'}}>{m.agreedPrice} ETH</strong></p>
              
              <div className="mt-4 flex-between gap-2" style={{flexDirection: 'column'}}>
                <button className="btn btn-danger w-100" style={{width:'100%'}} onClick={() => resolveAction(m.id, true)}>
                  Outcome A (Penalize Agency & Refund)
                </button>
                <button className="btn btn-success w-100" style={{width:'100%'}} onClick={() => resolveAction(m.id, false)}>
                  Outcome B (Pay Agency & Resolve)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArbiterPanel;
