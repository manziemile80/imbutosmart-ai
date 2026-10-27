import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LanguagePicker } from "@/components/LanguagePicker";

afterEach(cleanup);

describe("the header language picker", () => {
  it("offers each language with its own flag", () => {
    render(<LanguagePicker language="en" onChange={() => {}} label="Language" />);

    const trigger = screen.getByRole("button", { name: "Language" });
    expect(trigger.querySelector("svg")).not.toBeNull();

    fireEvent.click(trigger);

    const list = screen.getByRole("listbox");
    const options = within(list).getAllByRole("option");

    expect(options.map((option) => option.textContent)).toEqual([
      "English",
      "Kinyarwanda",
      "Français",
    ]);
    for (const option of options) expect(option.querySelector("svg")).not.toBeNull();
  });

  it("shows the language in use and reports a new choice", () => {
    const onChange = vi.fn();
    render(<LanguagePicker language="rw" onChange={onChange} label="Language" />);

    const trigger = screen.getByRole("button", { name: "Language" });
    expect(trigger).toHaveTextContent("RW");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Français" }));

    expect(onChange).toHaveBeenCalledWith("fr");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes on Escape and returns the keyboard to the trigger", () => {
    render(<LanguagePicker language="en" onChange={() => {}} label="Language" />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Language" })).toHaveFocus();
  });
});
