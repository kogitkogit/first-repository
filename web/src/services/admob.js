import { Capacitor } from "@capacitor/core";
import { AdMob, BannerAdPluginEvents, BannerAdPosition, BannerAdSize, MaxAdContentRating } from "@capacitor-community/admob";
import { getAdMobPlatformConfig, isUsingTestAds } from "../config/admob";

let initPromise = null;
let bannerVisible = false;
let bannerSizeListener = null;
let bannerInset = 0;
const bannerInsetSubscribers = new Set();
const BANNER_BOTTOM_MARGIN = 36;

function getPlatform() {
  return Capacitor.getPlatform();
}

export function isAdMobSupported() {
  const platform = getPlatform();
  return Capacitor.isNativePlatform() && (platform === "android" || platform === "ios");
}

function parseTestDeviceIds() {
  const raw = import.meta.env.VITE_ADMOB_TEST_DEVICE_IDS;
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function notifyBannerInset(nextInset) {
  bannerInset = nextInset;
  bannerInsetSubscribers.forEach((listener) => {
    try {
      listener(bannerInset);
    } catch (error) {
      console.error("배너 높이 구독자 처리 실패", error);
    }
  });
}

function ensureBannerSizeListener() {
  if (bannerSizeListener || !isAdMobSupported()) return;
  bannerSizeListener = AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info) => {
    const height = Number(info?.height || 0);
    notifyBannerInset(height > 0 ? height + BANNER_BOTTOM_MARGIN : 0);
  });
}

export function subscribeBannerInset(listener) {
  bannerInsetSubscribers.add(listener);
  listener(bannerInset);
  return () => {
    bannerInsetSubscribers.delete(listener);
  };
}

export function getBannerInset() {
  return bannerInset;
}

export async function initializeAdMob() {
  if (!isAdMobSupported()) {
    return { enabled: false, canRequestAds: false };
  }

  ensureBannerSizeListener();

  if (!initPromise) {
    initPromise = (async () => {
      const platform = getPlatform();
      await AdMob.initialize({
        testingDevices: parseTestDeviceIds(),
        initializeForTesting: isUsingTestAds(platform),
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        maxAdContentRating: MaxAdContentRating.General,
      });

      return {
        enabled: true,
        canRequestAds: true,
      };
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

export async function showDashboardBanner() {
  if (!isAdMobSupported()) return false;

  const { canRequestAds } = await initializeAdMob();
  if (!canRequestAds) {
    await hideDashboardBanner();
    return false;
  }

  const platform = getPlatform();
  const config = getAdMobPlatformConfig(platform);

  await AdMob.showBanner({
    adId: config.bannerId,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: BANNER_BOTTOM_MARGIN,
    isTesting: isUsingTestAds(platform),
  });

  bannerVisible = true;
  return true;
}

export async function hideDashboardBanner() {
  if (!isAdMobSupported() || !bannerVisible) return;
  await AdMob.removeBanner();
  bannerVisible = false;
  notifyBannerInset(0);
}
