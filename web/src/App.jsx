import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import api from "./api/client";
import VehicleSelectScreen from "./components/VehicleSelectScreen";
import Dashboard from "./components/Dashboard";
import LoginScreen from "./components/LoginScreen";
import BasicInfoPanel from "./components/BasicInfoPanel";
import MaintenancePanel from "./components/MaintenancePanel";
import FuelPanel from "./components/FuelPanel";
import ExpensesPanel from "./components/ExpensesPanel";
import OilPanel from "./components/OilPanel";
import FilterPanel from "./components/FilterPanel";
import OtherConsumablesPanel from "./components/OtherConsumablesPanel";
import LegalPanel from "./components/LegalPanel";
import TirePanel from "./components/TirePanel";
import DrivingAnalysisPanel from "./components/DrivingAnalysisPanel";
import CostManagementPanel from "./components/CostManagementPanel";
import SettingsPanel from "./components/SettingsPanel";

const BOTTOM_ROUTES = [
  { key: "home", label: "홈", icon: "home", path: "/" },
  { key: "driving", label: "주행 분석", icon: "speed", path: "/driving" },
  { key: "costs", label: "비용 관리", icon: "receipt_long", path: "/costs" },
  { key: "settings", label: "설정", icon: "settings", path: "/settings" },
];
const mapLegalSummary = (data) => {
  if (!data) return { insurance: null, inspection: null, tax: null };
  return {
    insurance: data.insurance ?? null,
    inspection: data.inspection ?? null,
    tax: data.tax ?? null,
  };
};

export default function App() {
  const navigate = useNavigate();

  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [legalSummary, setLegalSummary] = useState(mapLegalSummary(null));
  const [costRefreshKey, setCostRefreshKey] = useState(0);

  const triggerCostRefresh = useCallback(() => {
    setCostRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      setAuthReady(true);
      return;
    }
    const storedToken = localStorage.getItem("access_token");
    const storedUserId = localStorage.getItem("user_id");
    const storedUsername = localStorage.getItem("username") || "";
    setToken(storedToken);
    setUserId(storedUserId ? Number(storedUserId) : null);
    setUsername(storedUsername);
    setAuthReady(true);
  }, []);

  const loadLegalSummary = useCallback(
    async (vehicleId) => {
      if (!token || !vehicleId) {
        setLegalSummary(mapLegalSummary(null));
        return;
      }
      try {
        const res = await api.get("/legal/summary", { params: { vehicleId } });
        setLegalSummary(mapLegalSummary(res.data));
      } catch (error) {
        console.error("법적 일정을 불러오지 못했습니다.", error);
        setLegalSummary(mapLegalSummary(null));
      }
    },
    [token],
  );

  const fetchVehicles = useCallback(
    async (targetVehicleId) => {
      try {
        const response = await api.get("/vehicles/list");
        const list = Array.isArray(response.data) ? response.data : [];
        setVehicles(list);

        setSelectedVehicle((prev) => {
          if (targetVehicleId) {
            const updated = list.find((item) => item.id === targetVehicleId);
            if (updated) {
              return updated;
            }
          }

          if (prev) {
            const updatedPrev = list.find((item) => item.id === prev.id);
            if (updatedPrev) {
              return updatedPrev;
            }
          }

          return null;
        });

        return list;
      } catch (error) {
        console.error("차량 목록을 불러오지 못했습니다.", error);
        throw error;
      }
    },
    [],
  );

  const refreshVehicle = useCallback(
    async (vehicleId) => {
      const targetId = vehicleId ?? selectedVehicle?.id;
      try {
        await fetchVehicles(targetId);
        if (targetId) {
          loadLegalSummary(targetId);
        } else {
          setLegalSummary(mapLegalSummary(null));
        }
      } catch (_) {
        // 이미 콘솔에 기록됨
      }
    },
    [fetchVehicles, selectedVehicle?.id, loadLegalSummary],
  );

  const handleLoginSuccess = (t, u, id) => {
    setToken(t);
    setUsername(u);
    setUserId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", t);
      localStorage.setItem("user_id", String(id));
      localStorage.setItem("username", u ?? "");
    }
    navigate("/");
    fetchVehicles().catch(() => {});
  };

  const handleLogout = () => {
    setToken(null);
    setUsername("");
    setUserId(null);
    setSelectedVehicle(null);
    setVehicles([]);
    setLegalSummary(mapLegalSummary(null));
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
    }
    navigate("/");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (token) {
      localStorage.setItem("access_token", token);
    } else {
      localStorage.removeItem("access_token");
    }
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userId != null) {
      localStorage.setItem("user_id", String(userId));
    } else {
      localStorage.removeItem("user_id");
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (username) {
      localStorage.setItem("username", username);
    } else {
      localStorage.removeItem("username");
    }
  }, [username]);

  useEffect(() => {
    if (!token) return;
    fetchVehicles().catch(() => {});
  }, [token, fetchVehicles]);

  useEffect(() => {
    loadLegalSummary(selectedVehicle?.id || null);
  }, [loadLegalSummary, selectedVehicle?.id]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light text-text-light">
        <span className="text-sm text-subtext-light">세션을 확인하는 중...</span>
      </div>
    );
  }

  if (!token) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AppShell
      vehicles={vehicles}
      selectedVehicle={selectedVehicle}
      setSelectedVehicle={setSelectedVehicle}
      fetchVehicles={fetchVehicles}
      refreshVehicle={refreshVehicle}
      userId={userId}
      legalSummary={legalSummary}
      onLogout={handleLogout}
      costRefreshKey={costRefreshKey}
      onCostRefresh={triggerCostRefresh}
    />
  );
}

