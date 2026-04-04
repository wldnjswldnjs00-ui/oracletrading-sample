import { lazy, Suspense } from 'react';
import { Router, Route, Switch } from 'wouter';

const Home = lazy(() => import('./pages/Home'));
const CompoundCalculator = lazy(() => import('./pages/CompoundCalculator'));
const KellyCalculator = lazy(() => import('./pages/KellyCalculator'));
const MartingaleSimulator = lazy(() => import('./pages/MartingaleSimulator'));
const VIPStrategy = lazy(() => import('./pages/VIPStrategy'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

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
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
              <p>Page not found</p>
            </div>
          </Route>
        </Switch>
      </Suspense>
    </Router>
  );
}
