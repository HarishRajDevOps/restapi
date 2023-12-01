const { Pool } = require('pg');
const basicAuth = require('express-basic-auth'); // Import express-basic-auth middleware

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://username:passwoed@ip:port/test',
    ssl: process.env.DATABASE_URL ? true : false
})

// Middleware for basic authentication
const authMiddleware = basicAuth({
    users: { 'username': 'password' }, // Replace with your actual username and password
    challenge: true, // Show login dialog when authentication fails
    unauthorizedResponse: 'Unauthorized'
});

// Add authMiddleware to secure routes
const getUserById = [authMiddleware, async (req, res) => {
    const id = req.params.id;
    const response = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    res.json(response.rows);
}];

const createUser = [authMiddleware, async (req, res) => {
    const { name, email } = req.body;

    // Check if required fields are present
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required fields.' });
    }

    try {
        // Check if the user with the given email already exists
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // If the user doesn't exist, proceed with the insertion
        const response = await pool.query('INSERT INTO users(name, email) VALUES($1, $2)', [name, email]);
        console.log(response);
        res.status(201).json({
            message: 'User Added Successfully',
            body: {
                user: { name, email }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}];

const deleteUser = [authMiddleware, async (req, res) => {
    const id = req.params.id;
    const response = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    console.log(response);
    res.json(`User ${id} deleted successfully`);
}];

const updateUser = [authMiddleware, async (req, res) => {
    const id = req.params.id;
    const { name, email } = req.body;

    try {
        // Check if the user with the given ID exists
        const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

        if (existingUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check a condition, for example, based on a version or timestamp
        // This is a placeholder, adapt it based on your application's needs
        const currentVersion = existingUser.rows[0].version;
        const clientVersion = req.headers['if-match']; // Assuming the client sends the version in the If-Match header

        if (currentVersion !== clientVersion) {
            return res.status(412).json({ error: 'Precondition Failed - Resource version mismatch' });
        }

        // If the condition is met, proceed with the update
        const response = await pool.query('UPDATE users SET name = $1, email=$2 WHERE id = $3', [name, email, id]);
        console.log(response);
        res.json('User updated successfully');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}];

module.exports = {
    getUsers,
    getUserById,
    createUser,
    deleteUser,
    updateUser
}
