import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './i18n';
import RequireAuth from './components/RequireAuth';
import RequireRole from './components/RequireRole';
import AppShell from './components/AppShell';
import Auth from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Farm from './pages/Farm';
import Farms from './pages/Farms';
import Seasonal from './pages/Seasonal';
import Debts from './pages/Debts';
import SupplyChain from './pages/SupplyChain';
import Sales from './pages/Sales';
import Stock from './pages/Stock';
import Wallet from './pages/Wallet';
import Transactions from './pages/Transactions';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Unauthorized from './pages/Unauthorized';
import Marketplace from './pages/Marketplace';
import MarketplaceListingDetail from './pages/MarketplaceListingDetail';
import MarketplaceCheckout from './pages/MarketplaceCheckout';
import Purchases from './pages/Purchases';
import GlobalSearch from './pages/GlobalSearch';
import Insights from './pages/Insights';
import DailyFarmLog from './pages/DailyFarmLog';
import Upgrade from './pages/Upgrade';
import WeatherPlanning from './pages/WeatherPlanning';

const App = () => {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route element={<RequireAuth />}>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/search" element={<GlobalSearch />} />
          <Route path="/insights" element={<Insights />} />
          <Route element={<RequireRole allowed={['farmer', 'trader']} />}>
            <Route path="/upgrade" element={<Upgrade />} />
          </Route>
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/debts" element={<Debts />} />

          <Route element={<RequireRole allowed={['farmer', 'trader']} />}>
            <Route path="/daily-log" element={<DailyFarmLog />} />
          </Route>

          <Route element={<RequireRole allowed={['farmer']} />}>
            <Route path="/farm" element={<Farm />} />
            <Route path="/farms" element={<Farms />} />
            <Route path="/seasonal" element={<Seasonal />} />
            <Route path="/weather" element={<WeatherPlanning />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/supply" element={<SupplyChain />} />
          </Route>

          <Route element={<RequireRole allowed={['trader']} />}>
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/checkout/:harvestId" element={<MarketplaceCheckout />} />
            <Route path="/marketplace/listing/:harvestId" element={<MarketplaceListingDetail />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/orders" element={<SupplyChain />} />
            <Route path="/payments" element={<Transactions />} />
          </Route>
        </Route>
      </Route>
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/procurement" element={<Navigate to="/farm" replace />} />
      <Route path="/report" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
