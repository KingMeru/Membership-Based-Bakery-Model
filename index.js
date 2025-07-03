const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the database file
const dbPath = path.join(__dirname, 'bakery_inventory.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data

app.get('/', (req, res) => {
    // Fetch the home page content and include the header with navigation links
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Bakery Home</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .header { background-color: #007BFF; padding: 10px; color: white; text-align: center; }
            .header a { color: white; text-decoration: none; margin: 0 10px; font-weight: bold; }
            .content { text-align: center; margin-top: 30px; }
        </style>
    </head>
    <body>
        <!-- Navigation Header -->
        <div class="header">
            <a href="/">Home</a>
            <a href="/promotions">Promotions</a>
            <a href="/product_affected">Product Affected</a>
            <a href="/products">Products</a>
            <a href="/stock">Stock</a>
        </div>
        
        <!-- Main Home Content -->
        <div class="content">
            <h1>Welcome to the Bakery Inventory and Management Page!</h1>
            <p>Learn more about the products and promotions currently available.</p>
        </div>
    </body>
    </html>
    `;
    // Send the HTML response for the home page
    res.send(html);
});


// 1. Fetch all promotions
// Fetch all promotions and display them along with the affected products
app.get('/promotions', (req, res) => {
    // Fetch all promotions
    db.all('SELECT * FROM promotions', [], (err, promotions) => {
        if (err) {
            return res.status(500).send(err.message);
        }

        // Prepare an array of promises for fetching associated products for each promotion
        const promotionPromises = promotions.map(promotion => {
            return new Promise((resolve, reject) => {
                // Fetch the product IDs for this promotion
                db.all('SELECT product_id FROM product_affected WHERE promotion_id = ?', [promotion.promotion_id], (err, rows) => {
                    if (err) {
                        reject(err);
                    }
                    resolve({
                        promotion,
                        products: rows.map(row => row.product_id)
                    });
                });
            });
        });

        // Wait for all the promises to resolve
        Promise.all(promotionPromises)
            .then(promotionsWithProducts => {
                // Create the HTML content
                let html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Promotions</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #333; }
                        .header { background-color: #007BFF; padding: 10px; color: white; text-align: center; }
                        .header a { color: white; text-decoration: none; margin: 0 10px; font-weight: bold; }
                        .content { text-align: center; margin-top: 30px; }
                        .promotion { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
                        .promotion h2 { margin: 0; color: #007BFF; }
                        .promotion p { margin: 5px 0; }
                        .promotion ul { padding-left: 20px; }
                        .promotion a { color: #007BFF; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <!-- Navigation Header -->
                    <div class="header">
                        <a href="/">Home</a>
                        <a href="/promotions">Promotions</a>
                        <a href="/product_affected">Product Affected</a>
                        <a href="/products">Products</a>
                        <a href="/stock">Stock</a>
                    </div>
                    <h1>Available Promotions</h1>
                `;

                // Loop through each promotion and add its details to the HTML
                promotionsWithProducts.forEach(({ promotion, products }) => {
                    let productsHTML = '';
                    if (products.length > 0) {
                        productsHTML = products.map(productId => 
                            `<li><a href="/product/${productId}">${productId}</a></li>`
                        ).join('');
                    } else {
                        productsHTML = '<li>No products available for this promotion.</li>';
                    }

                    // Add promotion HTML
                    html += `
                    <div class="promotion">
                        <h2>${promotion.promotion_type}</h2>
                        <p><strong>Description:</strong> ${promotion.promotion_description}</p>
                        <p><strong>Amount Available:</strong> ${promotion.amount_available}</p>
                        <p><strong>Promotion ID:</strong> ${promotion.promotion_id}</p>
                        <p><strong>Can be used on product(s):</strong></p>
                        <ul>
                            ${productsHTML}
                        </ul>
                    </div>
                    `;
                });

                // Close the HTML
                html += `
                </body>
                </html>
                `;

                // Send the final HTML response
                res.send(html);
            })
            .catch(err => {
                res.status(500).send('Error fetching promotions or products: ' + err.message);
            });
    });
});




