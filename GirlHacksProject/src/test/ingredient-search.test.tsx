import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IngredientSearch } from "@/components/IngredientSearch";

describe("IngredientSearch", () => {
  it("keeps an ambiguous ingredient alias generic when selected with Enter", () => {
    const onAdd = vi.fn();

    render(<IngredientSearch selected={[]} onAdd={onAdd} onRemove={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Search ingredients" });
    fireEvent.change(input, { target: { value: "oregano" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAdd).toHaveBeenCalledWith("oregano");
  });

  it("requires a catalog suggestion when custom entries are disabled", () => {
    const onAdd = vi.fn();

    render(<IngredientSearch selected={[]} onAdd={onAdd} onRemove={vi.fn()} allowCustom={false} />);
    const input = screen.getByRole("textbox", { name: "Search ingredients" });
    fireEvent.change(input, { target: { value: "not an ingredient" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText("No matching catalog ingredient. Try another search.")).toBeVisible();
  });

  it("adds a selected catalog suggestion when custom entries are disabled", () => {
    const onAdd = vi.fn();

    render(<IngredientSearch selected={[]} onAdd={onAdd} onRemove={vi.fn()} allowCustom={false} />);
    const input = screen.getByRole("textbox", { name: "Search ingredients" });
    fireEvent.change(input, { target: { value: "cilantro" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAdd).toHaveBeenCalledWith("fresh cilantro");
  });
});