function AppShell({ selectedVehicle, setSelectedVehicle, vehicles, fetchVehicles, refreshVehicle, userId, legalSummary, onLogout, costRefreshKey, onCostRefresh }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const showBackButton = selectedVehicle && !isDashboard;

  useEffect(() => {
    if (!selectedVehicle && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  }, [selectedVehicle, location.pathname, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background-light text-text-light">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border-light bg-background-light/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <button
              type="button"
              aria-label="뒤로가기"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-surface-light text-primary shadow-sm transition hover:bg-primary/10"
              onClick={() => navigate(-1)}
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          ) : null}
          {selectedVehicle ? (
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary/20"
              onClick={() => {
                setSelectedVehicle(null);
                navigate("/");
              }}
            >
              <span className="material-symbols-outlined text-base">directions_car</span>
              <span>차량 변경</span>
            </button>
          ) : (
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary/90"
              onClick={() => fetchVehicles().catch(() => {})}
            >
              <span className="material-symbols-outlined text-base text-white">refresh</span>
              <span>새로고침</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-full border border-border-light px-3 text-xs font-semibold text-subtext-light transition hover:text-primary"
            onClick={onLogout}
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>로그아웃</span>
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-x-hidden pb-32">
        {!selectedVehicle ? (
          <div className="h-full px-4 py-6">
            <VehicleSelectScreen
              vehicles={vehicles}
              onSelect={(v) => {
                setSelectedVehicle(v);
                refreshVehicle(v.id);
                navigate("/");
              }}
              onCreated={() => fetchVehicles().catch(() => {})}
              userId={userId}
            />
          </div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  vehicle={selectedVehicle}
                  onVehicleRefresh={refreshVehicle}
                  legalSummary={legalSummary}
                  costRefreshKey={costRefreshKey}
                />
              }
            />
            <Route
              path="/basic"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <BasicInfoPanel vehicle={selectedVehicle} onRefresh={refreshVehicle} />
                </PanelGuard>
              }
            />
            <Route
              path="/maintenance"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <MaintenancePanel vehicle={selectedVehicle} />
                </PanelGuard>
              }
            />
            <Route
              path="/fuel"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <FuelPanel vehicle={selectedVehicle} onCostDataChanged={onCostRefresh} />
                </PanelGuard>
              }
            />
            <Route
              path="/driving"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <DrivingAnalysisPanel vehicle={selectedVehicle} hideLocalBack />
                </PanelGuard>
              }
            />
            <Route
              path="/costs"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <CostManagementPanel vehicle={selectedVehicle} />
                </PanelGuard>
              }
            />
            <Route
              path="/expenses"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <ExpensesPanel vehicle={selectedVehicle} />
                </PanelGuard>
              }
            />
            <Route
              path="/oil"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <OilPanel
                    vehicleId={selectedVehicle.id}
                    currentMileage={selectedVehicle.odo_km}
                    apiClient={api}
                    userId={userId}
                    hideLocalBack
                  />
                </PanelGuard>
              }
            />
            <Route
              path="/filter"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <FilterPanel
                    vehicleId={selectedVehicle.id}
                    currentMileage={selectedVehicle.odo_km}
                    apiClient={api}
                    userId={userId}
                    hideLocalBack
                  />
                </PanelGuard>
              }
            />
            <Route
              path="/other"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <OtherConsumablesPanel
                    vehicleId={selectedVehicle.id}
                    currentMileage={selectedVehicle.odo_km}
                    apiClient={api}
                    userId={userId}
                    hideLocalBack
                  />
                </PanelGuard>
              }
            />
            <Route
              path="/legal"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <LegalPanel vehicle={selectedVehicle} />
                </PanelGuard>
              }
            />
            <Route
              path="/tire"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <TirePanel />
                </PanelGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <SettingsPanel userId={userId} vehicle={selectedVehicle} />
                </PanelGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </main>
      {selectedVehicle && <BottomNavigation currentPath={location.pathname} navigateTo={navigate} />}
    </div>
  );
}

function BottomNavigation({ currentPath, navigateTo }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-20 items-center justify-between px-12 border-t border-border-light bg-surface-light/95 backdrop-blur">
      {BOTTOM_ROUTES.map((item) => {
        const isActive = currentPath === item.path || (item.path !== "/" && currentPath.startsWith(item.path));
        const baseColor = isActive ? "text-primary" : "text-subtext-light";
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigateTo(item.path)}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition ${baseColor}`}
          >
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function PanelGuard({ vehicle, children }) {
  if (!vehicle) return <Navigate to="/" />;
  return children;
}


