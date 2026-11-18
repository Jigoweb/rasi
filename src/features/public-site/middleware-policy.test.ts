import {
  middlewareRequiresVerifiedUser,
  middlewareUserFromClaims,
  middlewareVerification,
  resolveMiddlewareRedirect,
  type MiddlewareUser,
} from "./middleware-policy";

describe("resolveMiddlewareRedirect", () => {
  it("keeps the public home visible for anonymous and logged-in visitors", () => {
    expect(resolveMiddlewareRedirect("/", null)).toBeNull();
    expect(resolveMiddlewareRedirect("/", { ruolo: "admin" })).toBeNull();
  });

  it("sends anonymous visitors away from the dashboard", () => {
    expect(resolveMiddlewareRedirect("/dashboard", null)).toBe("/auth");
    expect(resolveMiddlewareRedirect("/dashboard/cms", null)).toBe("/auth");
  });

  it("leaves /auth open unless the user is already signed in", () => {
    expect(resolveMiddlewareRedirect("/auth", null)).toBeNull();
    expect(resolveMiddlewareRedirect("/auth", { ruolo: "admin" })).toBe("/dashboard");
    expect(resolveMiddlewareRedirect("/auth/callback", { ruolo: "admin" })).toBeNull();
  });

  it("applies role walls inside the dashboard", () => {
    expect(resolveMiddlewareRedirect("/dashboard/cms", { ruolo: "operatore" })).toBe("/dashboard");
    expect(resolveMiddlewareRedirect("/dashboard/cms", { ruolo: "admin" })).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/opere", { ruolo: "artista" })).toBe(
      "/dashboard/profilo"
    );
    expect(
      resolveMiddlewareRedirect("/dashboard/opere", {
        ruolo: "artista",
        artistaId: null,
      })
    ).toBe("/dashboard/profilo");
    expect(
      resolveMiddlewareRedirect("/dashboard/profilo", {
        ruolo: "artista",
        artistaId: "11111111-1111-4111-8111-111111111111",
      })
    ).toBeNull();
  });

  it("keeps the tirocinante inside the Opere section", () => {
    const tirocinante = { ruolo: "tirocinante" };
    expect(resolveMiddlewareRedirect("/dashboard/opere", tirocinante)).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/opere/abc", tirocinante)).toBeNull();
    for (const path of [
      "/dashboard",
      "/dashboard/artisti",
      "/dashboard/artisti/abc",
      "/dashboard/programmazioni",
      "/dashboard/individuazioni",
      "/dashboard/ripartizioni",
      "/dashboard/utenti",
      "/dashboard/cms/pages",
      "/dashboard/opere-altro",
    ]) {
      expect(resolveMiddlewareRedirect(path, tirocinante)).toBe("/dashboard/opere");
    }
  });

  it("lets the operatore base read the database but not manage users or the CMS", () => {
    const base = { ruolo: "operatore_base" };
    expect(resolveMiddlewareRedirect("/dashboard", base)).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/artisti", base)).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/programmazioni", base)).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/utenti", base)).toBe("/dashboard");
    expect(resolveMiddlewareRedirect("/dashboard/cms/pages", base)).toBe("/dashboard");
  });

  it("lets only admin and Operatore pro open the review of operator changes", () => {
    expect(resolveMiddlewareRedirect("/dashboard/approvazioni", { ruolo: "operatore" })).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/approvazioni/abc", { ruolo: "admin" })).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/approvazioni", { ruolo: "operatore_base" })).toBe("/dashboard");
    expect(resolveMiddlewareRedirect("/dashboard/approvazioni", { ruolo: "tirocinante" })).toBe("/dashboard/opere");
  });

  it("does not intercept other public routes", () => {
    expect(resolveMiddlewareRedirect("/contatti", null)).toBeNull();
    expect(resolveMiddlewareRedirect("/news/bando-rasi-2026", null)).toBeNull();
  });
});

const PROBES: MiddlewareUser[] = [
  null,
  { ruolo: "admin" },
  { ruolo: "operatore" },
  { ruolo: "collecting" },
  { ruolo: null },
  { ruolo: "artista", artistaId: null },
  {
    ruolo: "artista",
    artistaId: "11111111-1111-4111-8111-111111111111",
  },
];

describe("middlewareVerification", () => {
  it("uses claims for presence checks and the Auth record for role walls", () => {
    expect(middlewareVerification("/auth")).toBe("claims");
    expect(middlewareVerification("/auth/login")).toBe("claims");
    expect(middlewareVerification("/auth/callback")).toBeNull();
    expect(middlewareVerification("/auth/imposta-password")).toBeNull();
    expect(middlewareVerification("/dashboard")).toBe("user");
    expect(middlewareVerification("/dashboard/cms")).toBe("user");
    expect(middlewareVerification("/dashboard/profilo")).toBe("user");
    expect(middlewareVerification("/")).toBeNull();
    expect(middlewareVerification("/api/users")).toBeNull();
  });
});

describe("middlewareRequiresVerifiedUser", () => {
  it("verifies only routes whose redirect depends on the user", () => {
    const paths = [
      "/",
      "/contatti",
      "/news/bando-rasi-2026",
      "/api/users",
      "/api/opere/cast",
      "/auth",
      "/auth/login",
      "/auth/callback",
      "/auth/imposta-password",
      "/dashboard",
      "/dashboard/cms",
      "/dashboard/utenti",
      "/dashboard/profilo",
      "/dashboard/opere",
    ];

    for (const pathname of paths) {
      const outcomes = PROBES.map((user) =>
        resolveMiddlewareRedirect(pathname, user)
      );
      const dependsOnUser = outcomes.some((outcome) => outcome !== outcomes[0]);
      expect(middlewareRequiresVerifiedUser(pathname)).toBe(dependsOnUser);
    }
  });
});

describe("middlewareUserFromClaims", () => {
  it("returns null without verified claims", () => {
    expect(middlewareUserFromClaims(null)).toBeNull();
    expect(middlewareUserFromClaims(undefined)).toBeNull();
  });

  it("reads role and artista id only from app_metadata", () => {
    expect(
      middlewareUserFromClaims({
        app_metadata: {
          ruolo: "artista",
          artista_id: "11111111-1111-4111-8111-111111111111",
        },
      })
    ).toEqual({
      ruolo: "artista",
      artistaId: "11111111-1111-4111-8111-111111111111",
    });

    const claimsWithSpoofedUserMetadata = {
      app_metadata: { ruolo: "admin" },
      user_metadata: {
        ruolo: "admin",
        artista_id: "11111111-1111-4111-8111-111111111111",
      },
    };
    expect(middlewareUserFromClaims(claimsWithSpoofedUserMetadata)).toEqual({
      ruolo: "admin",
      artistaId: null,
    });

    const claimsWithOnlyUserMetadata = {
      app_metadata: {},
      user_metadata: { ruolo: "admin" },
    };
    expect(middlewareUserFromClaims(claimsWithOnlyUserMetadata)).toEqual({
      ruolo: null,
      artistaId: null,
    });
  });
});
