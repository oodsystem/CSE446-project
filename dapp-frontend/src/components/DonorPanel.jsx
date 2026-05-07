import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

const DonorPanel = () => {
  const { account, contract } = useWeb3();
  const [myMissions, setMyMissions] = useState([]);
  
  // Post Form State
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Bids State
  const [bids, setBids] = useState({}); // missionId => []
  const [bidsLoading, setBidsLoading] = useState(false);

  useEffect(() => {
    fetchMyMissions();
    if(contract) {
       contract.on("MissionPosted", fetchMyMissions);
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
      for (let i = count; i >= 1; i--) { // latest first
        const m = await contract.missions(i);
        if (m.donor.toLowerCase() === account.toLowerCase()) {
          fetched.push({
            id: Number(m.id),
            category: m.category,
            region: m.region,
            maxBudget: ethers.formatEther(m.maxBudget),
            status: Number(m.status),
            selectedAgency: m.selectedAgency,
            agreedPrice: m.agreedPrice > 0 ? ethers.formatEther(m.agreedPrice) : "0"
          });
        }
      }
      setMyMissions(fetched);
    } catch(err) {
      console.error(err);
    }
  };

  const loadBids = async (missionId) => {
    setBidsLoading(true);
    try {
      // Because `bidders` is an array inside the struct and isn't exposed by default,
      // We look at the past Events "BidPlaced" to find agencies that bid!
      const filter = contract.filters.BidPlaced(missionId);
      const events = await contract.queryFilter(filter);
      
      const uniqueAgencies = [...new Set(events.map(e => e.args[1]))];
      
      const missionBids = [];
      for (let agency of uniqueAgencies) {
        const amountWei = await contract.missionBids(missionId, agency);
        if (amountWei > 0) {
          const profile = await contract.users(agency);
          missionBids.push({
            agency,
            name: profile.name,
            reputation: Number(profile.reputation),
            amountStr: ethers.formatEther(amountWei),
            amountWei
          });
        }
      }
      setBids({...bids, [missionId]: missionBids});
    } catch(err) {
      console.error("Failed to load bids", err);
    }
    setBidsLoading(false);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if(!category || !region || !maxBudget) return;
    try {
      setIsPosting(true);
      const tx = await contract.postMission(category, maxBudget, region);
      await tx.wait();
      setCategory(''); setRegion(''); setMaxBudget('');
      fetchMyMissions();
    } catch(err) {
      console.error(err);
      alert("Post failed.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleFund = async (missionId, agencyAddress, amountWei) => {
    try {
      // Contract requires sending value matching the bid
      const tx = await contract.selectAndFund(missionId, agencyAddress, { value: amountWei });
      await tx.wait();
      alert("Successfully Escrowed Funds!");
      fetchMyMissions();
    } catch(err) {
      console.error(err);
      alert("Payment failed.");
    }
  };

  const handleApprove = async (id) => {
    try {
      const tx = await contract.approveAndPay(id);
      await tx.wait();
      alert("Payout approved!");
    } catch(e) { console.error(e); }
  }

  const handleDispute = async (id) => {
    try {
      const tx = await contract.raiseDispute(id);
      await tx.wait();
      alert("Dispute raised. UN Arbiter has been notified.");
    } catch(e) { console.error(e); }
  }

  const getStatusName = (statusCode) => {
    return ["Pending", "In_Transit", "Delivered", "Disputed", "Resolved"][statusCode];
  }

  return (
    <div className="mt-4">
      <div className="glass-panel mb-4">
        <h3>Post a New Relief Mission</h3>
        <form onSubmit={handlePost} className="grid" style={{gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'end'}}>
          <div className="form-group mb-0">
             <label>Category (e.g. Medical, Food)</label>
             <input type="text" className="form-control" value={category} onChange={e=>setCategory(e.target.value)} required/>
          </div>
          <div className="form-group mb-0">
             <label>Region (e.g. Sudan, Gaza)</label>
             <input type="text" className="form-control" value={region} onChange={e=>setRegion(e.target.value)} required/>
          </div>
          <div className="form-group mb-0">
             <label>Max Budget (ETH)</label>
             <input type="number" step="0.01" className="form-control" value={maxBudget} onChange={e=>setMaxBudget(e.target.value)} required/>
          </div>
          <button className="btn btn-primary" type="submit" disabled={isPosting}>
            {isPosting ? "Posting..." : "Post Mission"}
          </button>
        </form>
      </div>

      <h3>My Dashboard (Posted Missions)</h3>
      {myMissions.length === 0 ? <p>You haven't posted any missions yet.</p> : (
        <div className="grid">
          {myMissions.map(m => {
            const status = getStatusName(m.status);
            return (
              <div key={m.id} className="card">
                <span className={`badge ${status}`}>{status}</span>
                <h4>{m.category} in {m.region}</h4>
                <p>Max Budget: {m.maxBudget} ETH</p>
                <p>Mission #{m.id}</p>
                
                {status === "Pending" && (
                   <div className="mt-4">
                     <button className="btn" style={{background:'rgba(255,255,255,0.1)'}} onClick={() => loadBids(m.id)}>
                       {bidsLoading ? "Loading..." : "View Pledges"}
                     </button>
                     {bids[m.id] && (
                       <div className="mt-4" style={{background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px'}}>
                         {bids[m.id].length === 0 ? <p>No bids yet.</p> : bids[m.id].map(b => (
                            <div key={b.agency} className="mb-4" style={{borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px'}}>
                              <div className="flex-between">
                                 <div>
                                   <strong>{b.name}</strong>
                                   <p style={{fontSize: '12px', margin:0}}>Reputation: {b.reputation}</p>
                                 </div>
                                 <strong style={{color:'var(--gold)'}}>{b.amountStr} ETH</strong>
                              </div>
                              <button className="btn btn-success mt-4 w-100" style={{width:'100%'}} 
                               onClick={() => handleFund(m.id, b.agency, b.amountWei)}>
                               Fund Pledge
                              </button>
                            </div>
                         ))}
                       </div>
                     )}
                   </div>
                )}

                {status === "Delivered" && (
                  <div className="flex-between gap-2 mt-4">
                    <button className="btn btn-success" onClick={() => handleApprove(m.id)}>Approve Delivery</button>
                    <button className="btn btn-danger" onClick={() => handleDispute(m.id)}>Dispute</button>
                  </div>
                )}
                
                {status === "In_Transit" && (
                  <p className="mt-4 text-muted"><span className="badge Funds in Escrow" style={{background:'var(--secondary)', color: 'white'}}>Funds in Escrow</span></p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DonorPanel;
