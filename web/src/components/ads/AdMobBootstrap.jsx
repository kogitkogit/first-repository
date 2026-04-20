import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { useToast } from "../ui/ToastProvider";
import { initializeAdMob, isAdMobSupported } from "../../services/admob";

const AGREEMENT_STORAGE_KEY = "naechasutcheop_terms_agreed_v1";

export default function AdMobBootstrap() {
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAdMobSupported()) return undefined;

    let cancelled = false;

    const boot = async () => {
      if (typeof window !== "undefined" && localStorage.getItem(AGREEMENT_STORAGE_KEY) !== "1") {
        return;
      }
      try {
        await initializeAdMob();
      } catch (error) {
        const message = String(error?.message || "");
        const isPublisherMisconfiguration =
          message.includes("Publisher misconfiguration") ||
          message.includes("invalid app ID") ||
          message.includes("lack of configured form");

        if (!cancelled) {
          console.error("AdMob 초기화 실패", error);
          if (!isPublisherMisconfiguration) {
            showToast({
              tone: "warning",
              message: "광고 초기화에 실패했습니다. 다시 앱을 실행해주세요.",
            });
          }
        }
      }
    };

    boot();

    const onTermsAgreed = () => {
      boot();
    };

    const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      boot();
    });

    if (typeof window !== "undefined") {
      window.addEventListener("naechasutcheop:terms-agreed", onTermsAgreed);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("naechasutcheop:terms-agreed", onTermsAgreed);
      }
      listener.then((handle) => handle.remove()).catch(() => {});
    };
  }, [showToast]);

  return null;
}
