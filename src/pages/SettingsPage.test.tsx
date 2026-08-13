import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/customization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/customization")>();
  return { ...actual, saveProfile: vi.fn() };
});

import { saveProfile } from "../api/customization";
import { demoDashboard } from "../data/demo";
import { SettingsPage } from "./SettingsPage";

const baseProps = {
  data: demoDashboard,
  source: "api" as const,
  theme: "dark" as const,
  onThemeToggle: vi.fn(),
  onNewOperation: vi.fn(),
  onSearch: vi.fn(),
  activeUser: "Участник 1",
  selectedPeriod: "2026-08",
  onPeriodChange: vi.fn(),
  activeUserKey: "person-1",
};

describe("profile settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveProfile).mockResolvedValue(undefined);
  });

  it("saves the profile and updates the visible dashboard data without a reload", async () => {
    const onDataChange = vi.fn();
    const onRefresh = vi.fn();
    render(<SettingsPage {...baseProps} canWrite onDataChange={onDataChange} onRefresh={onRefresh} />);

    fireEvent.change(screen.getByLabelText("Имя в приложении"), { target: { value: "Новое имя" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));

    await waitFor(() => expect(saveProfile).toHaveBeenCalledWith("person-1", {
      display_name: "Новое имя",
      avatar_data_url: null,
      accent_color: "#364C84",
    }));
    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      people: expect.arrayContaining([expect.objectContaining({ key: "person-1", name: "Новое имя" })]),
    }));
    expect(screen.getByText("Профиль сохранён.")).toBeInTheDocument();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("shows an API error instead of failing silently", async () => {
    vi.mocked(saveProfile).mockRejectedValueOnce(new Error("CSRF token invalid"));
    render(<SettingsPage {...baseProps} canWrite />);

    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("CSRF token invalid");
    expect(screen.getByRole("button", { name: "Сохранить профиль" })).toBeEnabled();
  });

  it("explains how to restore write access instead of leaving a silent disabled button", async () => {
    render(<SettingsPage {...baseProps} canWrite={false} />);

    const saveButton = screen.getByRole("button", { name: "Сохранить профиль" });
    expect(saveButton).toBeEnabled();
    expect(screen.getByText(/доступен только просмотр/i)).toBeInTheDocument();

    fireEvent.click(saveButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(/войдите через Telegram заново/i);
    expect(saveProfile).not.toHaveBeenCalled();
  });
});