// Fetch all products and display them with links to individual product pages
app.get('/products', (req, res) => {
    const query = `SELECT * FROM product`;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).send(err.message);
        }

        // Create an HTML structure to display the products
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>All Products</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                .header { background-color: #007BFF; padding: 10px; color: white; text-align: center; }
                .header a { color: white; text-decoration: none; margin: 0 10px; font-weight: bold; }
                .content { text-align: center; margin-top: 30px; }
                .product { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
                .product a { color: #007BFF; text-decoration: none; font-weight: bold; }
                .product a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <!-- Navigation Header -->
            <div class="header">
                <a href="/">Home</a>
                <a href="/promotions">Promotions</a>
                <a href="/product_affected">Product Affected</a>
                <a href="/products">Products</a>
                <a href="/stock">Stock</a>
            </div>
            <h1>All Products</h1>
            ${rows.map(row => `
                <div class="product">
                    <h2><a href="/product/${row.product_id}">${row.product_id}</a></h2>
                    <p><strong>Description:</strong> ${row.product_description}</p>
                </div>
            `).join('')}
        </body>
        </html>
        `;

        res.send(html);
    });
});


// 2. Fetch product details and stock and render HTML
// Fetch a single product's details using product_id
app.get('/product/:product_id', (req, res) => {
    const productId = req.params.product_id;
    const query = `SELECT * FROM product WHERE product_id = ?`;

    db.get(query, [productId], (err, row) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!row) {
            return res.status(404).send("Product not found");
        }

        // Create an HTML structure to display the product details
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Product Details</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                .header { background-color: #007BFF; padding: 10px; color: white; text-align: center; }
                .header a { color: white; text-decoration: none; margin: 0 10px; font-weight: bold; }
                .content { text-align: center; margin-top: 30px; }                
                .product { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
                .product h2 { margin: 0; color: #007BFF; }
            </style>
        </head>
        <body>
            <!-- Navigation Header -->
            <div class="header">
                <a href="/">Home</a>
                <a href="/promotions">Promotions</a>
                <a href="/product_affected">Product Affected</a>
                <a href="/products">Products</a>
                <a href="/stock">Stock</a>
            </div>
            <h1>Product Details</h1>
            <div class="product">
                <h2>Product ID: ${row.product_id}</h2>
                <p><strong>Description:</strong> ${row.product_description}</p>
                <p><strong>Price:</strong> ${row.price}</p>
            </div>
        </body>
        </html>
        `;

        res.send(html);
    });
});

