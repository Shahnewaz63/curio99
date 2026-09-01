interface Window {
  fbq?: (
    type: string,
    eventName: string,
    params?: Record<string, unknown>
  ) => void;
}