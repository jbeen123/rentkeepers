/**
 * Stripe Payment Service
 * Handles autopay setup, recurring payments, and payment processing
 * 
 * No Stripe account? Get free test mode at: https://stripe.com
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

/**
 * Create a customer in Stripe
 */
async function createCustomer({ email, name, phone }) {
  const customer = await stripe.customers.create({
    email,
    name,
    phone,
    metadata: {
      source: 'rentkeepers'
    }
  });

  console.log(`✅ Stripe customer created: ${customer.id}`);
  return customer;
}

/**
 * Create a payment method from setup intent
 */
async function createSetupIntent(customerId) {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session'
  });

  console.log(`✅ Setup intent created: ${setupIntent.id}`);
  return setupIntent;
}

/**
 * Attach payment method to customer
 */
async function attachPaymentMethod(paymentMethodId, customerId) {
  const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });

  console.log(`✅ Payment method attached: ${paymentMethod.id}`);
  return paymentMethod;
}

/**
 * Set default payment method for customer
 */
async function setDefaultPaymentMethod(customerId, paymentMethodId) {
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId
    }
  });

  console.log(`✅ Default payment method set for customer: ${customerId}`);
}

/**
 * Create autopay subscription for recurring rent
 */
async function createAutoplaySubscription({
  customerId,
  amount,
  currency = 'usd',
  interval = 'month',
  startDate,
  description = 'Monthly Rent'
}) {
  // Create a price for the subscription
  const price = await stripe.prices.create({
    unit_amount: amount, // Amount in cents
    currency,
    recurring: {
      interval,
      interval_count: 1
    },
    product_data: {
      name: description
    }
  });

  // Create the subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: price.id }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent']
  });

  console.log(`✅ Autoplay subscription created: ${subscription.id}`);
  return subscription;
}

/**
 * Process one-time payment
 */
async function createPaymentIntent({
  customerId,
  amount,
  currency = 'usd',
  description = 'Rent Payment',
  metadata = {}
}) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    description,
    metadata: {
      source: 'rentkeepers',
      ...metadata
    },
    automatic_payment_methods: {
      enabled: true
    }
  });

  console.log(`✅ Payment intent created: ${paymentIntent.id}`);
  return paymentIntent;
}

/**
 * Get customer's payment methods
 */
async function getPaymentMethods(customerId) {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card'
  });

  return paymentMethods.data.map(pm => ({
    id: pm.id,
    brand: pm.card.brand,
    last4: pm.card.last4,
    expMonth: pm.card.exp_month,
    expYear: pm.card.exp_year,
    isDefault: pm.id === pm.customer?.invoice_settings?.default_payment_method
  }));
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  console.log(`✅ Subscription cancelled: ${subscriptionId}`);
  return subscription;
}

/**
 * Get subscription details
 */
async function getSubscription(subscriptionId) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    amount: subscription.items.data[0]?.price?.unit_amount,
    currency: subscription.items.data[0]?.price?.currency,
    interval: subscription.items.data[0]?.price?.recurring?.interval
  };
}

/**
 * List customer subscriptions
 */
async function listSubscriptions(customerId) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all'
  });

  return subscriptions.data.map(sub => ({
    id: sub.id,
    status: sub.status,
    amount: sub.items.data[0]?.price?.unit_amount,
    currency: sub.items.data[0]?.price?.currency,
    interval: sub.items.data[0]?.price?.recurring?.interval,
    currentPeriodEnd: new Date(sub.current_period_end * 1000)
  }));
}

/**
 * Process refund
 */
async function refundPayment(paymentIntentId, amount = null) {
  const refundParams = { payment_intent: paymentIntentId };
  if (amount) {
    refundParams.amount = amount;
  }

  const refund = await stripe.refunds.create(refundParams);
  console.log(`✅ Refund processed: ${refund.id}`);
  return refund;
}

/**
 * Create invoice for manual payment
 */
async function createInvoice({
  customerId,
  amount,
  currency = 'usd',
  description = 'Rent Invoice',
  dueDate
}) {
  const invoice = await stripe.invoices.create({
    customer: customerId,
    currency,
    description,
    due_date: dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : null,
    auto_advance: false
  });

  // Add line item
  await stripe.invoiceItems.create({
    customer: customerId,
    amount,
    currency,
    description,
    invoice: invoice.id
  });

  // Finalize invoice
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

  console.log(`✅ Invoice created: ${finalizedInvoice.id}`);
  return finalizedInvoice;
}

/**
 * Send invoice to customer
 */
async function sendInvoice(invoiceId) {
  const invoice = await stripe.invoices.sendInvoice(invoiceId);
  console.log(`✅ Invoice sent: ${invoiceId}`);
  return invoice;
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, endpointSecret) {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    return event;
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    throw error;
  }
}

/**
 * Handle webhook events
 */
async function handleWebhookEvent(event) {
  console.log(`📧 Webhook event received: ${event.type}`);

  switch (event.type) {
    case 'invoice.paid':
      const invoice = event.data.object;
      console.log(`✅ Invoice paid: ${invoice.id}`);
      // Update payment record in database
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      console.log(`❌ Invoice payment failed: ${failedInvoice.id}`);
      // Notify tenant, apply late fee logic
      break;

    case 'customer.subscription.updated':
      const subscription = event.data.object;
      console.log(`📝 Subscription updated: ${subscription.id}`);
      // Update subscription status in database
      break;

    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
      // Record successful payment
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log(`❌ Payment failed: ${failedPayment.id}`);
      // Notify tenant, retry logic
      break;

    default:
      console.log(`ℹ️  Unhandled event type: ${event.type}`);
  }

  return { received: true };
}

module.exports = {
  createCustomer,
  createSetupIntent,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  createAutoplaySubscription,
  createPaymentIntent,
  getPaymentMethods,
  cancelSubscription,
  getSubscription,
  listSubscriptions,
  refundPayment,
  createInvoice,
  sendInvoice,
  verifyWebhookSignature,
  handleWebhookEvent,
  stripe
};
