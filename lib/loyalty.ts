import { getSquare, LOCATION_ID } from "./square";
import crypto from "crypto";

export async function getLoyaltyProgram() {
  try {
    const square = getSquare();
    const response = await square.loyalty.programs.list();
    const programs = response?.programs || [];
    const program = programs[0];
    if (!program) return null;

    return {
      id: program.id,
      rewardTiers: (program.rewardTiers || []).map((tier: any) => ({
        id: tier.id || "",
        name: tier.name || "",
        points: Number(tier.points) || 0,
      })),
      terminologyOne: program.terminology?.one || "point",
      terminologyOther: program.terminology?.other || "points",
    };
  } catch {
    // Loyalty program not active
    return null;
  }
}

export async function getLoyaltyAccount(customerId: string) {
  try {
    const square = getSquare();
    const response = await square.loyalty.accounts.search({
      query: {
        customerIds: [customerId],
      },
    });

    const accounts = response?.loyaltyAccounts || [];
    const account = accounts[0];
    if (!account) return null;

    return {
      id: account.id || "",
      balance: Number(account.balance) || 0,
      lifetimePoints: Number(account.lifetimePoints) || 0,
      customerId: account.customerId || "",
    };
  } catch {
    return null;
  }
}

export async function calculatePoints(programId: string, orderId: string, loyaltyAccountId: string) {
  try {
    const square = getSquare();
    const response = await square.loyalty.programs.calculate({
      programId,
      orderId,
      loyaltyAccountId,
    });
    return Number(response?.points) || 0;
  } catch {
    return 0;
  }
}

export async function createLoyaltyAccount(programId: string, phoneNumber: string) {
  try {
    const square = getSquare();
    const response = await square.loyalty.accounts.create({
      loyaltyAccount: {
        programId,
        mapping: { phoneNumber },
      },
      idempotencyKey: crypto.randomUUID(),
    });
    return response?.loyaltyAccount || null;
  } catch (error) {
    console.error("Failed to create loyalty account:", error);
    return null;
  }
}

export async function accumulateLoyaltyPoints(customerId: string, orderId: string, phoneNumber?: string) {
  try {
    const square = getSquare();

    // Look up existing loyalty account, or auto-enroll if phone is available
    let account = await getLoyaltyAccount(customerId);
    if (!account?.id && phoneNumber) {
      const program = await getLoyaltyProgram();
      if (program?.id) {
        const newAccount = await createLoyaltyAccount(program.id, phoneNumber);
        if (newAccount?.id) {
          account = {
            id: newAccount.id,
            balance: 0,
            lifetimePoints: 0,
            customerId,
          };
        }
      }
    }
    if (!account?.id) return null;

    const response = await square.loyalty.accounts.accumulatePoints({
      accountId: account.id,
      accumulatePoints: {
        orderId,
      },
      locationId: LOCATION_ID,
      idempotencyKey: crypto.randomUUID(),
    });

    return response?.event || null;
  } catch (error) {
    console.error("Failed to accumulate loyalty points:", error);
    return null;
  }
}

export async function createReward(loyaltyAccountId: string, rewardTierId: string) {
  try {
    const square = getSquare();
    const response = await square.loyalty.rewards.create({
      reward: {
        loyaltyAccountId,
        rewardTierId,
      },
      idempotencyKey: crypto.randomUUID(),
    });
    return response?.reward || null;
  } catch (error) {
    console.error("Failed to create reward:", error);
    return null;
  }
}
