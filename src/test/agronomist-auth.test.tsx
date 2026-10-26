import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { AuthBar } from "@/components/agronomist/AuthBar";
import type { AgronomistAuth } from "@/hooks/use-agronomist-auth";
import { DEMO_AGRONOMIST } from "@/lib/agronomist-accounts";

afterEach(cleanup);

function auth(overrides: Partial<AgronomistAuth> = {}): AgronomistAuth {
  return {
    status: "signedOut",
    userId: null,
    email: null,
    name: null,
    isAgronomist: false,
    error: null,
    signIn: async () => ({ ok: true }),
    signOut: async () => {},
    refresh: async () => {},
    ...overrides,
  };
}

it("prints the shared account under the sign-in form and fills it on request", () => {
  render(<AuthBar auth={auth()} language="en" />);

  expect(screen.getByText(DEMO_AGRONOMIST.email)).toBeTruthy();
  expect(screen.getByText(DEMO_AGRONOMIST.password)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /Fill the form/ }));

  const email = screen.getByLabelText("Email") as HTMLInputElement;
  const password = screen.getByLabelText("Password") as HTMLInputElement;
  expect(email.value).toBe(DEMO_AGRONOMIST.email);
  expect(password.value).toBe(DEMO_AGRONOMIST.password);
});

it("says who must enable email sign-in when the provider is disabled", async () => {
  render(
    <AuthBar
      auth={auth({
        signIn: async () => ({ ok: false, message: "Email logins are disabled" }),
      })}
      language="en"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /Fill the form/ }));
  fireEvent.click(screen.getByRole("button", { name: /Sign in/ }));

  const hint = await screen.findByText(/An administrator enables Email/);
  expect(hint).toBeTruthy();
});

it("prints the shared account in the farmer's language", () => {
  render(<AuthBar auth={auth()} language="rw" />);

  expect(screen.getByText("Konti y’urugero isangiwe")).toBeTruthy();
  expect(screen.getByText(DEMO_AGRONOMIST.email)).toBeTruthy();
});
