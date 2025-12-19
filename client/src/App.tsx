import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './lib/store';

// Components
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import ItemFormPage from './pages/ItemFormPage';
import ItemQRPage from './pages/ItemQRPage';
import DriversPage from './pages/DriversPage';
import DriverFormPage from './pages/DriverFormPage';
import DriverHistoryPage from './pages/DriverHistoryPage';
import IssuePPEPage from './pages/IssuePPEPage';
import ReturnPPEPage from './pages/ReturnPPEPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import UserFormPage from './pages/UserFormPage';
import OrdersPage from './pages/OrdersPage';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10B981',
            },
          },
          error: {
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/new" element={<ItemFormPage />} />
          <Route path="inventory/:id" element={<ItemFormPage />} />
          <Route path="inventory/:id/qr" element={<ItemQRPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="drivers/new" element={<DriverFormPage />} />
          <Route path="drivers/:id" element={<DriverFormPage />} />
          <Route path="drivers/:id/history" element={<DriverHistoryPage />} />
          <Route path="issue" element={<IssuePPEPage />} />
          <Route path="return" element={<ReturnPPEPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/new" element={<UserFormPage />} />
          <Route path="users/:id/edit" element={<UserFormPage />} />
          <Route path="orders" element={<OrdersPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