// 3. Render stock update page with a form
app.get('/update-stock/:product_id', (req, res) => {
    const productId = req.params.product_id;

    // Fetch product and stock information for pre-filling the form
    const productQuery = `SELECT * FROM product WHERE product_id = ?`;
    const stockQuery = `SELECT * FROM stock WHERE product_id = ?`;

    db.get(productQuery, [productId], (err, product) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!product) {
            return res.status(404).send("Product not found");
        }

        db.get(stockQuery, [productId], (err, stock) => {
            if (err) {
                return res.status(500).send(err.message);
            }

            // Create an HTML form for stock update
            let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Update Stock</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; }
                    .header { background-color: #007BFF; padding: 10px; color: white; text-align: center; }
                    .header a { color: white; text-decoration: none; margin: 0 10px; font-weight: bold; }
                    .content { text-align: center; margin-top: 30px; }
                    .form-container { max-width: 400px; margin: 0 auto; }
                    input { width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
                    button { padding: 10px 15px; background-color: #007BFF; color: white; border: none; border-radius: 5px; cursor: pointer; }
                    button:hover { background-color: #0056b3; }
                </style>
            </head>
            <body>
                <!-- Navigation Header -->
                <div class="header">
                    <a href="/">Home</a>
                    <a href="/promotions">Promotions</a>
                    <a href="/product_affected">Product Affected</a>
                    <a href="/products">Products</a>
                    <a href="/stock">Stock</a>
                </div>
                <h1>Update Stock for ${productId}</h1>
                <div class="form-container">
                    <form action="/stock/update" method="POST">
                        <input type="hidden" name="product_id" value="${productId}">
                        <label for="opening_stock">Opening Stock</label>
                        <input type="number" id="opening_stock" name="opening_stock" value="${stock.opening_stock}" required>
                        <label for="closing_stock">Closing Stock</label>
                        <input type="number" id="closing_stock" name="closing_stock" value="${stock.closing_stock}" required>
                        <button type="submit">Update Stock</button>
                    </form>
                </div>
            </body>
            </html>
            `;

            res.send(html);
        });
    });
});

// 3. Update stock
app.post('/stock/update', (req, res) => {
    const { product_id, opening_stock, closing_stock } = req.body;
    const updateQuery = `UPDATE stock SET opening_stock = ?, closing_stock = ? WHERE product_id = ?`;

    db.run(updateQuery, [opening_stock, closing_stock, product_id], function (err) {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (this.changes === 0) {
            return res.status(404).send("Stock update failed: Product not found");
        }
        res.send('<h1>Stock updated successfully!</h1><p><a href="/stock">Back to stocks</a></p>');
    });
});

// Fetch and display the product_affected table
app.get('/product_affected', (req, res) => {
    const query = 'SELECT * FROM product_affected';

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).send(err.message);
        }

        // Create an HTML structure to display the product_affected table
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Product Affected by Promotions</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                .header { background-color: #007BFF; padding: 10px; color: white; text-align: center; }
                .header a { color: white; text-decoration: none; margin: 0 10px; font-weight: bold; }
                .content { text-align: center; margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                table, th, td { border: 1px solid #ddd; }
                th, td { padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
                tr:hover { background-color: #f9f9f9; }
            </style>
        </head>
        <body>
            <!-- Navigation Header -->
            <div class="header">
                <a href="/">Home</a>
                <a href="/promotions">Promotions</a>
                <a href="/product_affected">Product Affected</a>
                <a href="/products">Products</a>
                <a href="/stock">Stock</a>
            </div>
            <h1>Product-Affected Table</h1>
            <table>
                <thead>
                    <tr>
                        <th>Promotion ID</th>
                        <th>Product ID</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            <td><a href="/promotion/${row.promotion_id}">${row.promotion_id}</a></td>
                            <td><a href="/product/${row.product_id}">${row.product_id}</a></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
        `;

        res.send(html);
    });
});

// Fetch and display details of a specific promotion
app.get('/promotion/:promotion_id', (req, res) => {
    const promotionId = req.params.promotion_id;
    const query = 'SELECT * FROM promotions WHERE promotion_id = ?';

    db.get(query, [promotionId], (err, row) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!row) {
            return res.status(404).send("Promotion not found");
        }

        // Create an HTML structure to display the promotion details
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Promotion Details</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                .header { background-color: #007BFF; padding: 10px; color: white; text-align: center; }
                .header a { color: white; text-decoration: none; margin: 0 10px; font-weight: bold; }
                .content { text-align: center; margin-top: 30px; }
                .promotion-details { border: 1px solid #ddd; padding: 10px; margin-bottom: 20px; border-radius: 5px; background-color: #f9f9f9; }
                .promotion-details h2 { margin-top: 0; }
            </style>
        </head>
        <body>
            <!-- Navigation Header -->
            <div class="header">
                <a href="/">Home</a>
                <a href="/promotions">Promotions</a>
                <a href="/product_affected">Product Affected</a>
                <a href="/products">Products</a>
                <a href="/stock">Stock</a>
            </div>
            <h1>Promotion Details</h1>
            <div class="promotion-details">
                <h2>${row.promotion_type}</h2>
                <p><strong>Description:</strong> ${row.promotion_description}</p>
                <p><strong>Amount Available:</strong> ${row.amount_available}</p>
                <p><strong>Promotion ID:</strong> ${row.promotion_id}</p>
            </div>
            <a href="/product_affected">Back to Product Affected Table</a>
        </body>
        </html>
        `;

        res.send(html);
    });
});

app.get('/stock', (req, res) => {
    // Fetch all stock data from the database
    db.all('SELECT * FROM stock', [], (err, rows) => {
        if (err) {
            return res.status(500).send(err.message);
        }

        // Generate HTML page
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Stock Information</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; }
                .header { background-color: #007BFF; padding: 10px; color: white; text-align: center; position: fixed; width: 100%; top: 0; left: 0; z-index: 1000; }
                .header a { color: white; text-decoration: none; margin: 0 15px; font-weight: bold; }
                .content { margin-top: 100px; padding: 20px; text-align: center; }
                table { width: 80%; margin: 20px auto; border-collapse: collapse; }
                th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: center; }
                th { background-color: #f4f4f4; }
                .link { color: #007BFF; text-decoration: none; }
                .link:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <!-- Persistent Header -->
            <div class="header">
                <a href="/">Home</a>
                <a href="/promotions">Promotions</a>
                <a href="/product_affected">Product Affected</a>
                <a href="/products">Products</a>
                <a href="/stock">Stock</a>
            </div>

            <!-- Stock Table -->
            <div class="content">
                <h1>Stock Information</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Product ID</th>
                            <th>Opening Stock</th>
                            <th>Closing Stock</th>
                            <th>Update Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                <td><a href="/product/${row.product_id}" class="link">${row.product_id}</a></td>
                                <td>${row.opening_stock}</td>
                                <td>${row.closing_stock}</td>
                                <td><a href="/update-stock/${row.product_id}" class="link">Update</a></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
        `;

        res.send(html);
    });
});


// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
