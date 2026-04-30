const express = require('express');
const router = express.Router();
const stripeService = require('./stripe-service');

/**
 * GET /api/stripe/health
 * Check Stripe connection
 */
router.get('/health', async (req, res) => {
  try {
    // Test Stripe connection by listing customers
    await stripeService.stripe.customers.list({ limit: 1 });
    res.json({
      success: true,
      connected: true,
      message: 'Stripe connected successfully'
    });
  } catch (error) {
    res.json({
      success: false,
      connected: false,
      message: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env',
      error: error.message
    });
  }
});

/**
 * POST /api/stripe/customer
 * Create a new customer
 */
router.post('/customer', async (req, res) => {
  try {
    const { email, name, phone } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const customer = await stripeService.createCustomer({ email, name, phone });
    
    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/setup-intent
 * Create setup intent for saving payment method
 */
router.post('/setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }

    const setupIntent = await stripeService.createSetupIntent(customerId);
    
    res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/attach-payment-method
 * Attach payment method to customer
 */
router.post('/attach-payment-method', async (req, res) => {
  try {
    const { paymentMethodId, customerId, setAsDefault } = req.body;

    if (!paymentMethodId || !customerId) {
      return res.status(400).json({ error: 'Payment method ID and customer ID required' });
    }

    await stripeService.attachPaymentMethod(paymentMethodId, customerId);
    
    if (setAsDefault) {
      await stripeService.setDefaultPaymentMethod(customerId, paymentMethodId);
    }

    res.json({
      success: true,
      message: 'Payment method attached successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/autopay/setup
 * Setup autopay subscription for recurring rent
 */
router.post('/autopay/setup', async (req, res) => {
  try {
    const {
      customerId,
      amount,
      currency = 'usd',
      interval = 'month',
      startDate,
      description = 'Monthly Rent'
    } = req.body;

    if (!customerId || !amount) {
      return res.status(400).json({ error: 'Customer ID and amount required' });
    }

    const subscription = await stripeService.createAutoplaySubscription({
      customerId,
      amount,
      currency,
      interval,
      startDate,
      description
    });

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
      },
      message: 'Autoplay subscription created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/payment
 * Process one-time payment
 */
router.post('/payment', async (req, res) => {
  try {
    const {
      customerId,
      amount,
      currency = 'usd',
      description = 'Rent Payment',
      metadata = {}
    } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount required' });
    }

    const paymentIntent = await stripeService.createPaymentIntent({
      customerId,
      amount,
      currency,
      description,
      metadata
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      message: 'Payment intent created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stripe/payment-methods/:customerId
 * Get customer's saved payment methods
 */
router.get('/payment-methods/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const paymentMethods = await stripeService.getPaymentMethods(customerId);
    
    res.json({
      success: true,
      paymentMethods
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stripe/subscriptions/:customerId
 * List customer subscriptions
 */
router.get('/subscriptions/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const subscriptions = await stripeService.listSubscriptions(customerId);
    
    res.json({
      success: true,
      subscriptions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/stripe/subscription/:subscriptionId
 * Cancel subscription
 */
router.delete('/subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    await stripeService.cancelSubscription(subscriptionId);
    
    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/invoice
 * Create and send invoice
 */
router.post('/invoice', async (req, res) => {
  try {
    const {
      customerId,
      amount,
      currency = 'usd',
      description = 'Rent Invoice',
      dueDate,
      send = true
    } = req.body;

    if (!customerId || !amount) {
      return res.status(400).json({ error: 'Customer ID and amount required' });
    }

    const invoice = await stripeService.createInvoice({
      customerId,
      amount,
      currency,
      description,
      dueDate
    });

    if (send) {
      await stripeService.sendInvoice(invoice.id);
    }

    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        amountDue: invoice.amount_due,
        dueDate: invoice.due_date
      },
      message: 'Invoice created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/refund
 * Process refund
 */
router.post('/refund', async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID required' });
    }

    const refund = await stripeService.refundPayment(paymentIntentId, amount);
    
    res.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status
      },
      message: 'Refund processed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const event = stripeService.verifyWebhookSignature(req.body, sig, endpointSecret);
    await stripeService.handleWebhookEvent(event);

    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/stripe/test-mode
 * Check if in test mode
 */
router.get('/test-mode', (req, res) => {
  const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
  
  res.json({
    success: true,
    testMode: isTestMode,
    message: isTestMode ? '✅ Running in TEST mode' : '⚠️ Running in LIVE mode',
    keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...'
  });
});

module.exports = router;
