import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const Registration = () => {
  const { account, contract, fetchUserProfile, loading, customAddress, updateContractAddress } = useWeb3();
  const [name, setName] = useState('');
  const [role, setRole] = useState(2); // Default to Donor (Role.Donor = 2 in Solidity ENUM: None=0, UN_Arbiter=1, Donor=2, Relief_Agency=3)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editAddress, setEditAddress] = useState(customAddress);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Name is required");

    try {
      setIsSubmitting(true);
      const tx = await contract.registerUser(name, role);
      await tx.wait(); // Wait for confirmation
      await fetchUserProfile(account);
    } catch (err) {
      console.error(err);
      alert("Registration failed. See console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAddress = () => {
    updateContractAddress(editAddress);
  }

  if (loading) return <div className="container"><p>Loading Web3...</p></div>;

  return (
    <div className="container" style={{ maxWidth: '600px', marginTop: '10vh' }}>
      <div className="glass-panel text-center">
        <h2 style={{fontSize: '28px', marginBottom: '20px', background: 'linear-gradient(90deg, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
          Join the Humanitarian Escrow Network
        </h2>
        <p>Register your account to participate as a Donor or Relief Agency.</p>
        
        <div style={{marginTop: '20px', marginBottom: '30px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
          <p style={{fontSize: '13px', margin: '0 0 10px 0'}}>Contract Address</p>
          <div className="flex-between">
             <input type="text" className="form-control" value={editAddress} onChange={e => setEditAddress(e.target.value)} style={{marginRight: '10px'}}/>
             <button className="btn btn-primary" onClick={handleUpdateAddress}>Update</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label>Connected Wallet</label>
            <input type="text" className="form-control" value={account || "Not Connected"} disabled />
          </div>
          
          <div className="form-group">
            <label>Organization / User Name</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Red Cross, John Doe" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Select Role</label>
            <select className="form-control" value={role} onChange={(e) => setRole(Number(e.target.value))}>
              <option value={2}>Donor</option>
              <option value={3}>Relief Agency</option>
            </select>
          </div>

          <div className="mt-4">
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isSubmitting || !account}>
              {isSubmitting ? "Registering on Blockchain..." : "Complete Registration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Registration;
