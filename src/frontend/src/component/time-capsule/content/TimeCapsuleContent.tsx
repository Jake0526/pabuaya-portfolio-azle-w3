import { AuthClient } from '@dfinity/auth-client';
import { createActor, canisterId } from '../../../../../declarations/candidBackend';
import { canisterId as icrcCanisterId } from '../../../../../declarations/icrc';
import React, { useEffect, useState } from 'react';
import { Principal } from '@dfinity/principal';
import Swal from 'sweetalert2';

import 'animate.css';

const network = process.env.DFX_NETWORK || 'local';
const host = network === 'ic' ? 'https://icp-api.io' : 'http://localhost:4943';
const identityProvider =
  network === 'ic'
    ? 'https://identity.ic0.app'
    : `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`;

const TimeCapsuleContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [actor, setActor] = useState<ReturnType<typeof createActor> | null>(null);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [contents, setContents] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [recipients, setRecipients] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [capsuleId, setCapsuleId] = useState<bigint | null>(null);
  const [viewCapsuleId, setViewCapsuleId] = useState('');
  const [capsule, setCapsule] = useState<any | null>(null);
  const [publicCapsules, setPublicCapsules] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [transferTokenId, setTransferTokenId] = useState('');
  const [transferToPrincipal, setTransferToPrincipal] = useState('');
  const [capsulePrice, setCapsulePrice] = useState<bigint | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function init() {
      try {
        const client = await AuthClient.create();
        setAuthClient(client);

        const isAuth = await client.isAuthenticated();
        if (isAuth) {
          const identity = client.getIdentity();
          const principal = identity.getPrincipal().toText();
          const newActor = createActor(canisterId, {
            agentOptions: { identity, host },
          });

          setIsAuthenticated(true);
          setPrincipal(principal);
          setActor(newActor);
        }
      } catch (err) {
        console.error('Initialization failed:', err);
        setError('Failed to initialize');
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!actor) {
        console.log('Actor not initialized');
        return;
      }
      try {
        // Fetch public capsules
        const capsules = await actor.getPublicCapsules();
        setPublicCapsules(capsules);
  
        // Fetch capsule price
        const price = await actor.getCapsulePrice();
        setCapsulePrice(price);
  
        if (isAuthenticated && principal) {
          console.log('Fetching data for principal:', principal);
  
          // Fetch tokens
          const myTokens = await actor.getMyTokens();
          setTokens(myTokens);
  
          // Validate principal
          if (!principal || principal.trim() === '') {
            throw new Error('Principal is undefined or empty');
          }
  
          // Fetch token balance
          try {
            const account = {
              owner: Principal.fromText(principal),
              subaccount: [], // Explicit empty optional for subaccount
            };

            console.log('Calling icrc1_balance_of with account:', account);
            const balance = await actor.icrc1_balance_of({
              owner: Principal.fromText(principal),
              subaccount: [],
            }, icrcCanisterId);
            console.log('Balance received:', balance);
            setTokenBalance(balance);
          } catch (balanceErr) {
            console.error('Error fetching balance:', balanceErr);
            setError(`Failed to fetch token balance: ${balanceErr}`);
          }
  
          // Fetch purchases
          const userPurchases = await actor.getUserPurchases(Principal.fromText(principal));
          setPurchases(userPurchases);
        } else {
          console.log('Not authenticated or principal not set');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to fetch data: ${err}`);
      }
    }
    fetchData();
  }, [actor, isAuthenticated, principal]);

  const handleLogin = async () => {
    if (!authClient) {
      setError('Auth client not initialized');
      return;
    }
    try {
      await authClient.login({
        identityProvider,
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal().toText();
          const newActor = createActor(canisterId, {
            agentOptions: { identity, host },
          });

          setIsAuthenticated(true);
          setPrincipal(principal);
          setActor(newActor);
          setError(null);
        },
        onError: (err) => {
          console.error('Login failed:', err);
          setError('Login failed');
        },
      });
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed');
    }
  };

  const handleLogout = async () => {
    if (!authClient) return;
    try {
      await authClient.logout();
      setIsAuthenticated(false);
      setPrincipal(null);
      setActor(null);
      setTokenBalance(null);
      setCapsulePrice(null);
      setPurchases([]);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed');
    }
  };

  const purchaseCapsule = async () => {
    if (!actor || !isAuthenticated) {
      setError('Please log in first!');
      return;
    }
    if (!contents || !unlockDate) {
      setError('Please provide contents and unlock date');
      return;
    }
    if (tokenBalance !== null && tokenBalance < capsulePrice!) {
      setError('Insufficient token balance');
      return;
    }
    try {
      const unlockTimeMs = new Date(unlockDate).getTime();
      const now = Date.now();
      if (isNaN(unlockTimeMs) || unlockTimeMs <= now) {
        setError('Unlock date must be in the future');
        return;
      }
      const contentItems = JSON.stringify([{ key: 'message', value: contents }]);
      const recipientPrincipals = recipients
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p)
        .map((p) => {
          try {
            return Principal.fromText(p);
          } catch {
            throw new Error(`Invalid Principal: ${p}`);
          }
        });
      const id = await actor.purchaseCapsule(contentItems, String(unlockTimeMs), recipientPrincipals, isPublic, canisterId, icrcCanisterId);
      setCapsuleId(id);
      setError(null);
      setContents('');
      setUnlockDate('');
      setRecipients('');
      setIsPublic(false);

      // Update balances
      if (principal) {
        const newBalance = await actor.icrc1_balance_of({
          owner: Principal.fromText(principal),
          subaccount: [],
        }, icrcCanisterId);
        setTokenBalance(newBalance);
      }

      var Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      });

      Toast.fire({
        icon: 'success',
        title: `Capsule purchased for ${capsulePrice} tokens!`,
      });
    } catch (err) {
      console.error('Error purchasing capsule:', err);
      setError('Failed to purchase capsule: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const viewCapsule = async () => {
    if (!actor || !isAuthenticated) {
      setError('Please log in first!');
      return;
    }
    if (!viewCapsuleId) {
      setError('Please enter a capsule ID');
      return;
    }
    try {
      const capsule = await actor.getCapsule(BigInt(viewCapsuleId));
      if (capsule === null || capsule.id == BigInt(0)) {
        setError('Capsule not found or access denied');
        setCapsule(null);
      } else {
        setCapsule(capsule);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching capsule:', err);
      setError('Failed to fetch capsule: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const transferToken = async () => {
    if (!actor || !isAuthenticated) {
      setError('Please log in first!');
      return;
    }
    if (!transferTokenId || !transferToPrincipal) {
      setError('Please enter token ID and recipient Principal');
      return;
    }
    try {
      const principal = Principal.fromText(transferToPrincipal);
      const success = await actor.transferHeritageToken(BigInt(transferTokenId), principal);
      if (success) {
        setTokens(tokens.filter((t) => t.tokenId.toString() !== transferTokenId));
        setTransferTokenId('');
        setTransferToPrincipal('');
        setError(null);

        var Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });

        Toast.fire({
          icon: 'success',
          title: 'Token transferred successfully!',
        });
      } else {
        setError('Transfer failed: You may not own this token');
      }
    } catch (err) {
      console.error('Error transferring token:', err);
      setError('Failed to transfer token: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const getDisplayedCapsules = () => {
    let filteredCapsules = publicCapsules;
    if (searchQuery) {
      filteredCapsules = publicCapsules.filter((capsule) =>
        capsule.contents.some((c: any) =>
          c.value.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    filteredCapsules = [...filteredCapsules].sort((a, b) => {
      const timeA = Number(a.unlockTime) / 1_000_000;
      const timeB = Number(b.unlockTime) / 1_000_000;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCapsules.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(
    (searchQuery
      ? publicCapsules.filter((capsule) =>
          capsule.contents.some((c: any) =>
            c.value.toLowerCase().includes(searchQuery.toLowerCase())
          )
        ).length
      : publicCapsules.length) / itemsPerPage
  );

  return (
    <>
      <nav className="main-header navbar navbar-expand-md navbar-light navbar-white border-bottom-0">
        <div className="container">
          <a href="#" className="navbar-brand" style={{ color: '#ffffff', fontSize: '30px' }}>
            <span className="brand-image" style={{ marginTop: '5px', marginLeft: '15px' }}>
              <b>AJP</b>
            </span>
            <span className="brand-text font-weight-light">Dev</span>
          </a>
          <button
            className="navbar-toggler order-1"
            type="button"
            data-toggle="collapse"
            data-target="#navbarCollapse"
            aria-controls="navbarCollapse"
            aria-expanded="false"
            aria-label="Toggle navigation"
            style={{ color: '#ffffff', borderColor: '#ffffff' }}
          >
            <span className="fa fa-bars"></span>
          </button>
          <div className="collapse navbar-collapse order-3" id="navbarCollapse" style={{ color: '#ffffff', fontSize: '20px' }}>
            <ul className="navbar-nav ml-auto">
              <li className="nav-item">
                <a href="/" className="nav-link" style={{ color: '#ffffff' }}>
                  Home
                </a>
              </li>
              <li className="nav-item">
                <a href="/?pageto=about-me" className="nav-link" style={{ color: '#ffffff' }}>
                  About
                </a>
              </li>
              <li className="nav-item">
                <a href="/?pageto=work-section" className="nav-link" style={{ color: '#ffffff' }}>
                  Works
                </a>
              </li>
              <li className="nav-item">
                <a href="#" className="nav-link" style={{ color: '#ffffff' }}>
                  Time Capsule
                </a>
              </li>
              <li className="nav-item">
                {!isAuthenticated ? (
                  <button
                    className="nav-link btn btn-primary rounded-pill"
                    style={{ color: '#ffffff' }}
                    onClick={handleLogin}
                  >
                    Log in with Internet Identity
                  </button>
                ) : (
                  <button
                    className="nav-link btn btn-primary rounded-pill"
                    style={{ color: '#ffffff' }}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                )}
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="content-wrapper capsule-bg">
        <div className="content-header">
          <div className="container">
            <div className="row mb-2">
              <div className="col-sm-12 text-center">
                <h1 className="capsule-title animate__animated animate__fadeIn" style={{ paddingTop: '20px' }}>
                  Time Capsule
                </h1>
              </div>
            </div>
          </div>
        </div>

        <section className="content">
          <div className="container">
            {error && (
              <div className="alert alert-danger animate__animated animate__shakeX">{error}</div>
            )}
            <div className="row justify-content-center">
              <div className="col-lg-8 col-md-10">
                <div className="card capsule-card animate__animated animate__zoomIn">
                  <div className="card-header bg-dark text-white rounded-top">
                    <h3 className="card-title">Purchase Time Capsule</h3>
                    <div className="card-tools">
                      <button type="button" className="btn btn-tool text-white" data-card-widget="collapse">
                        <i className="fas fa-minus"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body parchment-bg">
                    {isAuthenticated ? (
                      <div>
                        <p className="text-muted">
                          Logged in as: <strong>{principal}</strong>
                        </p>
                        <p>
                          <strong>AJP Balance:</strong>{' '}
                          {tokenBalance !== null ? tokenBalance.toString() : 'Loading...'} AJP
                        </p>
                        <p>
                          <strong>Capsule Price:</strong>{' '}
                          {capsulePrice !== null ? capsulePrice.toString() : 'Loading...'} AJP
                        </p>
                        <div className="form-group">
                          <label>Message to Seal</label>
                          <textarea
                            className="form-control capsule-input"
                            value={contents}
                            onChange={(e) => setContents(e.target.value)}
                            placeholder="Write your legacy..."
                          />
                        </div>
                        <div className="form-group">
                          <label>Unlock Date</label>
                          <input
                            type="datetime-local"
                            className="form-control capsule-input"
                            value={unlockDate}
                            onChange={(e) => setUnlockDate(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Recipients (optional, comma-separated Principals)</label>
                          <input
                            type="text"
                            className="form-control capsule-input"
                            value={recipients}
                            onChange={(e) => setRecipients(e.target.value)}
                            placeholder="e.g., xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={isPublic}
                              onChange={(e) => setIsPublic(e.target.checked)}
                            /> Share with the World (public after unlock)
                          </label>
                        </div>
                        <button className="btn btn-primary capsule-btn" onClick={purchaseCapsule}>
                          Purchase Capsule
                        </button>
                        {capsuleId !== null && (
                          <p className="mt-3 text-success">
                            Capsule purchased with ID: <strong>{capsuleId.toString()}</strong>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-center">Log in to purchase a time capsule.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="card inviting-card animate__animated animate__fadeInLeft">
                  <div className="card-header bg-gradient-warning">
                    <h3 className="card-title">View Capsule</h3>
                    <div className="card-tools">
                      <button type="button" className="btn btn-tool" data-card-widget="collapse">
                        <i className="fas fa-minus"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    {isAuthenticated ? (
                      <div>
                        <div className="form-group">
                          <label>Capsule ID</label>
                          <input
                            type="text"
                            className="form-control inviting-input"
                            value={viewCapsuleId}
                            onChange={(e) => setViewCapsuleId(e.target.value)}
                            placeholder="Enter capsule ID"
                          />
                        </div>
                        <button className="btn btn-warning inviting-btn" onClick={viewCapsule}>
                          Open Capsule
                        </button>
                        {capsule && (
                          <div className="mt-3">
                            <h4>Capsule Details</h4>
                            <p><strong>ID:</strong> {capsule.id.toString()}</p>
                            <p><strong>Owner:</strong> {capsule.owner.toText()}</p>
                            <p>
                              <strong>Contents:</strong>{' '}
                              {capsule.contents.map((c: any, i: number) => (
                                <span key={i}>
                                  {c.key}: {c.value}
                                </span>
                              ))}
                            </p>
                            <p>
                              <strong>Unlock Time:</strong>{' '}
                              {new Date(Number(capsule.unlockTime) / 1_000_000).toLocaleString()}
                            </p>
                            <p>
                              <strong>Recipients:</strong>{' '}
                              {capsule.recipients.map((r: any) => r.toText()).join(', ') || 'None'}
                            </p>
                            <p><strong>Public:</strong> {capsule.isPublic ? 'Yes' : 'No'}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-center">Log in to view capsules.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card inviting-card animate__animated animate__fadeInRight">
                  <div className="card-header bg-gradient-warning">
                    <h3 className="card-title">My Capsules</h3>
                    <div className="card-tools">
                      <button type="button" className="btn btn-tool" data-card-widget="collapse">
                        <i className="fas fa-minus"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    {isAuthenticated ? (
                      <div>
                        {tokens.length > 0 ? (
                          <ul className="list-group">
                            {tokens.map((token) => (
                              <li key={token.tokenId.toString()} className="list-group-item">
                                <p><strong>Token ID:</strong> {token.tokenId.toString()}</p>
                                <p><strong>Capsule ID:</strong> {token.capsuleId.toString()}</p>
                                <p>
                                  <strong>Name:</strong>{' '}
                                  {token.metadata.find((m: any) => m.key === 'name')?.value}
                                </p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>No Capsule found.</p>
                        )}
                        <div className="form-group mt-3">
                          <label>Transfer Capsule</label>
                          <input
                            type="text"
                            className="form-control inviting-input"
                            value={transferTokenId}
                            onChange={(e) => setTransferTokenId(e.target.value)}
                            placeholder="Enter Capsule token ID"
                          />
                          <input
                            type="text"
                            className="form-control inviting-input mt-2"
                            value={transferToPrincipal}
                            onChange={(e) => setTransferToPrincipal(e.target.value)}
                            placeholder="Enter recipient Principal"
                          />
                          <button className="btn btn-warning inviting-btn mt-2" onClick={transferToken}>
                            Transfer Token
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center">Log in to view tokens.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-12">
                <div className="card inviting-card animate__animated animate__fadeInUp">
                  <div className="card-header bg-gradient-warning">
                    <h3 className="card-title">Purchase History</h3>
                    <div className="card-tools">
                      <button type="button" className="btn btn-tool" data-card-widget="collapse">
                        <i className="fas fa-minus"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    {isAuthenticated ? (
                      purchases.length > 0 ? (
                        <ul className="list-group">
                          {purchases.map((purchase) => (
                            <li key={purchase.purchaseId.toString()} className="list-group-item">
                              <p><strong>Purchase ID:</strong> {purchase.purchaseId.toString()}</p>
                              <p><strong>Amount:</strong> {purchase.amount.toString()} tokens</p>
                              <p>
                                <strong>Timestamp:</strong>{' '}
                                {new Date(Number(purchase.timestamp) / 1_000_000).toLocaleString()}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No purchases found.</p>
                      )
                    ) : (
                      <p className="text-center">Log in to view purchase history.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="card inviting-card animate__animated animate__fadeInUp">
                  <div className="card-header bg-gradient-warning">
                    <h3 className="card-title">Public Capsules</h3>
                    <div className="card-tools">
                      <button type="button" className="btn btn-tool" data-card-widget="collapse">
                        <i className="fas fa-minus"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="form-group mb-3">
                      <label>Search Capsules</label>
                      <input
                        type="text"
                        className="form-control inviting-input"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search by content..."
                      />
                    </div>
                    <div className="form-group mb-3">
                      <label>Sort By</label>
                      <select
                        className="form-control inviting-input"
                        value={sortOrder}
                        onChange={(e) => {
                          setSortOrder(e.target.value as 'newest' | 'oldest');
                          setCurrentPage(1);
                        }}
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                      </select>
                    </div>
                    {getDisplayedCapsules().length > 0 ? (
                      <div className="row">
                        {getDisplayedCapsules().map((capsule) => (
                          <div key={capsule.id.toString()} className="col-md-6 col-lg-4 mb-4">
                            <div className="card h-100 capsule-preview">
                              <div className="card-body">
                                <p><strong>ID:</strong> {capsule.id.toString()}</p>
                                <p>
                                  <strong>Contents:</strong>{' '}
                                  {capsule.contents.map((c: any, i: number) => (
                                    <span key={i}>
                                      {c.value.length > 50 ? `${c.value.substring(0, 50)}...` : c.value}
                                    </span>
                                  ))}
                                </p>
                                <p>
                                  <strong>Unlocked:</strong>{' '}
                                  {new Date(Number(capsule.unlockTime) / 1_000_000).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center">No public capsules match your criteria.</p>
                    )}
                    {totalPages > 1 && (
                      <div className="pagination-controls mt-3 text-center">
                        <button
                          className="btn btn-outline-warning mr-2"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(currentPage - 1)}
                        >
                          Previous
                        </button>
                        <span>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          className="btn btn-outline-warning ml-2"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(currentPage + 1)}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="main-footer footer-home">
        <div className="container">
          <div className="row">
            <div className="col-12 col-md-6">
              <strong>
                <i className="fas fa-book mr-1"></i> Alvin Jake Pabuaya
              </strong>
              <p>
                +639392478355 <br />
                pabuaya34@gmail.com
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default TimeCapsuleContent;