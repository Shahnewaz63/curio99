import type { Request, Response, CookieOptions } from "express";

export function getSessionCookieOptions(req?: Request): CookieOptions {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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