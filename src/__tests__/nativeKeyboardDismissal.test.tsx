import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

// Exercise the installed ScrollView/TextInput behavior, not a mock that copies
// keyboardDismissMode. DOM focus is a regression check, not iOS acceptance.
vi.mock("react-native", async () => import("react-native-web"));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
import { Action, Input, Page } from "../../apps/mobile/src/ui";

afterEach(cleanup);

it("dismisses a focused field when the page scrolls, preserving its value and next action", async () => {
  const save = vi.fn();
  function Form() {
    const [value, setValue] = useState("");
    return (
      <Page>
        <Input label="Repetitions" value={value} onChangeText={setValue} numeric />
        <Action label="Save set" onPress={() => save(value)} />
      </Page>
    );
  }
  render(<Form />);
  const input = screen.getByLabelText("Repetitions");
  act(() => input.focus());
  fireEvent.change(input, { target: { value: "12" } });
  expect(input).toHaveFocus();
  // The outer child of main is the actual React Native Web ScrollView host.
  const scrollView = screen.getByRole("main").firstElementChild!;
  fireEvent.scroll(scrollView, { target: { scrollTop: 100 } });
  await waitFor(() => expect(input).not.toHaveFocus());
  expect(input).toHaveValue("12");
  fireEvent.click(screen.getByRole("button", { name: "Save set" }));
  expect(save).toHaveBeenCalledExactlyOnceWith("12");
});
