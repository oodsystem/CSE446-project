import React from 'react';
import { Web3Provider, useWeb3 } from './context/Web3Context';
import Registration from './components/Registration';
import Dashboard from './components/Dashboard';

const AppContent = () => {
  const { account, userProfile, loading, connectWallet, networkError } = useWeb3();

  if (loading) {
    return (
      <div className="container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>
        <div className="glass-panel">Initializing Escrow Network...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container" style={{display:'flex', flexDirection:'column', alignItems:'center', marginTop: '20vh'}}>
        <div className="glass-panel" style={{maxWidth: '500px', textAlign: 'center'}}>
          <h1 style={{fontSize: '32px', marginBottom: '16px', background: 'linear-gradient(90deg, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
            Humanitarian Escrow
          </h1>
          <p>Connect your Web3 wallet to securely fund or deliver humanitarian relief worldwide.</p>
          {networkError && (
            <p style={{ color: "var(--danger)", marginTop: "12px" }}>{networkError}</p>
          )}
          <button className="btn btn-primary mt-4" onClick={connectWallet} style={{padding: '12px 24px', fontSize: '16px'}}>
            Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="container" style={{display:'flex', flexDirection:'column', alignItems:'center', marginTop: '20vh'}}>
        <div className="glass-panel" style={{maxWidth: '560px', textAlign: 'center'}}>
          <h1 style={{fontSize: '32px', marginBottom: '16px'}}>Wrong Network</h1>
          <p>{networkError}</p>
          <p style={{fontSize: '14px', opacity: 0.8}}>RPC URL: http://127.0.0.1:7545</p>
        </div>
      </div>
    );
  }

  // Check if registered
  if (userProfile && !userProfile.isRegistered) {
    return <Registration />;
  }

  if (userProfile && userProfile.isRegistered) {
    return <Dashboard />;
  }

  return <Registration />;
};

function App() {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
}

export default App;
