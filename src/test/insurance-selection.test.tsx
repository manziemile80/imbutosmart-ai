import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { InsuranceGuidance } from "@/components/InsuranceGuidance";

afterEach(cleanup);

it("keeps independent coverage selections working across language changes", () => {
  const { rerender } = render(<InsuranceGuidance district="Musanze" soil="Volcanic" language="en" />);
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  fireEvent.click(screen.getAllByRole("checkbox")[2]);
  expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(2);
  rerender(<InsuranceGuidance district="Ngoma" soil="Sandy" language="fr" />);
  expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Effacer les choix" }));
  expect(screen.queryAllByRole("checkbox", { checked: true })).toHaveLength(0);
});