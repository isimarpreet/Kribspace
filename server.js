const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
// app.js
const analyzeQuery = require('./nlp');



// Initialize the express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Initialize the SQLite database
const dbPath = './database.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to database');
  }
});

// Define stop words for filtering
const stopWords = ['find', 'show', 'me', 'in', 'at', 'with', 'under', 'and', 'a', 'the', 'of'];

// Endpoint to handle natural language queries
app.post('/search', (req, res) => {
  const query = req.body.query;
  if (!query) {
    return res.status(400).json({ error: 'Query not provided' });
    
  }
  const abc = analyzeQuery(query);

abc.then(xyz => {
    console.log(xyz);
    const abc=mapTokensToColumns(xyz.tokens)
    console.log(abc);
    const fbd=queryDatabase(abc,res);
    
}).catch(err => {
    console.error('Error occurred:', err);
});
  return;

});

function mapTokensToColumns(tokens) {
  const columns = {
    location: '',
    size_sqft: '',
    budget: '',
    year_built: '',
    property_type: '',
    amenities: '',
  };

  let potentialSize = ''; // To hold the number if followed by "sqft"
  let potentialYear = '';
  
  tokens.forEach((token, index) => {
    const lemma = token.text.content.toLowerCase();
    const tag = token.partOfSpeech.tag;

    // Handle Budget (using regex to detect $ and numeric values)
    if (lemma.match(/\$\d+/)) {
      columns.budget = lemma.replace(/\$/, '');  // Remove $ and assign the number as budget
      columns.budget = parseInt(columns.budget, 10);  // Ensure budget is stored as a number
    } 

    // Handle size in sqft format (number followed by "sqft")
    if (tag === 'NUM') {
      potentialSize = token.text.content; // Store the number if it's a potential size
    } else if (lemma === 'sqft') {
      if (potentialSize) {
        columns.size_sqft = potentialSize; // Assign size if previous token was a number
        potentialSize = ''; // Reset after assignment
      }
    }

    // Handle Numbers for year built
    else if (tag === 'NUM' && !columns.year_built) {
      potentialYear = token.text.content;  // Assign the first number as year built
    }

    // Property type detection
    else if (['house', 'apartment', 'townhouse', 'condo'].includes(lemma)) {
      columns.property_type = token.text.content;  // Assign property type
    }

    // Amenities detection (e.g., "Gym", "Pool", etc.)
    else if (['garden', 'gym', 'pool', 'garage'].includes(lemma)) {
      columns.amenities = token.text.content;  // Assign amenities
    }

    // Location detection
    else if ((tag === 'NOUN' || tag === 'PROPN') &&
             !['house', 'apartment', 'townhouse', 'condo'].includes(lemma) &&
             !['garden', 'gym', 'pool', 'garage'].includes(lemma) &&
             !lemma.match(/\d+/) && // Exclude numeric values
             lemma !== 'sqft') { // Exclude sqft
      columns.location = token.text.content;  // Assign location
    }
    
  });
  // Validate and assign year_built
  if (potentialYear && !columns.year_built) {
    const year = parseInt(potentialYear, 10);
    const currentYear = new Date().getFullYear();
    if (year > 1900 && year <= currentYear) { // Validate year to be reasonable
      columns.year_built = year;
    }
  }
  

  console.log('Columns object:', columns);
  return columns;
}




// Function to connect to MySQL and query based on mapped columns
function queryDatabase(columns, res) {
  let query = 'SELECT * FROM properties WHERE 1=1';
  const queryParams = [];

  // Filter by location
  if (columns.location) {
    query += ' AND location LIKE ?';
    queryParams.push(`%${columns.location}%`);
  }
  
  // Filter by size in sqft
  if (columns.size_sqft) {
    query += ' AND size_sqft >= ?';
    queryParams.push(columns.size_sqft);
  }
  
  // Filter by budget
  if (columns.budget) {
    query += ' AND budget <= ?';
    queryParams.push(columns.budget);
  }
  
  // Filter by year built (properties built in the specified year or earlier)
  if (columns.year_built) {
    query += ' AND year_built <= ?'; // Note the change here to `<=`
    queryParams.push(columns.year_built);
  }
  
  // Filter by property type
  if (columns.property_type) {
    query += ' AND property_type = ?';
    queryParams.push(columns.property_type);
  }

  // Filter by amenities
  if (columns.amenities) {
    query += ' AND amenities LIKE ?';
    queryParams.push(`%${columns.amenities}%`);
  }

  console.log('SQL Query:', query);
  console.log('Query Parameters:', queryParams);

  db.all(query, queryParams, (err, rows) => {
    if (err) {
      console.error('Error querying database:', err);
      return res.status(500).json({ error: err.message });
    }
    if (rows.length === 0) {
      console.log('No matching properties found.');
      return res.json({ query, properties: [], message: 'No matching properties found.' });
    }
    console.log('Properties found:', rows);
    res.json({ query, properties: rows });
  });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});