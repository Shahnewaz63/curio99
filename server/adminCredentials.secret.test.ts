import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context.js";
import { sdk } from "./_core/sdk.js";
import { COOKIE_NAME } from "../shared/const.js";
import { appRouter } from "./routers.js";
import { CREDENTIAL_ADMIN_OPEN_ID } from "./adminCredentials.js";

function anonymousContext() {
  let cookieValue = "";
  return {
    ctx: {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        cookie: (_name: string, value: string) => { cookieValue = value; },
      } as TrpcContext["res"],
    },
    getCookie: () => cookieValue,
  };
}

describe("credential-based admin login", () => {
  it("reports that protected admin credentials are configured", async () => {
    const { ctx } = anonymousContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.adminCredentialConfiguration()).resolves.toEqual({ configured: true });
  });

  it("accepts the protected owner credentials through the auth procedure", async () => {
    const { ctx, getCookie } = anonymousContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.adminCredentialLogin({
      id: process.env.ADMIN_LOGIN_ID ?? "",
      password: process.env.ADMIN_LOGIN_PASSWORD ?? "",
    });

    expect(result).toEqual({ success: true });
    expect(getCookie()).not.toBe("");
    const user = await sdk.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${getCookie()}` } } as TrpcContext["req"]);
    expect(user.role).toBe("admin");
  });

  it("accepts a local credential-admin session without a hosted OAuth app ID", async () => {
    const token = await sdk.signSession({
      openId: CREDENTIAL_ADMIN_OPEN_ID,
      appId: "",
      name: "Curio Admin",
    });

    const user = await sdk.authenticateRequest({
      headers: { cookie: `${COOKIE_NAME}=${token}` },
    } as TrpcContext["req"]);

    expect(user.role).toBe("admin");
  });
});
