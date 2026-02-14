const Environment = {
  Sandbox: 'Sandbox',
  Production: 'Production',
};

class Client {
  constructor(config = {}) {
    this.config = config;
  }
}

class OrdersController {
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

module.exports = {
  Environment,
  Client,
  OrdersController,
};
