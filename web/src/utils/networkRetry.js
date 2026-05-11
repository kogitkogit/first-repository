export const wait = (ms) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const isRetryableRequestError = (error) => {
  const status = error?.response?.status;
  return error?.code === "ECONNABORTED" || error?.code === "ERR_NETWORK" || !status || status >= 500;
};

export async function runWithSingleRetry(action, options = {}) {
  const {
    retryDelayMs = 700,
    shouldRetry = isRetryableRequestError,
    beforeRetry,
  } = options;

  try {
    return await action(0);
  } catch (error) {
    if (!shouldRetry(error)) {
      throw error;
    }
    if (beforeRetry) {
      await beforeRetry(error);
    }
    await wait(retryDelayMs);
    return action(1);
  }
}
