const language = require('@google-cloud/language');
const client = new language.LanguageServiceClient({
  keyFilename: 'krib.json',
});

async function analyzeQuery(query) {
  const document = {
    content: query,
    type: 'PLAIN_TEXT',
  };
  console.log(query);
  try {
    const [result] = await client.analyzeSyntax({ document });
    return result;
  } catch (error) {
    console.error('Error analyzing query:', error);
    throw error; // Re-throw the error to be caught in the calling function
  }
}
module.exports = analyzeQuery;
