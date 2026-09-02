import { randomUUID } from "crypto";
import { getSquare } from "./square";

export async function findCustomerByPhone(phone: string) {
  const square = getSquare();

  const response = await square.customers.search({
    query: {
      filter: {
        phoneNumber: { exact: phone },
      },
    },
  });

  const customers = response?.customers || [];
  return customers[0] || null;
}

export async function createSquareCustomer(data: {
  phone: string;
  givenName?: string;
}) {
  const square = getSquare();

  const response = await square.customers.create({
    phoneNumber: data.phone,
    givenName: data.givenName,
  });

  return response?.customer || null;
}

export async function getSquareCustomer(customerId: string) {
  const square = getSquare();

  const response = await square.customers.get({ customerId });
  return response?.customer || null;
}

/** Find a Square customer by exact email address, or create one. Returns the customer ID. */
export async function findOrCreateCustomerByEmail(data: {
  name: string;
  email: string;
  phone: string;
}): Promise<string> {
  const square = getSquare();

  const searchResult = await square.customers.search({
    query: {
      filter: {
        emailAddress: { exact: data.email },
      },
    },
  });

  const existingId = searchResult.customers?.[0]?.id;
  if (existingId) return existingId;

  const createResult = await square.customers.create({
    idempotencyKey: randomUUID(),
    givenName: data.name.split(" ")[0],
    familyName: data.name.split(" ").slice(1).join(" ") || undefined,
    emailAddress: data.email,
    phoneNumber: data.phone,
  });

  const id = createResult.customer?.id;
  if (!id) throw new Error("Square did not return a customer ID");
  return id;
}
