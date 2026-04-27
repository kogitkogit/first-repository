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
import TasksPanel from "./components/TasksPanel";
import InitialSetupGuide from "./components/InitialSetupGuide";
import { getBannerInset, isAdMobSupported, subscribeBannerInset } from "./services/admob";

const BOTTOM_ROUTES = [
  { key: "home", label: "홈", icon: "home", path: "/" },
  { key: "tasks", label: "할 일", icon: "checklist", path: "/tasks" },
  { key: "driving", label: "주행 분석", icon: "speed", path: "/driving" },
  { key: "costs", label: "비용 관리", icon: "receipt_long", path: "/costs" },
  { key: "settings", label: "설정", icon: "settings", path: "/settings" },
];
const BOTTOM_NAV_HEIGHT = 80;
const BANNER_GAP = 8;
const ROUTE_TITLES = {
  "/": "차량 대시보드",
  "/setup-guide": "초기 설정 가이드",
  "/tasks": "할 일 관리",
  "/basic": "차량 기본 정보",
  "/maintenance": "정비 이력",
  "/fuel": "주유/충전 관리",
  "/driving": "주행 분석",
  "/costs": "비용 관리",
  "/expenses": "비용 기록",
  "/oil": "오일 관리",
  "/filter": "필터 관리",
  "/other": "소모품 관리",
  "/legal": "법적 서류",
  "/tire": "타이어 관리",
  "/settings": "환경 설정",
};
const mapLegalSummary = (data) => {
  if (!data) return { insurance: null, inspection: null, tax: null };

  const insurance = data.insurance
    ? {
        ...data.insurance,
        expiry_date: data.insurance.expiry_date ?? data.insurance.date ?? null,
      }
    : null;

  const inspection = data.inspection
    ? {
        inspection_date: data.inspection.inspection_date ?? data.inspection.date ?? null,
        next_inspection_date: data.inspection.next_inspection_date ?? data.inspection.next_date ?? null,
        last: data.inspection.last ?? data.inspection.date ?? null,
        next: data.inspection.next ?? data.inspection.next_date ?? null,
        label: data.inspection.label ?? null,
        memo: data.inspection.memo ?? null,
      }
    : null;

  const tax = data.tax
    ? {
        tax_due_date: data.tax.tax_due_date ?? data.tax.date ?? null,
        paid: data.tax.paid,
        tone: data.tax.tone,
        days_remaining: data.tax.days_remaining,
        label: data.tax.label,
        amount: data.tax.amount ?? null,
        memo: data.tax.memo ?? null,
      }
    : null;

  return { insurance, inspection, tax };
};

