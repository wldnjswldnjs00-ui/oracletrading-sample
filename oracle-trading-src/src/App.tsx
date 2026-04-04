import { Router, Route, Switch } from 'wouter';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import CompoundCalculator from './pages/CompoundCalculator';
import KellyCalculator from './pages/KellyCalculator';
import MartingaleSimulator from './pages/MartingaleSimulator';
import VIPStrategy from './pages/VIPStrategy';

export default function App() {
  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/compound-calculator" component={CompoundCalculator} />
            <Route path="/kelly-calculator" component={KellyCalculator} />
            <Route path="/martingale-simulator" component={MartingaleSimulator} />
            <Route path="/vip-strategy" component={VIPStrategy} />
            <Route>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted-foreground)', fontSize: 18 }}>
                Page Not Found
              </div>
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
  );
}
