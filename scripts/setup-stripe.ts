import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

const plans = [
  { name: "PulseTrack Starter", price: 900, lookup: "starter_monthly" },
  { name: "PulseTrack Growth", price: 2900, lookup: "growth_monthly" },
  { name: "PulseTrack Business", price: 7900, lookup: "business_monthly" },
];

async function setup() {
  console.log("Creating Stripe products and prices...\n");

  for (const plan of plans) {
    // Create product
    const product = await stripe.products.create({
      name: plan.name,
      metadata: { app: "pulsetrack" },
    });

    // Create monthly price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: "eur",
      recurring: { interval: "month" },
      lookup_key: plan.lookup,
    });

    console.log(`✅ ${plan.name}`);
    console.log(`   Product: ${product.id}`);
    console.log(`   Price:   ${price.id} (${plan.price / 100}€/mois)\n`);
  }

  console.log("Done! Add the price IDs to your .env.local:");
  console.log("STRIPE_PRICE_STARTER=price_xxx");
  console.log("STRIPE_PRICE_GROWTH=price_xxx");
  console.log("STRIPE_PRICE_BUSINESS=price_xxx");
}

setup().catch(console.error);
