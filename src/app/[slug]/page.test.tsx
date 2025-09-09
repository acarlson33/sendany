import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import WorkspacePage from "./page";
import { notFound } from "next/navigation";

// Mock dependencies
vi.mock("@/lib/databse", () => ({
  getWorkspace: vi.fn(),
  getWorkspaceFiles: vi.fn(),
  recordWorkspaceView: vi.fn(),
  verifyWorkspacePassword: vi.fn(),
}));

vi.mock("@/stack", () => ({
  stackServerApp: {
    getUser: vi.fn(),
  },
}));

vi.mock("@/components/workspace-viewer", () => ({
  WorkspaceViewer: ({ workspace, files }: any) => (
    <div data-testid="workspace-viewer">
      <h1>{workspace.title}</h1>
      <div>Files: {files.length}</div>
    </div>
  ),
}));

vi.mock("@/components/password-form", () => ({
  PasswordForm: ({ slug, error }: any) => (
    <div data-testid="password-form">
      <div>Password required for: {slug}</div>
      {error && <div>Error: {error}</div>}
    </div>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn((header: string) => {
      if (header === "x-forwarded-for") return "192.168.1.1";
      if (header === "user-agent") return "Test User Agent";
      return null;
    }),
  })),
}));

const { getWorkspace, getWorkspaceFiles, verifyWorkspacePassword } =
  await import("@/lib/databse");
const { stackServerApp } = await import("@/stack");

describe("WorkspacePage", () => {
  const mockWorkspace = {
    id: "workspace-123",
    slug: "test-workspace",
    title: "Test Workspace",
    description: "A test workspace",
    user_id: "user-123",
    is_public: true,
    password_hash: undefined,
    expires_at: undefined,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockFiles = [
    {
      id: "file-1",
      workspace_id: "workspace-123",
      filename: "readme.md",
      content: "# Test",
      file_type: "markdown" as const,
      language: "markdown",
      order_index: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspace).mockResolvedValue(mockWorkspace);
    vi.mocked(getWorkspaceFiles).mockResolvedValue(mockFiles);
    vi.mocked(stackServerApp.getUser).mockResolvedValue(null);
  });

  it("renders public workspace for unauthenticated user", async () => {
    const params = Promise.resolve({ slug: "test-workspace" });
    const searchParams = Promise.resolve({});

    render(await WorkspacePage({ params, searchParams }));

    expect(screen.getByTestId("workspace-viewer")).toBeInTheDocument();
    expect(screen.getByText("Test Workspace")).toBeInTheDocument();
    expect(screen.getByText("Files: 1")).toBeInTheDocument();
  });

  it("calls notFound for non-existent workspace", async () => {
    vi.mocked(getWorkspace).mockResolvedValue(undefined);

    const params = Promise.resolve({ slug: "non-existent" });
    const searchParams = Promise.resolve({});

    await WorkspacePage({ params, searchParams });

    expect(notFound).toHaveBeenCalled();
  });

  it("calls notFound for expired workspace", async () => {
    const expiredWorkspace = {
      ...mockWorkspace,
      expires_at: new Date(Date.now() - 86400000), // 1 day ago
    };
    vi.mocked(getWorkspace).mockResolvedValue(expiredWorkspace);

    const params = Promise.resolve({ slug: "expired-workspace" });
    const searchParams = Promise.resolve({});

    await WorkspacePage({ params, searchParams });

    expect(notFound).toHaveBeenCalled();
  });

  it("shows password form for password-protected workspace without password", async () => {
    const protectedWorkspace = {
      ...mockWorkspace,
      password_hash: "hashed-password",
    };
    vi.mocked(getWorkspace).mockResolvedValue(protectedWorkspace);

    const params = Promise.resolve({ slug: "protected-workspace" });
    const searchParams = Promise.resolve({});

    render(await WorkspacePage({ params, searchParams }));

    expect(screen.getByTestId("password-form")).toBeInTheDocument();
    expect(
      screen.getByText("Password required for: protected-workspace")
    ).toBeInTheDocument();
  });

  it("shows password form with error for wrong password", async () => {
    const protectedWorkspace = {
      ...mockWorkspace,
      password_hash: "hashed-password",
    };
    vi.mocked(getWorkspace).mockResolvedValue(protectedWorkspace);
    vi.mocked(verifyWorkspacePassword).mockResolvedValue(false);

    const params = Promise.resolve({ slug: "protected-workspace" });
    const searchParams = Promise.resolve({ password: "wrong-password" });

    render(await WorkspacePage({ params, searchParams }));

    expect(screen.getByTestId("password-form")).toBeInTheDocument();
    expect(screen.getByText("Error: Invalid password")).toBeInTheDocument();
  });

  it("renders workspace with correct password", async () => {
    const protectedWorkspace = {
      ...mockWorkspace,
      password_hash: "hashed-password",
    };
    vi.mocked(getWorkspace).mockResolvedValue(protectedWorkspace);
    vi.mocked(verifyWorkspacePassword).mockResolvedValue(true);

    const params = Promise.resolve({ slug: "protected-workspace" });
    const searchParams = Promise.resolve({ password: "correct-password" });

    render(await WorkspacePage({ params, searchParams }));

    expect(screen.getByTestId("workspace-viewer")).toBeInTheDocument();
    expect(screen.getByText("Test Workspace")).toBeInTheDocument();
  });

  it("handles workspace with no files", async () => {
    vi.mocked(getWorkspaceFiles).mockResolvedValue([]);

    const params = Promise.resolve({ slug: "empty-workspace" });
    const searchParams = Promise.resolve({});

    render(await WorkspacePage({ params, searchParams }));

    expect(screen.getByText("Files: 0")).toBeInTheDocument();
  });
});
