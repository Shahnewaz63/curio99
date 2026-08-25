import type { Request, Response, CookieOptions } from "express";

export function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return undefined;
  
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) acc[key] = decodeURIComponent(value);
    return acc;
  }, {} as Record<string, string>);

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
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...options,
  };
  
  res.cookie(name, value, cookieOptions);
}