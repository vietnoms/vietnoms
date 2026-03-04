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
