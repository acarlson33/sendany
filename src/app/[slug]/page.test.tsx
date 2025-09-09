import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WorkspacePage from "./page";

render(
  await WorkspacePage({
    params: Promise.resolve({ slug: "nonexistent" }),
    searchParams: Promise.resolve({}),
  })
);

// Mock the database module
vi.mock("@/lib/database", () => ({
  getWorkspaceBySlug: vi.fn(),
  getWorkspaceFiles: vi.fn(),
  recordWorkspaceView: vi.fn(),
  verifyWorkspacePassword: vi.fn(),
}));

// Mock Stack Auth
vi.mock("@stackframe/stack", () => ({
  useUser: vi.fn(() => ({ user: null })),
}));

// Mock Next.js
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn((header: string) => {
      if (header === "x-forwarded-for") return "127.0.0.1";
      if (header === "user-agent") return "test-agent";
      return null;
    }),
  })),
}));

import {
  getWorkspaceBySlug,
  getWorkspaceFiles,
  recordWorkspaceView,
} from "@/lib/database";

describe("WorkspacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render workspace not found when workspace does not exist", async () => {
    (getWorkspaceBySlug as any).mockResolvedValue(null);

    render(
      await WorkspacePage({
        params: Promise.resolve({ slug: "nonexistent" }),
        searchParams: Promise.resolve({}),
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/workspace not found/i)).toBeInTheDocument();
    });
  });

  it("should render workspace content when workspace exists", async () => {
    const mockWorkspace = {
      id: "workspace-1",
      title: "Test Workspace",
      slug: "test-workspace",
      user_id: "user-1",
      is_public: true,
      password_hash: null,
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockFiles = [
      {
        id: "file-1",
        workspace_id: "workspace-1",
        name: "test.txt",
        content: "Hello World",
        language: "text",
        type: "text" as const,
        file_order: 0,
        google_drive_file_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    (getWorkspaceBySlug as any).mockResolvedValue(mockWorkspace);
    (getWorkspaceFiles as any).mockResolvedValue(mockFiles);
    (recordWorkspaceView as any).mockResolvedValue(undefined);

    render(
      await WorkspacePage({
        params: Promise.resolve({ slug: "test-workspace" }),
        searchParams: Promise.resolve({}),
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Test Workspace")).toBeInTheDocument();
    });
  });

  it("should handle password protected workspace", async () => {
    const mockWorkspace = {
      id: "workspace-1",
      title: "Protected Workspace",
      slug: "protected",
      user_id: "user-1",
      is_public: false,
      password_hash: "hashed-password",
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    (getWorkspaceBySlug as any).mockResolvedValue(mockWorkspace);

    render(
      await WorkspacePage({
        params: Promise.resolve({ slug: "protected" }),
        searchParams: Promise.resolve({}),
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/password protected/i)).toBeInTheDocument();
    });
  });

  it("should record workspace view", async () => {
    const mockWorkspace = {
      id: "workspace-1",
      title: "Test Workspace",
      slug: "test",
      user_id: "user-1",
      is_public: true,
      password_hash: null,
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    (getWorkspaceBySlug as any).mockResolvedValue(mockWorkspace);
    (getWorkspaceFiles as any).mockResolvedValue([]);
    (recordWorkspaceView as any).mockResolvedValue(undefined);

    render(
      await WorkspacePage({
        params: Promise.resolve({ slug: "test" }),
        searchParams: Promise.resolve({}),
      })
    );

    await waitFor(() => {
      expect(recordWorkspaceView).toHaveBeenCalledWith({
        workspace_id: "workspace-1",
        ip_address: "127.0.0.1",
        user_agent: "test-agent",
      });
    });
  });

  it("should handle expired workspace", async () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1);

    (getWorkspaceBySlug as any).mockResolvedValue(null); // Expired workspaces return null

    render(
      await WorkspacePage({
        params: Promise.resolve({ slug: "expired" }),
        searchParams: Promise.resolve({}),
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/workspace not found/i)).toBeInTheDocument();
    });
  });

  it("should render private workspace for unauthorized user", async () => {
    const mockWorkspace = {
      id: "workspace-1",
      title: "Private Workspace",
      slug: "private",
      user_id: "user-1",
      is_public: false,
      password_hash: null,
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    (getWorkspaceBySlug as any).mockResolvedValue(mockWorkspace);

    render(
      await WorkspacePage({
        params: Promise.resolve({ slug: "private" }),
        searchParams: Promise.resolve({}),
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/private workspace/i)).toBeInTheDocument();
    });
  });
});
