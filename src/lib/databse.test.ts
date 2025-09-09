// This file has been moved to database.test.ts - please use that file instead

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createWorkspace,
  getWorkspace,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  verifyWorkspacePassword,
  createWorkspaceFile,
  getWorkspaceFiles,
  updateWorkspaceFile,
  deleteWorkspaceFile,
  recordWorkspaceView,
  getExpiredWorkspaces,
  getPublicWorkspaces,
} from "./databse";

// Mock the neon instance
const mockSql = vi.fn();
vi.mock("@neondatabase/serverless", () => ({
  neon: () => mockSql,
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn(() => Promise.resolve("hashed-password")),
  compare: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-id-123"),
}));

describe("Database Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Workspace Functions", () => {
    it("should create a workspace successfully", async () => {
      const mockWorkspace = {
        id: "test-id-123",
        slug: "test-id-123",
        title: "Test Workspace",
        description: "Test Description",
        user_id: "user-123",
        is_public: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSql.mockResolvedValue([mockWorkspace]);

      const result = await createWorkspace({
        title: "Test Workspace",
        description: "Test Description",
        user_id: "user-123",
        is_public: true,
      });

      expect(mockSql).toHaveBeenCalledOnce();
      expect(result).toEqual(mockWorkspace);
    });

    it("should get workspace by slug", async () => {
      const mockWorkspace = {
        id: "test-id-123",
        slug: "test-workspace",
        title: "Test Workspace",
      };

      mockSql.mockResolvedValue([mockWorkspace]);

      const result = await getWorkspace("test-workspace");

      expect(mockSql).toHaveBeenCalledOnce();
      expect(result).toEqual(mockWorkspace);
    });

    it("should get workspace by id", async () => {
      const mockWorkspace = {
        id: "test-id-123",
        slug: "test-workspace",
        title: "Test Workspace",
      };

      mockSql.mockResolvedValue([mockWorkspace]);

      const result = await getWorkspaceById("test-id-123");

      expect(mockSql).toHaveBeenCalledOnce();
      expect(result).toEqual(mockWorkspace);
    });

    it("should update workspace", async () => {
      const mockWorkspace = {
        id: "test-id-123",
        title: "Updated Title",
        description: "Updated Description",
      };

      mockSql.mockResolvedValue([mockWorkspace]);

      const result = await updateWorkspace("test-id-123", {
        title: "Updated Title",
        description: "Updated Description",
      });

      expect(mockSql).toHaveBeenCalledOnce();
      expect(result).toEqual(mockWorkspace);
    });

    it("should delete workspace", async () => {
      mockSql.mockResolvedValue([]);

      await deleteWorkspace("test-id-123", "user-123");

      expect(mockSql).toHaveBeenCalledOnce();
    });

    it("should verify workspace password", async () => {
      const mockWorkspace = {
        id: "test-id-123",
        slug: "test-workspace",
        password_hash: "hashed-password",
      };

      mockSql.mockResolvedValue([mockWorkspace]);

      const result = await verifyWorkspacePassword(
        "test-workspace",
        "password"
      );

      expect(result).toBe(true);
    });

    it("should get expired workspaces", async () => {
      const mockExpiredWorkspaces = [
        {
          id: "expired-1",
          slug: "expired-workspace-1",
          title: "Expired Workspace 1",
          expires_at: new Date(Date.now() - 86400000), // 1 day ago
        },
      ];

      mockSql.mockResolvedValue(mockExpiredWorkspaces);

      const result = await getExpiredWorkspaces();

      expect(mockSql).toHaveBeenCalledOnce();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("expired-1");
    });

    it("should get public workspaces", async () => {
      const mockPublicWorkspaces = [
        {
          id: "public-1",
          slug: "public-workspace-1",
          title: "Public Workspace 1",
          is_public: true,
          password_hash: null,
        },
      ];

      mockSql.mockResolvedValue(mockPublicWorkspaces);

      const result = await getPublicWorkspaces();

      expect(mockSql).toHaveBeenCalledOnce();
      expect(result).toHaveLength(1);
      expect(result[0].is_public).toBe(true);
    });
  });

  describe("Workspace File Functions", () => {
    it("should create a workspace file", async () => {
      const mockFile = {
        id: "test-id-123",
        workspace_id: "workspace-123",
        filename: "test.md",
        content: "# Test",
        file_type: "markdown",
        language: "markdown",
        order_index: 0,
      };

      mockSql.mockResolvedValue([mockFile]);

      const result = await createWorkspaceFile({
        workspace_id: "workspace-123",
        filename: "test.md",
        content: "# Test",
        file_type: "markdown",
        language: "markdown",
      });

      expect(mockSql).toHaveBeenCalledOnce();
      expect(result).toEqual(mockFile);
    });

    it("should get workspace files", async () => {
      const mockFiles = [
        {
          id: "file-1",
          workspace_id: "workspace-123",
          filename: "test1.md",
          content: "# Test 1",
          file_type: "markdown",
          order_index: 0,
        },
        {
          id: "file-2",
          workspace_id: "workspace-123",
          filename: "test2.js",
          content: 'console.log("Hello");',
          file_type: "code",
          order_index: 1,
        },
      ];

      mockSql.mockResolvedValue(mockFiles);

      const result = await getWorkspaceFiles("workspace-123");

      expect(mockSql).toHaveBeenCalledOnce();
      expect(result).toHaveLength(2);
    });

    it("should update workspace file", async () => {
      const mockFile = {
        id: "file-1",
        filename: "updated.md",
        content: "# Updated Content",
      };

      mockSql.mockResolvedValue([mockFile]);

      const result = await updateWorkspaceFile("file-1", {
        filename: "updated.md",
        content: "# Updated Content",
      });

      expect(mockSql).toHaveBeenCalledOnce();
      expect(result).toEqual(mockFile);
    });

    it("should delete workspace file", async () => {
      mockSql.mockResolvedValue([]);

      await deleteWorkspaceFile("file-1");

      expect(mockSql).toHaveBeenCalledOnce();
    });
  });

  describe("Analytics Functions", () => {
    it("should record workspace view", async () => {
      mockSql.mockResolvedValue([]);

      await recordWorkspaceView("workspace-123", "192.168.1.1", "Mozilla/5.0");

      expect(mockSql).toHaveBeenCalledOnce();
    });
  });
});
