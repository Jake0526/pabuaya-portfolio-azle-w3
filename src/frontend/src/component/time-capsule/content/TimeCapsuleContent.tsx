import { AuthClient } from '@dfinity/auth-client';
import { createActor, canisterId } from '../../../../../declarations/candidBackend';
import React, { useEffect, useState } from 'react';
import { Principal } from '@dfinity/principal';

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
  const [capsuleId, setCapsuleId] = useState<bigint | null>(null);
  const [viewCapsuleId, setViewCapsuleId] = useState('');
  const [capsule, setCapsule] = useState<any | null>(null);
  const [publicCapsules, setPublicCapsules] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    async function fetchPublicCapsules() {
      if (!actor) return;
      try {
        const capsules = await actor.getPublicCapsules();
        setPublicCapsules(capsules);
      } catch (err) {
        console.error('Error fetching public capsules:', err);
        setError('Failed to fetch public capsules');
      }
    }
    fetchPublicCapsules();
  }, [actor]);

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
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed');
    }
  };

  const createCapsule = async () => {
    if (!actor || !isAuthenticated) {
      setError('Please log in first!');
      return;
    }

    if (!contents || !unlockDate) {
      setError('Please provide contents and unlock date');
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

      const id = await actor.createCapsule(contentItems, String(unlockTimeMs), recipientPrincipals, false);
      setCapsuleId(id);
      setError(null);
      setContents('');
      setUnlockDate('');
      setRecipients('');
      alert(`Capsule created with ID: ${id}`);
    } catch (err) {
      console.error('Error creating capsule:', err);
      setError('Failed to create capsule: ' + (err instanceof Error ? err.message : String(err)));
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
      if (capsule === null) {
        setError('Capsule not found or access denied');
        setCapsule(null);
      } else {
        console.log('capsule: ', capsule);
        if (capsule.id == BigInt(0)) {
          setError('Capsule not found or access denied');
          setCapsule(null);
        } else {
          setCapsule(capsule);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Error fetching capsule:', err);
      setError('Failed to fetch capsule: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

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

      <div className="content-wrapper" style={{ minHeight: '500px' }}>
        <div className="content-header" style={{ paddingTop: '50px' }}>
          <div className="container">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1>Time Capsule</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item">
                    <a href="/">Home</a>
                  </li>
                  <li className="breadcrumb-item active">Project</li>
                  <li className="breadcrumb-item active">Time Capsule</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <section className="content">
          <div className="container-fluid">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            <div className="row">
              <div className="col-md-12">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Create Time Capsule</h3>
                    <div className="card-tools">
                      <button type="button" className="btn btn-tool" data-card-widget="collapse">
                        <i className="fas fa-minus"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    {isAuthenticated ? (
                      <div>
                        <p>Logged in as: <strong>{principal}</strong></p>
                        <div className="form-group">
                          <label>Contents</label>
                          <textarea
                            className="form-control"
                            value={contents}
                            onChange={(e) => setContents(e.target.value)}
                            placeholder="Enter capsule contents"
                            style={{ width: '100%', height: '100px' }}
                          />
                        </div>
                        <div className="form-group">
                          <label>Unlock Date</label>
                          <input
                            type="datetime-local"
                            className="form-control"
                            value={unlockDate}
                            onChange={(e) => setUnlockDate(e.target.value)}
                            style={{ maxWidth: '300px' }}
                          />
                        </div>
                        <div className="form-group">
                          <label>Recipients (comma-separated Principals, optional)</label>
                          <input
                            type="text"
                            className="form-control"
                            value={recipients}
                            onChange={(e) => setRecipients(e.target.value)}
                            placeholder="e.g., xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
                            style={{ maxWidth: '500px' }}
                          />
                        </div>
                        <button className="btn btn-primary" onClick={createCapsule}>
                          Create Capsule
                        </button>
                        {capsuleId !== null && (
                          <p className="mt-3">
                            Capsule created with ID: <strong>{capsuleId.toString()}</strong>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p>Please log in to create a time capsule.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-12">
                <div className="card">
                  <div className="card-header">
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
                            className="form-control"
                            value={viewCapsuleId}
                            onChange={(e) => setViewCapsuleId(e.target.value)}
                            placeholder="Enter capsule ID"
                            style={{ maxWidth: '300px' }}
                          />
                        </div>
                        <button className="btn btn-primary" onClick={viewCapsule}>
                          View Capsule
                        </button>
                        {capsule && (
                          <div className="mt-3">
                            <h4>Capsule Details</h4>
                            <p><strong>ID:</strong> {capsule.id.toString()}</p>
                            <p><strong>Owner:</strong> {capsule.owner.toText()}</p>
                            <p><strong>Contents:</strong> {JSON.stringify(capsule.contents)}</p>
                            <p><strong>Unlock Time:</strong> {new Date(Number(capsule.unlockTime) / 1_000_000).toLocaleString()}</p>
                            <p><strong>Recipients:</strong> {capsule.recipients.map((r: any) => r.toText()).join(', ')}</p>
                            <p><strong>Public:</strong> {capsule.isPublic ? 'Yes' : 'No'}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>Please log in to view capsules.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-12">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Public Capsules</h3>
                    <div className="card-tools">
                      <button type="button" className="btn btn-tool" data-card-widget="collapse">
                        <i className="fas fa-minus"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    {publicCapsules.length > 0 ? (
                      <ul className="list-group">
                        {publicCapsules.map((capsule) => (
                          <li key={capsule.id.toString()} className="list-group-item">
                            <p><strong>ID:</strong> {capsule.id.toString()}</p>
                            <p><strong>Contents:</strong> {JSON.stringify(capsule.contents)}</p>
                            <p><strong>Unlock Time:</strong> {new Date(Number(capsule.unlockTime) / 1_000_000).toLocaleString()}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No public capsules available.</p>
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