const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const axios = require('axios');
const moment = require('moment-timezone');





app.use(cors());
app.use(bodyParser.json());




const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ujcbv.mongodb.net`,
  { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } }
);

const upload = multer({ storage: multer.memoryStorage() });

client.connect().then(() => console.log("Connected to MongoDB")).catch(console.error);

const getDbCollection = () => client.db("better_ecom").collection('products');
const categoryDbCollection = () => client.db("better_ecom").collection('categories');


// Route to add categories with images
app.post('/addcategories', upload.single('image'), async (req, res) => {
  const { name } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded' });
  }

  try {
    // Upload image to ImgBB
    const formData = new FormData();
    formData.append('image', req.file.buffer.toString('base64'));
    const response = await fetch('https://api.imgbb.com/1/upload?key=709857af4158efc43859168f6daa2479', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    const imageUrl = data.data.url;

    // Prepare category data
    const category = {
      name,
      imageUrl,
      created_time: new Date()
    };

    // Insert category into MongoDB
    const collection = await categoryDbCollection();
    const result = await collection.insertOne(category);
    res.status(201).json({ message: 'Category added successfully', categoryId: result.insertedId });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Failed to add category' });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const collection = await categoryDbCollection ('categories');
    const categories = await collection.find({}).toArray();
    res.status(200).json(categories);
  } catch (err) {
    console.error('Error getting categories:', err);
    res.status(500).json({ message: 'Failed to retrieve categories' });
  }
});
// // PATCH route to update a category by ID
// app.patch('/categories/:id', upload.single('image'), async (req, res) => {
//   const { id } = req.params;
//   const { name } = req.body;

//   try {
//     await client.connect();
//     const collection = client.db("better_ecom").collection('categories');

//     // Check if category exists
//     const category = await collection.findOne({ _id: new ObjectId(id) });
//     if (!category) {
//       return res.status(404).send('Category not found');
//     }

//     let imgURL = category.img;

//     // Handle image upload if a new image is provided
//     if (req.file) {
//       const imgBBResponse = await axios.post('https://api.imgbb.com/1/upload', {
//         key: '709857af4158efc43859168f6daa2479',
//         image: req.file.buffer.toString('base64'),
//       });
//       imgURL = imgBBResponse.data.data.url;
//     }

//     // Perform the update operation
//     const updateResult = await collection.updateOne(
//       { _id: new ObjectId(id) },
//       {
//         $set: {
//           name: name,
//           img: imgURL,
//           updated_time: new Date(),
//         },
//       }
//     );

//     // Check if the update was successful
//     if (updateResult.matchedCount === 1) {
//       // Fetch the updated category
//       const updatedCategory = await collection.findOne({ _id: new ObjectId(id) });
//       res.json({ category: updatedCategory });
//     } else {
//       res.status(500).send('Failed to update category');
//     }
//   } catch (err) {
//     console.error('Error updating category:', err);
//     res.status(500).send('Error updating category');
//   } finally {
//     await client.close();
//   }
// });

// Route to delete a category by ID
app.delete('/categories/:id', async (req, res) => {
  const categoryId = req.params.id;
  try {
    const collection = client.db("better_ecom").collection('categories');
    const result = await collection.deleteOne({ _id: new ObjectId(categoryId) });
    if (result.deletedCount === 1) {
      res.status(200).json({ message: "category deleted successfully" });
    } else {
      res.status(404).json({ message: "category not found" });
    }
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ message: "Failed to delete category", error: err.message });
  }
});

// Get all subcategories
// Add a new subcategory and associate it with a category
app.post('/subcategories', async (req, res) => {
  const { name, category } = req.body;
  try {
    const collection = client.db("better_ecom").collection('subcategories');
    const newSubcategory = { name, category, created_time: new Date() };
    const result = await collection.insertOne(newSubcategory);
    if (result.acknowledged) {
      res.status(201).json({ message: "Subcategory added successfully", subcategory: newSubcategory });
    } else {
      throw new Error("Failed to insert subcategory");
    }
  } catch (err) {
    console.error("Error adding subcategory:", err);
    res.status(500).json({ message: "Failed to add subcategory", error: err.message });
  }
});


app.get('/subcategories', async (req, res) => {
  try {
    const collection = client.db("better_ecom").collection('subcategories');
    const subcategories = await collection.find({}).toArray();
    res.status(200).json(subcategories);
  } catch (err) {
    console.error("Error getting subcategories:", err);
    res.status(500).json({ message: "Failed to retrieve subcategories" });
  }
});

// Get subcategories by category
app.get('/subcategories/category/:category', async (req, res) => {
  const category = req.params.category;
  try {
    const collection = client.db("better_ecom").collection('subcategories');
    const subcategories = await collection.find({ category }).toArray();
    res.status(200).json(subcategories);
  } catch (err) {
    console.error("Error getting subcategories:", err);
    res.status(500).json({ message: "Failed to retrieve subcategories" });
  }
});



app.put('/subcategories/:id', async (req, res) => {
  const subcategoryId = req.params.id;
  const { name, category } = req.body;
  try {
    const collection = client.db("better_ecom").collection('subcategories');
    const result = await collection.updateOne(
      { _id: new ObjectId(subcategoryId) },
      { $set: { name, category, updated_time: new Date() } }
    );
    if (result.modifiedCount === 1) {
      const updatedSubcategory = await collection.findOne({ _id: new ObjectId(subcategoryId) });
      res.status(200).json({ message: "Subcategory updated successfully", subcategory: updatedSubcategory });
    } else {
      res.status(404).json({ message: "Subcategory not found" });
    }
  } catch (err) {
    console.error("Error updating subcategory:", err);
    res.status(500).json({ message: "Failed to update subcategory", error: err.message });
  }
});

// Delete an existing subcategory
app.delete('/subcategories/:id', async (req, res) => {
  const subcategoryId = req.params.id;
  try {
    const collection = client.db("better_ecom").collection('subcategories');
    const result = await collection.deleteOne({ _id: new ObjectId(subcategoryId) });
    if (result.deletedCount === 1) {
      res.status(200).json({ message: "Subcategory deleted successfully" });
    } else {
      res.status(404).json({ message: "Subcategory not found" });
    }
  } catch (err) {
    console.error("Error deleting subcategory:", err);
    res.status(500).json({ message: "Failed to delete subcategory", error: err.message });
  }
});




// app.post('/addproducts', async (req, res) => {
//   const { name, price, wholesalePrice, wholesaleQuantity, category, sku, barcode, stock, costPerUnit, storePrice, shortDescription, description, expirationDate, quantityType, images } = req.body;

//   if (!images || images.length === 0) {
//     return res.status(400).json({ message: 'No image URLs provided' });
//   }

//   const product = {
//     name,
//     price,
//     wholesalePrice,
//     wholesaleQuantity,
//     category,
//     sku,
//     barcode,
//     stock,
//     costPerUnit,
//     storePrice,
//     shortDescription,
//     description,
//     expirationDate,
//     quantityType,
//     images // URLs of uploaded images
//   };

//   try {
//     const collection = await getDbCollection();
//     const result = await collection.insertOne(product);
//     res.status(201).json({ message: 'Product added successfully', productId: result.insertedId });
//   } catch (error) {
//     console.error('Error adding product:', error);
//     res.status(500).json({ message: 'Failed to add product' });
//   }
// });

// Route to add categories with images
// app.post('/addcategories', upload.single('image'), async (req, res) => {
//   const { name } = req.body;

//   if (!req.file) {
//     return res.status(400).json({ message: 'No image file uploaded' });
//   }

//   try {
//     // Upload image to ImgBB
//     const formData = new FormData();
//     formData.append('image', req.file.buffer.toString('base64'));
//     const response = await fetch('https://api.imgbb.com/1/upload?key=709857af4158efc43859168f6daa2479', {
//       method: 'POST',
//       body: formData
//     });
//     const data = await response.json();
//     const img = data.data.url;

//     // Prepare category data
//     const category = {
//       name,
//       img,
//       created_time: new Date()
//     };

//     // Insert category into MongoDB
//     const collection = await categoryDbCollection();
//     const result = await collection.insertOne(category);
//     res.status(201).json({ message: 'Category added successfully', categoryId: result.insertedId });
//   } catch (error) {
//     console.error('Error adding category:', error);
//     res.status(500).json({ message: 'Failed to add category' });
//   }
// });
app.post('/addproducts', async (req, res) => {
  const { name, price, wholesalePrice, wholesaleQuantity, category, subcategory, sku, barcode, stock, costPerUnit, storePrice, shortDescription, description, expirationDate, quantityType, Pick, images } = req.body;

  if (!images || images.length === 0) {
    return res.status(400).json({ message: 'No image URLs provided' });
  }

  const product = {
    name,
    price,
    wholesalePrice,
    wholesaleQuantity,
    category,
    subcategory,
    sku,
    barcode,
    stock,
    costPerUnit,
    storePrice,
    shortDescription,
    description,
    expirationDate,
    quantityType,
    Pick,
    images, // URLs of uploaded images
    createdAt: moment().tz('Asia/Dhaka').format() // Timestamp of product addition in Bangladesh time
  };

  try {
    const collection = await getDbCollection();
    const result = await collection.insertOne(product);
    res.status(201).json({ message: 'Product added successfully', productId: result.insertedId });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Failed to add product' });
  }
});

//search by name
app.get('/products', async (req, res) => {
  try {
    const query = req.query.q || "";
    const collection = await getDbCollection();

    const products = await collection.find({
      name: { $regex: query, $options: 'i' } // Case-insensitive search
    }).toArray();

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// get products by category
app.get('/products/category/:category', async (req, res) => {
  let { category } = req.params;
  category = decodeURIComponent(category); // Decode the URL encoded category
  try {
    const collection = await getDbCollection(); // Replace with your database collection retrieval
    const products = await collection.find({ category: { $regex: new RegExp(category, 'i') } }).toArray();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});
// Get products by type
app.get('/products/type/:type', async (req, res) => {
  let { type } = req.params;
  type = decodeURIComponent(type); // Decode the URL encoded type
  try {
    const collection = await getDbCollection(); // Replace with your database collection retrieval
    const products = await collection.find({ type: { $regex: new RegExp(type, 'i') } }).toArray();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products by type:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});



// Get product by ID
app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const collection = getDbCollection();
    const product = await collection.findOne({ _id: new ObjectId(id) });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error.message);
    res.status(500).json({ message: 'Failed to fetch product', error: error.message });
  }
});

// Combined search and fetch products route
app.get('/products', async (req, res) => {
  try {
    const query = req.query.q || "";
    const collection = await getDbCollection();

    const products = await collection.find({
      name: { $regex: query, $options: 'i' } // Case-insensitive search
    }).toArray();

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const collection = await getDbCollection();
    await collection.deleteOne({ _id: new ObjectId(id) });
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});


// app.patch('/products/:id', async (req, res) => {
//   const { id } = req.params;
//   const updatedProduct = req.body;

//   try {
    
//     const collection = client.db("better_ecom").collection('products');
//     const result = await collection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: updatedProduct }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
//     res.json(product);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

// app.put('/products/:id', async (req, res) => {
//   const { id } = req.params;
//   const updatedProduct = req.body;

//   try {
//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({ message: 'Invalid product ID' });
//     }

//     const collection = client.db("better_ecom").collection('products');
//     const result = await collection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: updatedProduct }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     const product = await collection.findOne({ _id: new ObjectId(id) });
//     res.json(product);
//   } catch (err) {
//     console.error('Error updating product:', err.message);
//     res.status(500).json({ message: 'Failed to update product', error: err.message });
//   }
// });

app.patch('/products/:id', async (req, res) => {
  const { id } = req.params;
  let updatedProduct = req.body;

  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const collection = client.db("better_ecom").collection('products');
    const product = await collection.findOne({ _id: new ObjectId(id) });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if the createdAt field exists and handle accordingly
    if (!product.createdAt) {
      updatedProduct.createdAt = new Date();
    } else {
      updatedProduct.createdAt = new Date(product.createdAt); // Preserve the original createdAt
    }
    
    // Add or update the editedAt field with the current date and time
    updatedProduct.createdAt = new Date();

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedProduct }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updatedProductData = await collection.findOne({ _id: new ObjectId(id) });
    res.json(updatedProductData);
  } catch (err) {
    console.error('Error updating product:', err.message);
    res.status(500).json({ message: 'Failed to update product', error: err.message });
  }
});

// adding solde items to the data
app.post('/solditems', async (req, res) => {
  const soldItems = req.body; // Assuming the sold items are sent as an array
  try {
    const collection = client.db("better_ecom").collection('solditems');
    const result = await collection.insertMany(soldItems);
    if (result.acknowledged) {
      res.status(201).json({ message: "Sold items added successfully", soldItems: result.ops });
    } else {
      throw new Error("Failed to insert sold items");
    }
  } catch (err) {
    console.error("Error adding sold items:", err);
    res.status(500).json({ message: "Failed to add sold items", error: err.message });
  }
});

// Fetching sold items from the database
app.get('/solditems', async (req, res) => {
  try {
    const collection = client.db("better_ecom").collection('solditems');
    const soldItems = await collection.find().toArray();
    res.status(200).json(soldItems);
  } catch (err) {
    console.error("Error fetching sold items:", err);
    res.status(500).json({ message: "Failed to fetch sold items", error: err.message });
  }
});



app.post('/addorders', async (req, res) => {
  try {
    const order = req.body;
    const collection = client.db("better_ecom").collection('orders');
    const result = await collection.insertOne(order);

    if (result.acknowledged) {
      res.status(201).json({ message: 'Order created successfully', orderId: result.insertedId });
    } else {
      res.status(500).json({ message: "Failed to create order" });
    }
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ message: "Failed to create order", error: err.message });
  }
});



// Order Routes
app.get('/orders', async (req, res) => {
  try {
    const collection = client.db("better_ecom").collection('orders');
    const orders = await collection.find({}).toArray();
    res.status(200).json(orders);
  } catch (err) {
    console.error("Error getting orders:", err);
    res.status(500).json({ message: "Failed to retrieve orders" });
  }
});
//fetch orders by id
app.get('/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const collection = client.db("better_ecom").collection('orders');
    const order = await collection.findOne({ order_id: orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (err) {
    console.error("Error getting order:", err);
    res.status(500).json({ message: "Failed to retrieve order" });
  }
});

// Update Order Status
app.put('/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  const { newStatus } = req.body;

  try {
    const collection = client.db("better_ecom").collection('orders');
    const currentTime = new Date();
  
    currentTime.setUTCHours(currentTime.getUTCHours() + 6);

    const result = await collection.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status: newStatus, updated_time: currentTime } }
    );

    if (result.modifiedCount === 1) {
      const updatedOrder = await collection.findOne({ _id: new ObjectId(orderId) });
      res.status(200).json({ message: "Order status updated successfully", order: updatedOrder });
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Failed to update order status", error: err.message });
  }
});


// PUT method to update the stock of a product
app.put('/updateproducts/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const updatedStock = req.body.stock;

    const collection = client.db("better_ecom").collection('products');
    const result = await collection.updateOne(
      { _id: new ObjectId(productId) },
      { $set: { stock: updatedStock } }
    );

    if (result.matchedCount === 1) {
      res.status(200).json({ message: "Stock updated successfully" });
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (err) {
    console.error("Error updating stock:", err);
    res.status(500).json({ message: "Failed to update stock" });
  }
});


//user
app.post('/addusers', upload.none(), async (req, res) => {
  const { name, email, phone } = req.body;

  const user = {
    name,
    email,
    phone,
    createdAt: new Date(),
  };

  try {
    const collection = client.db("better_ecom").collection('users');
    const result = await collection.insertOne(user);
    res.status(201).json({ message: 'User added successfully', userId: result.insertedId });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ message: 'Failed to add user', error: error.message });
  }
});
// get users
app.get('/users', async (req, res) => {
  try {
    const collection = client.db("better_ecom").collection('users');
    const orders = await collection.find({}).toArray();
    res.status(200).json(orders);
  } catch (err) {
    console.error("Error getting orders:", err);
    res.status(500).json({ message: "Failed to retrieve orders" });
  }
});
app.get('/users/email/:email', async (req, res) => {
  try {
    const email = req.params.email;

    const collection = client.db("better_ecom").collection('users');
    const user = await collection.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user by email:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

app.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { orderId } = req.body;
    console.log("Order ID to be added to track record:", orderId);

    const collection = client.db("better_ecom").collection('users');
    const result = await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $push: { trackrecord: orderId } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Track record updated successfully" });
  } catch (err) {
    console.error("Error updating track record:", err);
    res.status(500).json({ message: "Failed to update track record" });
  }
});

app.post('/addcoupon', async (req, res) => {
  const collection = client.db("better_ecom").collection('coupons');
  try {
    const { code } = req.body;

    // Simple validation
    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const newCoupon = {
      code,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newCoupon);

    if (result.acknowledged) {
      res.status(201).json({ message: 'Coupon created successfully', couponId: result.insertedId });
    } else {
      res.status(500).json({ message: 'Failed to create coupon' });
    }
  } catch (err) {
    console.error('Error creating coupon:', err);
    res.status(500).json({ message: 'Failed to create coupon', error: err.message });
  }
});

app.get('/coupons', async (req, res) => {
  const collection = client.db("better_ecom").collection('coupons');
  try {
    const coupons = await collection.find({}).toArray();
    res.status(200).json(coupons);
  } catch (err) {
    console.error('Error fetching coupons:', err);
    res.status(500).json({ message: 'Failed to fetch coupons', error: err.message });
  }
});


app.delete('/deletecoupon/:couponId', async (req, res) => {
  const collection = client.db("better_ecom").collection('coupons');
  try {
    const { couponId } = req.params;
    const query = { _id: ObjectId(couponId) };
    
    const result = await collection.deleteOne(query);

    if (result.deletedCount === 1) {
      res.status(200).json({ message: 'Coupon deleted successfully' });
    } else {
      res.status(404).json({ message: 'Coupon not found' });
    }
  } catch (err) {
    console.error('Error deleting coupon:', err);
    res.status(500).json({ message: 'Failed to delete coupon', error: err.message });
  }
});

// Endpoint to record used coupons
app.post('/usedcoupons', async (req, res) => {
  const { email, couponCode } = req.body;

  if (!email || !couponCode) {
    return res.status(400).json({ message: 'Email and coupon code are required' });
  }

  try {
    const collection = client.db('better_ecom').collection('usedcoupons');

    const result = await collection.insertOne({
      email,
      couponCode,
      usedAt: new Date()
    });

    if (result.insertedCount === 1) {
      res.status(201).json({ message: 'Coupon usage recorded successfully' });
    } else {
      res.status(500).json({ message: 'Failed to record coupon usage' });
    }
  } catch (error) {
    console.error('Error recording coupon usage:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to check if an email has already used a coupon
app.get('/usedcoupons/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const collection = client.db('better_ecom').collection('usedcoupons');
    const usedCoupon = await collection.findOne({ email });

    if (usedCoupon) {
      res.status(200).json({ used: true });
    } else {
      res.status(200).json({ used: false });
    }
  } catch (error) {
    console.error('Error checking coupon usage:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



//admin
const bcrypt = require('bcrypt');

app.post('/addadmin', upload.none(), async (req, res) => {
    const { name, email, phone, password, role } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            name,
            email,
            phone,
            password: hashedPassword, // Store the hashed password
            role,
            createdAt: new Date(),
        };

        const collection = client.db("better_ecom").collection('admin');
        const result = await collection.insertOne(user);
        res.status(201).json({ message: 'User added successfully', userId: result.insertedId });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ message: 'Failed to add user', error: error.message });
    }
});
app.post('/login', upload.none(), async (req, res) => {
  const { email, password, role } = req.body;

  try {
      const collection = client.db("better_ecom").collection('admin');
      const user = await collection.findOne({ email, role });

      if (!user) {
          return res.status(400).json({ message: 'Invalid email, password, or role' });
      }

      // Compare the hashed password with the one provided by the user
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
          return res.status(400).json({ message: 'Invalid email, password, or role' });
      }

      res.status(200).json({ message: 'Login successful' });
  } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ message: 'Failed to log in', error: error.message });
  }
});

app.get('/admin', async (req, res) => {
  try {
    const collection = client.db("better_ecom").collection('admin');
    const admins = await collection.find().toArray();
    res.status(200).json(admins);
  } catch (error) {
    console.error('Error fetching admin data:', error);
    res.status(500).json({ message: 'Failed to fetch admin data', error: error.message });
  }
});





app.listen(port, () => console.log(`Server is running on port ${port}`));