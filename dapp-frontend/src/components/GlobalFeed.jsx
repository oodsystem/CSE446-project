import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

const GlobalFeed = () => {
  const { contract, userProfile } = useWeb3();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  // Pledging logic (Agency only)
  const [pledgeAmount, setPledgeAmount] = useState({});
  const [pledgeLoading, setPledgeLoading] = useState(false);

  useEffect(() => {
    fetchMissions();
    
    // Listen to events to auto refresh
    if(contract) {
       contract.on("MissionPosted", fetchMissions);
       contract.on("BidPlaced", fetchMissions);
       contract.on("MissionFunded", fetchMissions);
    }
    return () => {
       if(contract) {
         contract.removeAllListeners("MissionPosted");
         contract.removeAllListeners("BidPlaced");
         contract.removeAllListeners("MissionFunded");
       }
    }
  }, [contract]);

  const fetchMissions = async () => {
    if (!contract) return;
    try {
      const count = await contract.missionCount();
      const fetched = [];
      for (let i = 1; i <= count; i++) {
        const m = await contract.missions(i);
        // Only fetch Pending missions (Status 0)
        if (Number(m.status) === 0) {
          fetched.push({
            id: Number(m.id),
            donor: m.donor,
            category: m.category,
            maxBudget: ethers.formatEther(m.maxBudget),
            region: m.region,
            status: Number(m.status)
          });
        }
      }
      setMissions(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePledge = async (id, maxBudget) => {
    const amount = pledgeAmount[id];
    if (!amount || isNaN(amount) || amount <= 0) return alert("Invalid amount");
    if (Number(amount) > Number(maxBudget)) return alert("Cannot bid higher than Donor's max budget.");
    if (userProfile.reputation < 40) return alert("Reputation below 40. Pledging locked.");

    try {
      setPledgeLoading(true);
      const tx = await contract.pledgeToMission(id, amount);
      await tx.wait();
      alert("Pledge submitted successfully!");
      fetchMissions();
    } catch (err) {
      console.error(err);
      alert("Pledge failed.");
    } finally {
      setPledgeLoading(false);
    }
  };

  const filteredMissions = missions
    .filter(m => (categoryFilter ? m.category.toLowerCase().includes(categoryFilter.toLowerCase()) : true))
    .filter(m => (regionFilter ? m.region.toLowerCase().includes(regionFilter.toLowerCase()) : true))
    .sort((a, b) => Number(b.maxBudget) - Number(a.maxBudget)); // Highest budget first

  if (loading) return <div>Loading Feed...</div>;

  return (
    <div className="glass-panel mt-4">
      <div className="flex-between mb-4">
        <h3>Global Relief Mission Feed</h3>
        <div className="flex-between gap-2">
          <input 
            type="text" 
            placeholder="Filter by Category..." 
            className="form-control" 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="Filter by Region..." 
            className="form-control" 
            value={regionFilter} 
            onChange={e => setRegionFilter(e.target.value)} 
          />
        </div>
      </div>

      {filteredMissions.length === 0 ? <p>No pending missions found.</p> : (
        <div className="grid">
          {filteredMissions.map((m) => (
            <div key={m.id} className="card">
              <span className="badge Pending">Pending</span>
              <h4 style={{marginBottom:'8px'}}>{m.category} in {m.region}</h4>
              <p style={{fontSize: '14px', margin:0}}>Max Budget: <strong>{m.maxBudget} ETH</strong></p>
              <p style={{fontSize: '12px'}}>Mission #{m.id}</p>

              {userProfile.role === 3 && ( // Relief Agency
                <div className="mt-4" style={{borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px'}}>
                  {userProfile.reputation < 40 ? (
                    <div style={{color: 'var(--danger)', fontSize: '13px'}}>Reputation locked (Score: {userProfile.reputation})</div>
                  ) : (
                    <div className="flex-between gap-2">
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Bid (ETH)" 
                        value={pledgeAmount[m.id] || ''}
                        onChange={e => setPledgeAmount({...pledgeAmount, [m.id]: e.target.value})}
                      />
                      <button 
                        className="btn btn-success" 
                        onClick={() => handlePledge(m.id, m.maxBudget)}
                        disabled={pledgeLoading}
                      >
                        Pledge
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalFeed;
