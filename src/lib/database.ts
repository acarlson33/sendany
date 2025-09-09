import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const sql = neon(process.env.DATABASE_URL!);

export interface Workspace {
  id: string;
  title: string;
  slug: string;
  user_id: string | null;
  is_public: boolean;
  password_hash: string | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  name: string;
  content: string;
  language: string;
  type: "text" | "upload";
  file_order: number;
  google_drive_file_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceView {
  id: string;
  workspace_id: string;
  ip_address: string;
  user_agent: string | null;
  viewed_at: Date;
}

// Workspace operations
export async function createWorkspace(data: {
  title: string;
  slug?: string;
  user_id?: string | null;
  is_public?: boolean;
  password?: string;
  expires_at?: Date | null;
}): Promise<Workspace> {
  const id = nanoid();
  const slug = data.slug || nanoid(8);
  const password_hash = data.password
    ? await bcrypt.hash(data.password, 10)
    : null;

  const result = await sql`
    INSERT INTO workspaces (id, title, slug, user_id, is_public, password_hash, expires_at)
    VALUES (${id}, ${data.title}, ${slug}, ${data.user_id || null}, ${
    data.is_public || true
  }, ${password_hash}, ${data.expires_at || null})
    RETURNING *
  `;

  return result[0] as Workspace;
}

export async function getWorkspaceBySlug(
  slug: string
): Promise<Workspace | null> {
  const result = await sql`
    SELECT * FROM workspaces WHERE slug = ${slug} AND (expires_at IS NULL OR expires_at > NOW())
  `;

  return (result[0] as Workspace) || null;
}

export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const result = await sql`
    SELECT * FROM workspaces WHERE id = ${id}
  `;

  return (result[0] as Workspace) || null;
}

export async function updateWorkspace(
  id: string,
  data: Partial<Omit<Workspace, "id" | "created_at" | "updated_at">>
): Promise<Workspace | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }

  if (data.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}`);
    values.push(data.slug);
  }

  if (data.is_public !== undefined) {
    updates.push(`is_public = $${paramIndex++}`);
    values.push(data.is_public);
  }

  if (data.password_hash !== undefined) {
    updates.push(`password_hash = $${paramIndex++}`);
    values.push(data.password_hash);
  }

  if (data.expires_at !== undefined) {
    updates.push(`expires_at = $${paramIndex++}`);
    values.push(data.expires_at);
  }

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);
  values.push(id);

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);

  // Use template literal with sql function
  const setClauses = updates.join(", ");
  const result = await sql`
    UPDATE workspaces 
    SET ${sql.unsafe(setClauses)}
    WHERE id = ${id}
    RETURNING *
  `;

  return (result[0] as Workspace) || null;
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM workspaces WHERE id = ${id}
  `;

  return (result as any).rowCount > 0;
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const result = await sql`
    SELECT * FROM workspaces 
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;

  return result as Workspace[];
}

export async function verifyWorkspacePassword(
  workspace: Workspace,
  password: string
): Promise<boolean> {
  if (!workspace.password_hash) return true;
  return await bcrypt.compare(password, workspace.password_hash);
}

// File operations
export async function createWorkspaceFile(data: {
  workspace_id: string;
  name: string;
  content: string;
  language?: string;
  type?: "text" | "upload";
  google_drive_file_id?: string | null;
}): Promise<WorkspaceFile> {
  const id = nanoid();

  // Get the next file order
  const orderResult = await sql`
    SELECT COALESCE(MAX(file_order), 0) + 1 as next_order 
    FROM workspace_files 
    WHERE workspace_id = ${data.workspace_id}
  `;
  const file_order = orderResult[0].next_order;

  const result = await sql`
    INSERT INTO workspace_files (id, workspace_id, name, content, language, type, file_order, google_drive_file_id)
    VALUES (${id}, ${data.workspace_id}, ${data.name}, ${data.content}, ${
    data.language || "text"
  }, ${data.type || "text"}, ${file_order}, ${
    data.google_drive_file_id || null
  })
    RETURNING *
  `;

  return result[0] as WorkspaceFile;
}

export async function getWorkspaceFiles(
  workspaceId: string
): Promise<WorkspaceFile[]> {
  const result = await sql`
    SELECT * FROM workspace_files 
    WHERE workspace_id = ${workspaceId}
    ORDER BY file_order ASC
  `;

  return result as WorkspaceFile[];
}

export async function updateWorkspaceFile(
  id: string,
  data: Partial<
    Omit<WorkspaceFile, "id" | "workspace_id" | "created_at" | "updated_at">
  >
): Promise<WorkspaceFile | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }

  if (data.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    values.push(data.content);
  }

  if (data.language !== undefined) {
    updates.push(`language = $${paramIndex++}`);
    values.push(data.language);
  }

  if (data.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(data.type);
  }

  if (data.file_order !== undefined) {
    updates.push(`file_order = $${paramIndex++}`);
    values.push(data.file_order);
  }

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);
  values.push(id);

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);

  // Use template literal with sql function
  const setClauses = updates.join(", ");
  const result = await sql`
    UPDATE workspace_files 
    SET ${sql.unsafe(setClauses)}
    WHERE id = ${id}
    RETURNING *
  `;

  return (result[0] as WorkspaceFile) || null;
}

export async function deleteWorkspaceFile(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM workspace_files WHERE id = ${id}
  `;

  return (result as any).rowCount > 0;
}

export async function deleteWorkspaceFiles(
  workspaceId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM workspace_files WHERE workspace_id = ${workspaceId}
  `;

  return (result as any).rowCount >= 0;
}

// View tracking
export async function recordWorkspaceView(data: {
  workspace_id: string;
  ip_address: string;
  user_agent?: string | null;
}): Promise<WorkspaceView> {
  const id = nanoid();

  const result = await sql`
    INSERT INTO workspace_views (id, workspace_id, ip_address, user_agent)
    VALUES (${id}, ${data.workspace_id}, ${data.ip_address}, ${
    data.user_agent || null
  })
    RETURNING *
  `;

  return result[0] as WorkspaceView;
}

export async function getWorkspaceViews(
  workspaceId: string
): Promise<WorkspaceView[]> {
  const result = await sql`
    SELECT * FROM workspace_views 
    WHERE workspace_id = ${workspaceId}
    ORDER BY viewed_at DESC
  `;

  return result as WorkspaceView[];
}

// Cleanup operations
export async function getExpiredWorkspaces(): Promise<Workspace[]> {
  const result = await sql`
    SELECT * FROM workspaces 
    WHERE expires_at IS NOT NULL AND expires_at <= NOW()
  `;

  return result as Workspace[];
}

export async function cleanupExpiredWorkspaces(): Promise<number> {
  const expiredWorkspaces = await getExpiredWorkspaces();

  for (const workspace of expiredWorkspaces) {
    await deleteWorkspaceFiles(workspace.id);
    await sql`DELETE FROM workspace_views WHERE workspace_id = ${workspace.id}`;
    await deleteWorkspace(workspace.id);
  }

  return expiredWorkspaces.length;
}
