// Set default ELASTICSEARCH_URL for tests if not already set
if (!process.env.ELASTICSEARCH_URL) {
  process.env.ELASTICSEARCH_URL = 'http://localhost:9200'
}
