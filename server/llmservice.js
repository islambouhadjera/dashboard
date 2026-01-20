const path = require("path");

class LlmService {
    constructor() {
        this.modelPath = process.env.MODEL_PATH || path.join(__dirname, "models", "Meta-Llama-3-8B-Instruct.Q4_0.gguf");
        this.model = null;
        this.context = null;
        this.session = null;
        this.initialized = false;
        this.llama = null;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log("Initializing Llama model from:", this.modelPath);

            // Dynamic import for ESM compatibility
            const { getLlama, LlamaChatSession } = await import("node-llama-cpp");

            this.llama = await getLlama();

            this.model = await this.llama.loadModel({
                modelPath: this.modelPath,
            });

            this.context = await this.model.createContext();
            const sequence = this.context.getSequence();
            this.session = new LlamaChatSession({ contextSequence: sequence });

            this.initialized = true;
            console.log("Llama model initialized successfully.");
        } catch (error) {
            console.error("Failed to initialize Llama model:", error);
            throw error;
        }
    }

    async generateSql(userQuestion) {
        if (!this.initialized) await this.initialize();

        const schema = `
Tables in the database:

1. speed_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_id VARCHAR(36) UNIQUE,
    download_mbps DECIMAL(10, 2),
    upload_mbps DECIMAL(10, 2),
    latency_ms INT,
    jitter_ms INT,
    network_type ENUM('2G','3G', '4G', '5G'),
    signal_strength_dbm INT,
    operator VARCHAR(50) DEFAULT 'Mobilis',
    device_type VARCHAR(50),
    wilaya VARCHAR(50),
    commune VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)

2. bts_antennas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100),
    wilaya VARCHAR(50),
    commune VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    etatA ENUM('actif', 'inactif', 'maintenance'),
    etatB ENUM('actif', 'inactif', 'maintenance'),
    etatC ENUM('actif', 'inactif', 'maintenance'),
    date_installation DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

        const prompt = `
You are an expert SQL assistant. Your goal is to convert natural language questions into valid MySQL queries for the 'mobilis_dashboard' database.

${schema}

IMPORTANT RULES:
1. Return ONLY the SQL query. No markdown, no explanations, no code blocks (like \`\`\`sql). Just the raw SQL string.
2. Use EXACT table and column names from the schema. DO NOT invent tables or columns.
3. DO NOT add spaces inside column names (e.g., use 'download_mbps', NOT 'download_ mbps').
4. If the user's question cannot be answered by the database schema, return EXACTLY: "ERROR: This question cannot be answered using the available database tables."
5. Ensure the query is syntactically correct for MySQL.

EXAMPLES:
Q: "What is the average download speed for Mobilis?"
SQL: SELECT AVG(download_mbps) FROM speed_tests WHERE operator = 'Mobilis';

Q: "Count the number of 4G tests in Algiers."
SQL: SELECT COUNT(*) FROM speed_tests WHERE network_type = '4G' AND wilaya = 'Algiers';


User Question: "${userQuestion}"
SQL Query:
`;

        try {
            console.log("Sending prompt to LLM...");
            const result = await this.session.prompt(prompt);
            console.log("Raw LLM Result:", result);

            let sql = result.trim();
            // Remove markdown code blocks if present (basic cleanup)
            sql = sql.replace(/```sql/g, '').replace(/```/g, '').trim();

            console.log("Cleaned SQL:", sql);
            return sql;
        } catch (error) {
            console.error("Error generating SQL:", error);
            throw error;
        }
    }
}

module.exports = new LlmService();
