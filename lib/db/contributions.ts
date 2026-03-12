import { getTurso } from "@/lib/turso";
import crypto from "crypto";

export interface ContributionRow {
  id: number;
  token: string;
  giftCardId: string;
  giftCardGan: string;
  organizerName: string;
  organizerEmail: string;
  recipientName: string;
  suggestedAmount: number | null;
  message: string | null;
  status: string;
  createdAt: string;
}

export interface InviteRow {
  id: number;
  contributionId: number;
  inviteeEmail: string;
  invitedAt: string;
  contributedAt: string | null;
  amount: number | null;
  squarePaymentId: string | null;
}

function mapContribution(row: Record<string, unknown>): ContributionRow {
  return {
    id: Number(row.id),
    token: row.token as string,
    giftCardId: row.gift_card_id as string,
    giftCardGan: row.gift_card_gan as string,
    organizerName: row.organizer_name as string,
    organizerEmail: row.organizer_email as string,
    recipientName: row.recipient_name as string,
    suggestedAmount: row.suggested_amount != null ? Number(row.suggested_amount) : null,
    message: (row.message as string) || null,
    status: row.status as string,
    createdAt: row.created_at as string,
  };
}

function mapInvite(row: Record<string, unknown>): InviteRow {
  return {
    id: Number(row.id),
    contributionId: Number(row.contribution_id),
    inviteeEmail: row.invitee_email as string,
    invitedAt: row.invited_at as string,
    contributedAt: (row.contributed_at as string) || null,
    amount: row.amount != null ? Number(row.amount) : null,
    squarePaymentId: (row.square_payment_id as string) || null,
  };
}

export async function createContribution(input: {
  giftCardId: string;
  giftCardGan: string;
  organizerName: string;
  organizerEmail: string;
  recipientName: string;
  suggestedAmount?: number;
  message?: string;
}): Promise<{ id: number; token: string }> {
  const db = getTurso();
  const token = crypto.randomUUID();
  const result = await db.execute({
    sql: `INSERT INTO gift_card_contributions
          (token, gift_card_id, gift_card_gan, organizer_name, organizer_email,
           recipient_name, suggested_amount, message)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      token,
      input.giftCardId,
      input.giftCardGan,
      input.organizerName,
      input.organizerEmail,
      input.recipientName,
      input.suggestedAmount ?? null,
      input.message ?? null,
    ],
  });
  return { id: Number(result.lastInsertRowid), token };
}

export async function getContributionByToken(
  token: string
): Promise<ContributionRow | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM gift_card_contributions WHERE token = ?",
    args: [token],
  });
  if (result.rows.length === 0) return null;
  return mapContribution(result.rows[0] as unknown as Record<string, unknown>);
}

export async function createInvite(
  contributionId: number,
  email: string
): Promise<{ id: number }> {
  const db = getTurso();
  const result = await db.execute({
    sql: "INSERT INTO contribution_invites (contribution_id, invitee_email) VALUES (?, ?)",
    args: [contributionId, email],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function markInviteContributed(
  contributionId: number,
  email: string,
  amount: number,
  paymentId: string
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `UPDATE contribution_invites
          SET contributed_at = datetime('now'), amount = ?, square_payment_id = ?
          WHERE contribution_id = ? AND invitee_email = ? AND contributed_at IS NULL`,
    args: [amount, paymentId, contributionId, email],
  });
}

export async function getInvitesByContribution(
  contributionId: number
): Promise<InviteRow[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM contribution_invites WHERE contribution_id = ? ORDER BY invited_at",
    args: [contributionId],
  });
  return result.rows.map((row) =>
    mapInvite(row as unknown as Record<string, unknown>)
  );
}