export default function App() {
  const navigate = useNavigate();

  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("");
  const [accountType, setAccountType] = useState("registered");
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [legalSummary, setLegalSummary] = useState(mapLegalSummary(null));
  const [costRefreshKey, setCostRefreshKey] = useState(0);
  const [bannerInset, setBannerInset] = useState(() => (isAdMobSupported() ? getBannerInset() : 0));

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
    const storedAccountType = localStorage.getItem("account_type") || "registered";
    setToken(storedToken);
    setUserId(storedUserId ? Number(storedUserId) : null);
    setUsername(storedUsername);
    setAccountType(storedAccountType);
    setAuthReady(true);
  }, []);

  const fetchVehicles = useCallback(
    async (targetVehicleId) => {
      setVehiclesLoading(true);
      setVehiclesError("");
      try {
        const response = await api.get("/vehicles/bootstrap", { params: targetVehicleId ? { vehicleId: targetVehicleId } : {} });
        const list = Array.isArray(response.data?.vehicles) ? response.data.vehicles : [];
        setVehicles(list);
        setVehiclesLoaded(true);
        setLegalSummary(mapLegalSummary(response.data?.legalSummary ?? null));

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
        setVehiclesLoaded(true);
        setVehiclesError("차량 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        setLegalSummary(mapLegalSummary(null));
        console.error("차량 목록을 불러오지 못했습니다.", error);
        throw error;
      } finally {
        setVehiclesLoading(false);
      }
    },
    [],
  );

  const refreshVehicle = useCallback(
    async (vehicleId) => {
      const targetId = vehicleId ?? selectedVehicle?.id;
      try {
        await fetchVehicles(targetId);
      } catch (_) {
        // 이미 콘솔에 기록됨
      }
    },
    [fetchVehicles, selectedVehicle?.id],
  );

  const handleLoginSuccess = (t, u, id, nextAccountType = "registered", guestResumeToken = null) => {
    setToken(t);
    setUsername(u);
    setAccountType(nextAccountType);
    setUserId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", t);
      localStorage.setItem("user_id", String(id));
      localStorage.setItem("username", u ?? "");
      localStorage.setItem("account_type", nextAccountType);
      if (nextAccountType === "guest" && guestResumeToken) {
        localStorage.setItem("guest_resume_token", guestResumeToken);
      }
    }
    navigate("/");
  };

  const handleLogout = () => {
    setToken(null);
    setUsername("");
    setAccountType("registered");
    setUserId(null);
    setSelectedVehicle(null);
    setVehicles([]);
    setVehiclesLoading(false);
    setVehiclesLoaded(false);
    setVehiclesError("");
    setLegalSummary(mapLegalSummary(null));
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
      localStorage.removeItem("account_type");
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
    if (typeof window === "undefined") return;
    if (accountType) {
      localStorage.setItem("account_type", accountType);
    } else {
      localStorage.removeItem("account_type");
    }
  }, [accountType]);

  useEffect(() => {
    if (!token) return;
    fetchVehicles().catch(() => {});
  }, [token, fetchVehicles]);

  useEffect(() => {
    if (!isAdMobSupported()) return undefined;
    return subscribeBannerInset((nextInset) => {
      setBannerInset(nextInset);
    });
  }, []);

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
      vehiclesLoading={vehiclesLoading}
      vehiclesLoaded={vehiclesLoaded}
      vehiclesError={vehiclesError}
      selectedVehicle={selectedVehicle}
      setSelectedVehicle={setSelectedVehicle}
      fetchVehicles={fetchVehicles}
      refreshVehicle={refreshVehicle}
      userId={userId}
      username={username}
      accountType={accountType}
      legalSummary={legalSummary}
      onLogout={handleLogout}
      costRefreshKey={costRefreshKey}
      onCostRefresh={triggerCostRefresh}
      bannerInset={bannerInset}
    />
  );
}

