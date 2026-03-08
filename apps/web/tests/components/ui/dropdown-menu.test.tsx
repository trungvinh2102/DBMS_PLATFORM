import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import userEvent from "@testing-library/user-event";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

describe("DropdownMenu", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it("renders trigger and opens content on click", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="trigger">
          Open Menu
        </DropdownMenuTrigger>
        <DropdownMenuContent data-testid="content">
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    const trigger = screen.getByTestId("trigger");
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();

    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });

  it("closes menu when clicking item", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem data-testid="profile">Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open Menu"));
    await waitFor(() =>
      expect(screen.getByText("Profile")).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("profile"));

    await waitFor(() => {
      expect(screen.queryByText("Profile")).not.toBeInTheDocument();
    });
  });

  it("supports keyboard navigation (ArrowDown → select item)", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem data-testid="settings">Settings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open Menu"));

    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");

    const settingsItem = screen.getByTestId("settings");
    expect(settingsItem).toHaveFocus();

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("renders group, label and separator correctly", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Billing</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open"));

    await waitFor(() => {
      expect(screen.getByText("My Account")).toBeInTheDocument();
      expect(screen.getByText("Billing")).toBeInTheDocument();
      expect(screen.getByRole("separator")).toBeInTheDocument();
    });
  });

  it("handles CheckboxItem checked state & toggle", async () => {
    const handleCheckedChange = vi.fn();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked={true}
            onCheckedChange={handleCheckedChange}
            data-testid="checkbox"
          >
            Dark mode
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open"));

    const item = await screen.findByTestId("checkbox");
    expect(item).toBeInTheDocument();
    expect(item.querySelector("svg")).toBeInTheDocument();

    await user.click(item);

    expect(handleCheckedChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({
        reason: "item-press",
      }),
    );
  });

  it("renders and interacts with RadioGroup", async () => {
    const handleValueChange = vi.fn();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            value="apple"
            onValueChange={handleValueChange}
          >
            <DropdownMenuRadioItem value="apple">Apple</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="banana" data-testid="banana">
              Banana
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open"));

    const banana = await screen.findByTestId("banana");
    await user.click(banana);

    expect(handleValueChange).toHaveBeenCalledWith(
      "banana",
      expect.objectContaining({
        reason: "item-press",
      }),
    );
  });

  it("opens sub-menu on hover/click subtrigger", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent sideOffset={4}>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More tools</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem data-testid="redo">Redo</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open"));
    await waitFor(() => screen.getByText("More tools"));

    await user.hover(screen.getByText("More tools"));

    await waitFor(() => {
      expect(screen.getByText("Redo")).toBeInTheDocument();
    });
  });

  it("renders shortcut and uses portal correctly", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open"));

    await waitFor(() => {
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("⌘S")).toBeInTheDocument();
    });
  });
});
