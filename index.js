const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

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

  const image = {
    contentType: req.file.mimetype,
    size: req.file.size,
    img: req.file.buffer
  };

  const category = {
    name,
    image,
    created_time: new Date()
  };

  try {
    const collection = await categoryDbCollection ();
    const result = await collection.insertOne(category);
    if (result.acknowledged) {
      res.status(201).json({ message: 'Category added successfully', categoryId: result.insertedId });
    } else {
      throw new Error('Failed to insert category');
    }
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Failed to add category', error: error.message });
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
// Route to update a category by ID
app.put('/categories/:id', upload.single('image'), async (req, res) => {
  const categoryId = req.params.id; // Assuming 'id' is the correct parameter name
  const { name } = req.body;

  try {
    const collection = await categoryDbCollection();

    // Construct update object based on what is provided in the request
    let updateFields = { name };
    if (req.file) {
      updateFields.image = {
        contentType: req.file.mimetype,
        size: req.file.size,
        img: req.file.buffer
      };
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(categoryId) }, // Correctly instantiate ObjectId with 'new'
      { $set: updateFields }
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ message: 'Category updated successfully', categoryId });
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Failed to update category', error: error.message });
  }
});

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



app.post('/addproducts', upload.array('images', 5), async (req, res) => {
  const { name, price, category, sku, barcode, stock, costPerUnit, storePrice, shortDescription, description, expirationDate, quantityType } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No image files uploaded' });
  }

  const images = req.files.map(file => ({
    contentType: file.mimetype,
    size: file.size,
    img: file.buffer
  }));

  const product = {
    name,
    price,
    category,
    sku,
    barcode,
    stock,
    costPerUnit,
    storePrice,
    shortDescription,
    description,
    expirationDate,
    quantityType,
    images
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

app.patch('/products/:id', upload.array('images', 5), async (req, res) => {
  const { id } = req.params;
  const { name, price, category, sku, barcode, stock, costPerUnit, storePrice, shortDescription, description, expirationDate, quantityType } = req.body;

  const images = req.files.map(file => ({
    contentType: file.mimetype,
    size: file.size,
    img: file.buffer
  }));

  const updatedProduct = {
    ...(name && { name }),
    ...(price && { price }),
    ...(category && { category }),
    ...(sku && { sku }),
    ...(barcode && { barcode }),
    ...(stock && { stock }),
    ...(costPerUnit && { costPerUnit }),
    ...(storePrice && { storePrice }),
    ...(shortDescription && { shortDescription }),
    ...(description && { description }),
    ...(expirationDate && { expirationDate }),
    ...(quantityType && { quantityType }),
    ...(images.length && { images }),
    updated_time: new Date()
  };

  try {
    const collection = await getDbCollection();
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: updatedProduct });
    const product = await collection.findOne({ _id: new ObjectId(id) });
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});







app.listen(port, () => console.log(`Server is running on port ${port}`));