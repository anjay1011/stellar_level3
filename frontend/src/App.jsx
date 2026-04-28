import { useState, useEffect } from 'react';
import { useWallet } from './hooks/useWallet';
import { CONTRACT_ID, RPC_URL } from './config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { 
  MessageSquare, 
  Search, 
  Users, 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Wallet,
  ExternalLink
} from 'lucide-react';
import './App.css';

const server = new StellarSdk.rpc.Server(RPC_URL);

function App() {
  const { address, isConnecting, connect, disconnect, signTransaction, error: walletError } = useWallet();
  const [feedback, setFeedback] = useState('');
  const [checkAddress, setCheckAddress] = useState('');
  const [searchedFeedback, setSearchedFeedback] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [uiError, setUiError] = useState(null);

  const [feedbackCache, setFeedbackCache] = useState({});

  useEffect(() => {
    if (walletError) setUiError(walletError.message);
  }, [walletError]);

  const fetchAllUsers = async () => {
    try {
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        { fee: '100', networkPassphrase: StellarSdk.Networks.TESTNET }
      )
        .addOperation(contract.call('get_all_users'))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
        setAllUsers(StellarSdk.scValToNative(sim.result.retval));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchAllUsers();
    const interval = setInterval(fetchAllUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address) { setUiError('Connect wallet first.'); return; }
    if (!feedback.trim()) { setUiError('Feedback cannot be empty.'); return; }

    setIsSubmitting(true);
    setTxStatus({ status: 'pending', title: 'Sending...', desc: 'Recording your feedback on-chain.' });
    
    try {
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const sourceAccount = await server.getAccount(address);
      
      let tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '10000',
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(contract.call(
          'submit_feedback',
          new StellarSdk.Address(address).toScVal(),
          StellarSdk.nativeToScVal(feedback, { type: 'string' })
        ))
        .setTimeout(60)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (!StellarSdk.rpc.Api.isSimulationSuccess(sim)) throw new Error("Simulation failed.");

      tx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
      const signedXdr = await signTransaction(tx.toXDR());
      const response = await server.sendTransaction(StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET));

      if (response.status !== 'ERROR') {
        setTxStatus({ status: 'success', title: 'Submitted!', desc: 'Feedback recorded successfully.', hash: response.hash });
        setFeedback('');
        setFeedbackCache(prev => ({ ...prev, [address]: feedback }));
        setTimeout(fetchAllUsers, 2000);
      } else {
        throw new Error("Transaction failed.");
      }
    } catch (err) {
      setUiError(err.message);
      setTxStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async (addr) => {
    const target = addr || checkAddress;
    if (!target) return;
    if (feedbackCache[target]) {
      setSearchedFeedback(feedbackCache[target]);
      return;
    }

    setIsSearching(true);
    setSearchedFeedback(null);
    try {
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        { fee: '100', networkPassphrase: StellarSdk.Networks.TESTNET }
      )
        .addOperation(contract.call('get_feedback', new StellarSdk.Address(target).toScVal()))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
        const result = StellarSdk.scValToNative(sim.result.retval);
        setSearchedFeedback(result);
        setFeedbackCache(prev => ({ ...prev, [target]: result }));
      }
    } catch (e) {
      setUiError("Could not find feedback.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <MessageSquare size={32} color="var(--primary)" />
          FeedbackChecker
        </div>
        <div>
          {address ? (
            <div className="wallet-badge">
              <div className="pulse" />
              <span>{address.slice(0, 4)}...{address.slice(-4)}</span>
              <button onClick={disconnect} className="btn-logout" title="Disconnect">&times;</button>
            </div>
          ) : (
            <button onClick={connect} disabled={isConnecting} className="btn btn-primary">
              <Wallet size={20} /> Connect
            </button>
          )}
        </div>
      </header>

      {uiError && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{uiError}</span>
          <button onClick={() => setUiError(null)}>&times;</button>
        </div>
      )}

      <main className="dashboard-grid">
        <div className="card">
          <h2 className="card-title">Create Feedback</h2>
          <p className="card-desc">Share your thoughts on the blockchain.</p>
          <form onSubmit={handleSubmit}>
            <textarea
              className="form-input"
              style={{ height: '120px', resize: 'none', marginBottom: '1.5rem' }}
              placeholder="What's on your mind?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isSubmitting}
            />
            <button className="btn btn-primary w-full" disabled={isSubmitting || !address}>
              {isSubmitting ? <Loader2 className="spinner" /> : <Send size={20} />}
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
          {txStatus && (
            <div className={`tx-status ${txStatus.status}`}>
              <div className="tx-icon-wrapper">
                {txStatus.status === 'pending' ? <Loader2 className="spinner" /> : <CheckCircle2 size={24} />}
              </div>
              <div className="tx-content">
                <div className="tx-title">{txStatus.title}</div>
                <div className="tx-desc">{txStatus.desc}</div>
                {txStatus.hash && (
                  <a href={`https://stellar.expert/explorer/testnet/tx/${txStatus.hash}`} target="_blank" className="tx-link">
                    <ExternalLink size={14} /> View Transaction
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Check Feedback</h2>
          <div className="form-input-container">
            <Search className="input-icon" size={20} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by Address"
              value={checkAddress}
              onChange={(e) => setCheckAddress(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary w-full" onClick={() => handleSearch()} disabled={isSearching} style={{ marginTop: '1rem' }}>
            {isSearching ? <Loader2 className="spinner" /> : 'Search Address'}
          </button>
          {searchedFeedback && (
            <div className="result-box">
              <div className="result-label">Result:</div>
              <div className="result-text">{searchedFeedback}</div>
            </div>
          )}
          <div className="recent-list">
            <h3 className="section-title"><Users size={18} /> Contributors</h3>
            {allUsers.length === 0 ? <p className="empty-text">No contributors yet.</p> : (
              <div className="user-grid">
                {allUsers.map(u => (
                  <div key={u} className="user-tag" onClick={() => { setCheckAddress(u); handleSearch(u); }}>
                    {u.slice(0, 4)}...{u.slice(-4)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
