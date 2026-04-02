import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TcpModule } from './modules/TcpModule';
import { RoutingModule } from './modules/RoutingModule';
import { VpnModule } from './modules/VpnModule';
import { CryptoModule } from './modules/CryptoModule';
import { AttacksModule } from './modules/AttacksModule';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/tcp" replace />} />
          <Route path="tcp" element={<TcpModule />} />
          <Route path="routing" element={<RoutingModule />} />
          <Route path="vpn" element={<VpnModule />} />
          <Route path="crypto" element={<CryptoModule />} />
          <Route path="attacks" element={<AttacksModule />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
