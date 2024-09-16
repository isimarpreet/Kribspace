const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
// app.js
const analyzeQuery = require('./nlp');

// Now you can use analyzeQuery function



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

  // Tokenize and categorize the query
  const tokens = query.toLowerCase().split(/\s+/);
  console.log('Tokens:', tokens);

  const filteredTokens = filterTokens(tokens);
  console.log('Filtered Tokens:', filteredTokens);

  const categories = categorizeTokens(filteredTokens);
  console.log('Categorized Tokens:', categories);

  // Build and execute the SQL query
  const { sql, parameters } = buildQuery(categories);
  console.log('Built SQL Query:', sql);
  console.log('Query Parameters:', parameters);

  db.all(sql, parameters, (err, rows) => {
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
});

// Function to filter out stop words
function filterTokens(tokens) {
  return tokens.filter(token => !stopWords.includes(token));
}

// Function to categorize tokens into different search criteria
function categorizeTokens(tokens) {
  const categories = {
    propertyType: [],
    location: [],
    budget: null,
    sizeSqft: null,
    yearBuilt: null,
    propertyCondition: [],
    amenities: []
  };

  tokens.forEach(token => {
    if (['house', 'apartment', 'townhouse', 'condo'].includes(token)) {
      categories.propertyType.push(token);
    } else if (token.match('$')) {
      categories.budget = categories.budget || token;
    } else if (token === 'sqft') {
      categories.sizeSqft = '1000'; // Default value
    } else if (token === 'built' && tokens.includes('after')) {
      const index = tokens.indexOf('after');
      categories.yearBuilt = tokens[index + 1] || '2000'; // Default value
    } else {
      categories.location.push(token);
    }
  });

  return categories;
}
function mapTokensToColumns(tokens) {
  const columns = {
    location: '',
    size_sqft: '',
    budget: '',
    year_built: '',
    property_type: '',
    property_condition: '',
    amenities: '',
  };

  tokens.forEach(token => {
    const lemma = token.text.content.toLowerCase();
    const tag = token.partOfSpeech.tag;

    // Handle Budget (using regex to detect $ and numeric values)
    if (lemma.match(/\$\d+/)) {
      columns.budget = lemma.replace(/\$/, '');  // Remove $ a  nd assign the number as budget
      columns.budget = parseInt(budgetValue, 10);  // Ensure budget is stored as a number
    }

    // Handle Numbers (assuming numbers without $ represent year or size)
    else if (tag === 'NUM') {
      if (columns.year_built === '') {
        columns.year_built = token.text.content;  // Assign first number as year built
      } else if (columns.size_sqft === '') {
        columns.size_sqft = token.text.content;  // Assign the next number as size_sqft
      }
    }

    // Property type detection
    else if (['house', 'apartment', 'townhouse', 'condo', 'property'].includes(lemma)) {
      columns.property_type = token.text.content;  // Assign property type
    }

    // Property condition detection (e.g., "Good", "Fair", etc.)
    else if (['good', 'new', 'fair', 'excellent', 'poor','condition'].includes(lemma)) {
      columns.property_condition = token.text.content;  // Assign property condition
    }

    // Amenities detection (e.g., "Gym", "Pool", etc.)
    else if (['garden', 'gym', 'pool', 'garage'].includes(lemma)) {
      columns.amenities = token.text.content;  // Assign amenities
    }

    // Location detection (Ensure it’s not already used as property_type, condition, or amenities)
    else if ((tag === 'NOUN' || tag === 'PROPN') 
             && !['house', 'apartment', 'townhouse', 'condo'].includes(lemma)  // Not property type
             && !['good', 'new', 'fair', 'excellent', 'poor'].includes(lemma)  // Not condition
             && !['garden', 'gym', 'pool', 'garage'].includes(lemma)) {        // Not amenities
      columns.location = token.text.content;  // Assign location
    }
  });

  console.log('Columns object:', columns);
  return columns;
}


// Function to connect to MySQL and query based on mapped columns
function queryDatabase(columns, res) {
  let query = 'SELECT * FROM properties WHERE 1=1';
  const queryParams = [];

  if (columns.location) {
      query += ' AND location LIKE ?';
      queryParams.push(`%${columns.location}%`);
  }
  if (columns.size_sqft) {
      query += ' AND size_sqft >= ?';
      queryParams.push(columns.size_sqft);
  }
  if (columns.budget) {
      query += ' AND budget <= ?';
      queryParams.push(columns.budget);
  }
  if (columns.year_built) {
      query += ' AND year_built >= ?';
      queryParams.push(columns.year_built);
  }
  if (columns.property_type) {
      query += ' AND property_type = ?';
      queryParams.push(columns.property_type);
  }
  if (columns.property_condition) {
      query += ' AND property_condition = ?';
      queryParams.push(columns.condition);
  }
  if (columns.amenities) {
      query += ' AND amenities LIKE ?';
      queryParams.push(columns.amenities);
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


async function generateQuery(parsedTokens) {
    // Extract components from parsed tokens
    let verb, obj, location;

    parsedTokens.forEach(token => {
        if (token.partOfSpeech.tag === 'VERB') {
            verb = token.text.content;
        }
        if (token.partOfSpeech.tag === 'NOUN') {
            if (token.dependencyEdge.label === 'DOBJ') {
                obj = token.text.content;
            } else if (token.dependencyEdge.label === 'POBJ') {
                location = token.text.content;
            }
        }
    });

    // Construct the query
    const query = `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${obj} in ${location}`;
    return query;
}

// Function to build the SQL query based on categorized tokens
function buildQuery(categories) {
  const conditions = [];
  const parameters = [];

  if (categories.propertyType.length) {
    conditions.push("property_type = ?");
    parameters.push(categories.propertyType[0]);
  }
  if (categories.budget) {
    conditions.push("budget <= ?");
    parameters.push(categories.budget);
  }
  if (categories.sizeSqft) {
    conditions.push("size_sqft >= ?");
    parameters.push(categories.sizeSqft);
  }
  if (categories.yearBuilt) {
    conditions.push("year_built >= ?");
    parameters.push(categories.yearBuilt);
  }
  if (categories.location.length) {
    conditions.push("location LIKE ?");
    parameters.push(`%${categories.location.join(' ')}%`);
  }

  const sql = conditions.length ? `SELECT * FROM properties WHERE ${conditions.join(' AND ')}` : "SELECT * FROM properties";
  return { sql, parameters };
}



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});