import type { Request, Response, CookieOptions } from "express";

export function getSessionCookieOptions(req?: Request): CookieOptions {
  const hostname = req?.hostname || req?.headers.host?.split(":")[0] || "";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const forwardedProtocol = req?.headers["x-forwarded-proto"];
  const isHttps = req?.protocol === "https" || req?.secure === true || forwardedProtocol === "https";

  return {
    path: "/",
    httpOnly: true,
    sameSite: isLocalhost || !isHttps ? "lax" : "none",
    secure: !isLocalhost && isHttps,
  };
}

export function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";").reduce((acc: Record<string, string>, cookie: string) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});

  return cookies[name];
}

export function getProtocol(proto?: string): string {
  return proto || "http";
}

export function setCookie(
  res: Response,
  name: string,
  value: string,
  options?: Partial<CookieOptions>
) {
  const cookieOptions: CookieOptions = {
    ...getSessionCookieOptions(),
    ...options,
  };

  res.cookie(name, value, cookieOptions);
}
