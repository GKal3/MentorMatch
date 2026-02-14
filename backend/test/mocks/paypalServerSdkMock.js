export const Environment = {
  Sandbox: 'Sandbox',
  Production: 'Production',
};

export class Client {
  constructor(config = {}) {
    this.config = config;
  }
}

export class OrdersController {
  constructor(client) {
    this.client = client;
  }

  async createOrder() {
    return {
      result: {
        id: 'MOCK-PAYPAL-ORDER-ID',
        status: 'CREATED',
        links: [{ rel: 'approve', href: 'https://example.test/paypal/approve' }],
      },
    };
  }

  async captureOrder() {
    return {
      result: {
        id: 'MOCK-PAYPAL-CAPTURE-ID',
        status: 'COMPLETED',
      },
    };
  }
}

export default {
  Client,
  Environment,
  OrdersController,
};