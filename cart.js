const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const stripe = require('stripe')('YOUR_STRIPE_SECRET_KEY'); // Replace with your actual Stripe Secret Key
const cors = require('cors'); // You might need this for local development

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve the HTML file from a 'public' folder

// --- MongoDB Connection ---
// Replace with your MongoDB connection string
const mongoURI = 'mongodb://localhost:27017/';

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// --- Mongoose Schemas ---
const cartItemSchema = new mongoose.Schema({
    productId: Number,
    quantity: Number
});

const cartSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    items: [cartItemSchema]
});

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: [cartItemSchema],
    shippingDetails: Object,
    total: Number,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);

// --- API Routes ---

// GET /api/cart/:userId - Fetch the cart for a user
app.get('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = { userId, items: [] }; // Return an empty cart if not found
        }
        res.status(200).json(cart.items);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// POST /api/cart - Add or update an item in the cart
app.post('/api/cart', async (req, res) => {
    const { userId, productId, quantity } = req.body;
    try {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }
        
        const itemIndex = cart.items.findIndex(item => item.productId === productId);
        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
        } else {
            cart.items.push({ productId, quantity });
        }
        
        await cart.save();
        res.status(200).send('Cart updated');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// DELETE /api/cart/:userId/:productId - Remove an item from the cart
app.delete('/api/cart/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;
    try {
        const cart = await Cart.findOne({ userId });
        if (cart) {
            cart.items = cart.items.filter(item => item.productId !== parseInt(productId));
            await cart.save();
        }
        res.status(200).send('Item removed');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// POST /api/create-payment-intent - Stripe payment intent
app.post('/api/create-payment-intent', async (req, res) => {
    const { total } = req.body;
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(total * 100), // Stripe expects amount in cents
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
        });
        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/orders - Save a new order
app.post('/api/orders', async (req, res) => {
    const { userId, cartItems, shippingDetails, total } = req.body;
    try {
        const order = new Order({ userId, items: cartItems, shippingDetails, total });
        await order.save();
        // Clear the user's cart after the order is placed
        await Cart.deleteOne({ userId });
        res.status(200).send('Order placed successfully!');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
