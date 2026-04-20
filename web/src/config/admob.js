export const ADMOB_TEST_IDS = {
  android: {
    appId: "ca-app-pub-7545166427116165~8135730259",
    banner: "ca-app-pub-7545166427116165/2665805367",
  },
  ios: {
    appId: "ca-app-pub-3940256099942544~1458002511",
    banner: "ca-app-pub-3940256099942544/2934735716",
  },
};

const trim = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

export function getAdMobPlatformConfig(platform) {
  if (platform === "ios") {
    return {
      appId: trim(import.meta.env.VITE_ADMOB_IOS_APP_ID) || ADMOB_TEST_IDS.ios.appId,
      bannerId: trim(import.meta.env.VITE_ADMOB_IOS_BANNER_ID) || ADMOB_TEST_IDS.ios.banner,
    };
  }

  return {
    appId: trim(import.meta.env.VITE_ADMOB_ANDROID_APP_ID) || ADMOB_TEST_IDS.android.appId,
    bannerId: trim(import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID) || ADMOB_TEST_IDS.android.banner,
  };
}

export function isUsingTestAds(platform) {
  const config = getAdMobPlatformConfig(platform);
  const testConfig = platform === "ios" ? ADMOB_TEST_IDS.ios : ADMOB_TEST_IDS.android;
  return config.appId === testConfig.appId || config.bannerId === testConfig.banner;
}
