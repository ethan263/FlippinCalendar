import { describe, expect, it, afterEach } from "vitest";

import {
  PRODUCTION_ORIGINS,
  getAppOrigin,
  getClerkAuthorizedParties,
} from "@/lib/site";

describe("site canonical helpers", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.CLERK_AUTHORIZED_PARTIES;
    delete process.env.VERCEL_URL;
  });

  it("uses NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://flippincalendar.co.za";
    expect(getAppOrigin()).toBe("https://flippincalendar.co.za");
  });

  it("expands Clerk parties to apex + www for production domain", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.flippincalendar.co.za";
    expect(getClerkAuthorizedParties()).toEqual([...PRODUCTION_ORIGINS]);
  });

  it("honors CLERK_AUTHORIZED_PARTIES override", () => {
    process.env.CLERK_AUTHORIZED_PARTIES =
      "https://preview.example.com, https://flippincalendar.co.za";
    expect(getClerkAuthorizedParties()).toEqual([
      "https://preview.example.com",
      "https://flippincalendar.co.za",
    ]);
  });
});
