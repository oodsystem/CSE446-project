import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import GlobalFeed from './GlobalFeed';
import DonorPanel from './DonorPanel';
import AgencyPanel from './AgencyPanel';
import ArbiterPanel from './ArbiterPanel';

const Dashboard = () => {
  const { userProfile, account } = useWeb3();
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'my_dashboard'

  // Determine user role based on Enum: 1=UN_Arbiter, 2=Donor, 3=Relief_Agency
  const roleName = userProfile.role === 1 ? 'UN Arbiter' 
                 : userProfile.role === 2 ? 'Donor' 
                 : 'Relief Agency';

  return (
    <div className="container">
      <div className="header glass-panel mb-4" style={{display: 'flex', borderBottom: 'none'}}>
        <div>
          <h1 style={{margin:0}}>Humanitarian Escrow</h1>
          <p style={{margin:0}}>Connected: {account.substring(0,6)}...{account.substring(38)}</p>
        </div>
        <div style={{textAlign: 'right'}}>
          <h3 style={{margin:0, color:'var(--primary)'}}>{userProfile.name}</h3>
          <p style={{margin:0}}>Role: <strong>{roleName}</strong></p>
          {userProfile.role !== 1 && (
             <p style={{margin:0, fontSize: '12px'}}>Reputation: {userProfile.reputation}</p>
          )}
        </div>
      </div>

      <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
        <button 
          className={`btn ${activeTab === 'feed' ? 'btn-primary' : ''}`}
          style={activeTab !== 'feed' ? {background: 'rgba(255,255,255,0.1)'} : {}}
          onClick={() => setActiveTab('feed')}
        >
          Global Relief Missions
        </button>
        <button 
          className={`btn ${activeTab === 'my_dashboard' ? 'btn-primary' : ''}`}
          style={activeTab !== 'my_dashboard' ? {background: 'rgba(255,255,255,0.1)'} : {}}
          onClick={() => setActiveTab('my_dashboard')}
        >
          {userProfile.role === 1 ? "Disputes & Treasury" : "My Dashboard"}
        </button>
      </div>

      {activeTab === 'feed' && <GlobalFeed />}
      {activeTab === 'my_dashboard' && (
        <>
          {userProfile.role === 1 && <ArbiterPanel />}
          {userProfile.role === 2 && <DonorPanel />}
          {userProfile.role === 3 && <AgencyPanel />}
        </>
      )}

    </div>
  );
};

export default Dashboard;
