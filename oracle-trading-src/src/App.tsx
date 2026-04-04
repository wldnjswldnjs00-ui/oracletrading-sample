import { Router, Route, Switch } from 'wouter';
import Home from './pages/Home';
import CompoundCalculator from './pages/CompoundCalculator';
import KellyCalculator from './pages/KellyCalculator';
import MartingaleSimulator from './pages/MartingaleSimulator';
import VIPStrategy from './pages/VIPStrategy';

export default function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/compound-calculator" component={CompoundCalculator} />
        <Route path="/kelly-calculator" component={KellyCalculator} />
        <Route path="/martingale-simulator" component={MartingaleSimulator} />
        <Route path="/vip-strategy" component={VIPStrategy} />
        <Route>
          <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
            <p>Page not found</p>
          </div>
        </Route>
      </Switch>
    </Router>
  );
}