function AppShell({
  selectedVehicle,
  setSelectedVehicle,
  vehicles,
  vehiclesLoading,
  vehiclesLoaded,
  vehiclesError,
  fetchVehicles,
  refreshVehicle,
  userId,
  username,
  accountType,
  legalSummary,
  onLogout,
  costRefreshKey,
  onCostRefresh,
  bannerInset = 0,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  const headerTitle = selectedVehicle
    ? getHeaderTitle(location.pathname, selectedVehicle)
    : "내 차량";

  const showBackButton = selectedVehicle && !isDashboard;

  useEffect(() => {
    if (!selectedVehicle && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  }, [selectedVehicle, location.pathname, navigate]);

  useEffect(() => {
    if (!selectedVehicle || location.pathname !== "/") return;
    if (typeof window === "undefined") return;
    const key = `setup-guide-pending:${selectedVehicle.id}`;
    if (localStorage.getItem(key) === "1") {
      navigate("/setup-guide", { replace: true });
    }
  }, [selectedVehicle, location.pathname, navigate]);

  const bottomInset = selectedVehicle ? bannerInset + (bannerInset > 0 ? BANNER_GAP : 0) : 0;

  return (
    <div className="relative flex min-h-screen flex-col bg-background-light text-text-light">
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b border-border-light bg-background-light/95 px-4 backdrop-blur"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          minHeight: "calc(56px + env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="flex items-center">
          {showBackButton ? (
            <button
              type="button"
              aria-label="뒤로가기"
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-light transition hover:bg-primary/10"
              onClick={() => navigate(-1)}
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
          ) : (
            <span className="material-symbols-outlined text-2xl text-subtext-light">menu</span>
          )}
        </div>
        <h1 className="text-base font-bold text-text-light">{headerTitle}</h1>
        <div className="flex items-center gap-2">
          {selectedVehicle ? (
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-full bg-primary/10 px-4 text-sm font-semibold text-primary transition hover:bg-primary/20"
              onClick={() => {
                setSelectedVehicle(null);
                navigate("/");
              }}
            >
              <span className="material-symbols-outlined text-lg">directions_car</span>
              <span>차량 변경</span>
            </button>
          ) : (
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
              onClick={() => fetchVehicles().catch(() => {})}
            >
              <span className="material-symbols-outlined text-lg text-white">refresh</span>
              <span>새로고침</span>
            </button>
          )}
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-full border border-border-light px-4 text-sm font-semibold text-subtext-light transition hover:text-primary"
            onClick={onLogout}
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>로그아웃</span>
          </button>
        </div>
      </header>
      <main
        className="flex-1 overflow-x-hidden"
        style={{ paddingBottom: `${selectedVehicle ? BOTTOM_NAV_HEIGHT + 16 + bottomInset : BOTTOM_NAV_HEIGHT + 16}px` }}
      >
        {!selectedVehicle ? (
          <div className="h-full px-4 py-6">
            <VehicleSelectScreen
              vehicles={vehicles}
              loading={vehiclesLoading}
              loaded={vehiclesLoaded}
              error={vehiclesError}
              onRetry={() => fetchVehicles().catch(() => {})}
              onSelect={(v) => {
                setSelectedVehicle(v);
                refreshVehicle(v.id);
                navigate("/");
              }}
              onCreated={(createdVehicleId) => {
                if (typeof window !== "undefined" && createdVehicleId) {
                  localStorage.setItem(`setup-guide-pending:${createdVehicleId}`, "1");
                }
                fetchVehicles(createdVehicleId)
                  .then(() => navigate("/"))
                  .catch(() => {});
              }}
              onDeleted={(deletedVehicleId) => {
                fetchVehicles()
                  .then((list) => {
                    if (!list.find((item) => item.id === deletedVehicleId)) {
                      navigate("/");
                    }
                  })
                  .catch(() => {});
              }}
              userId={userId}
            />
          </div>
        ) : (
          <Routes>
            <Route
              path="/setup-guide"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <InitialSetupGuide vehicle={selectedVehicle} />
                </PanelGuard>
              }
            />
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
              path="/tasks"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <TasksPanel vehicle={selectedVehicle} legalSummary={legalSummary} />
                </PanelGuard>
              }
            />
            <Route
              path="/driving"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <DrivingAnalysisPanel vehicle={selectedVehicle} onVehicleRefresh={refreshVehicle} hideLocalBack />
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
                    fuelType={selectedVehicle.fuelType}
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
                    fuelType={selectedVehicle.fuelType}
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
                    fuelType={selectedVehicle.fuelType}
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
                  <TirePanel vehicle={selectedVehicle} />
                </PanelGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <PanelGuard vehicle={selectedVehicle}>
                  <SettingsPanel userId={userId} vehicle={selectedVehicle} username={username} accountType={accountType} onAccountDeleted={onLogout} />
                </PanelGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </main>
      {selectedVehicle && <BottomNavigation currentPath={location.pathname} navigateTo={navigate} bottomOffset={bottomInset} />}
    </div>
  );
}

function getHeaderTitle(pathname, vehicle) {
  if (pathname === "/" && vehicle) {
    const displayName = [vehicle?.maker, vehicle?.model].filter(Boolean).join(" ");
    return displayName || "대시보드";
  }
  return ROUTE_TITLES[pathname] || "차량 관리";
}

function BottomNavigation({ currentPath, navigateTo, bottomOffset = 0 }) {
  return (
    <nav
      className="fixed left-0 right-0 z-30 flex items-center justify-between border-t border-border-light bg-surface-light/95 px-6 backdrop-blur"
      style={{
        bottom: `${bottomOffset}px`,
        minHeight: "calc(80px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
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


