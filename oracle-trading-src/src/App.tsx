import { lazy, Suspense } from 'react';
import { Router, Route, Switch, useLocation } from 'wouter';

const Home = lazy(() => import('./pages/Home'));
const CompoundCalculator = lazy(() => import('./pages/CompoundCalculator'));
const KellyCalculator = lazy(() => import('./pages/KellyCalculator'));
const MartingaleSimulator = lazy(() => import('./pages/MartingaleSimulator'));
const VIPStrategy = lazy(() => import('./pages/VIPStrategy'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-6">
      <p className="text-muted-foreground" style={{ fontSize: 18 }}>Page not found</p>
      <button onClick={() => navigate('/')} style={{ padding: '10px 24px', borderRadius: 8, background: 'color-mix(in oklab, var(--primary) 20%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 40%, transparent)', color: 'var(--gold)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        ← Back to Home
      </button>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div style={{ width: 40, height: 40, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/compound-calculator" component={CompoundCalculator} />
          <Route path="/kelly-calculator" component={KellyCalculator} />
          <Route path="/martingale-simulator" component={MartingaleSimulator} />
          <Route path="/vip-strategy" component={VIPStrategy} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </Suspense>
    </Router>
  );
}
