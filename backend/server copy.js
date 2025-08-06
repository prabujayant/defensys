const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const crypto = require("crypto"); // Import crypto module for AES

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for image data
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Increased limit for image data

// Define upload directory relative to project root
const uploadDir = path.join(__dirname, "uploads");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage for uploaded files (used by both Malware Analyzer and AES Image Encryption)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // Added timestamp to avoid filename conflicts
  }
});
const upload = multer({ storage });

// --- AES Encryption/Decryption Helper Functions ---

// Function to derive a 32-byte key from any input string using SHA256
function deriveKey(inputKey) {
  if (!inputKey || typeof inputKey !== 'string' || inputKey.length === 0) {
    throw new Error('AES key cannot be empty or invalid.');
  }
  return crypto.createHash('sha256').update(inputKey).digest(); // Returns a 32-byte Buffer
}

function encryptAES(data, inputKey) {
  if (!data || (typeof data === 'string' && data.length === 0)) {
    throw new Error('Data to encrypt cannot be empty or invalid.');
  }
  try {
    const keyBuffer = deriveKey(inputKey); // Derive key from input
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex'); // Assuming data is UTF-8 string (even for base64 image)
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // Prepend IV to ciphertext
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error(`Encryption failed: ${error.message}. Ensure key and data are valid.`);
  }
}

function decryptAES(encryptedData, inputKey) {
  if (!encryptedData || typeof encryptedData !== 'string' || encryptedData.length === 0) {
    throw new Error('Encrypted data to decrypt cannot be empty or invalid.');
  }
  try {
    const keyBuffer = deriveKey(inputKey); // Derive key from input
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format. Expected IV:ciphertext.');
    }
    const iv = Buffer.from(parts.shift(), 'hex');
    const ciphertext = parts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error(`Decryption failed: ${error.message}. Check key and encrypted data format.`);
  }
}

// --- Helper function to parse Docker memory string to bytes ---
function parseDockerMemoryToBytes(memString) {
  const parts = memString.trim().split(' ')[0]; // Get "100MiB" from "100MiB / 1GB"
  if (!parts) return 0;

  const value = parseFloat(parts);
  const unit = parts.replace(value, '').toLowerCase();

  switch (unit) {
    case 'b': return value;
    case 'kib':
    case 'kb': return value * 1024;
    case 'mib':
    case 'mb': return value * 1024 * 1024;
    case 'gib':
    case 'gb': return value * 1024 * 1024 * 1024;
    case 'tib':
    case 'tb': return value * 1024 * 1024 * 1024 * 1024;
    default: return 0; // Or throw an error for unknown units
  }
}


// --- Your Existing Malware Analyzer Endpoint ---
// Enhanced /upload endpoint to get structured malware analysis from Flask
app.post("/upload", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const originalname = req.file.originalname; // Capture original name for logging

  try {
    const formData = new FormData();
    const file = fs.createReadStream(filePath);
    formData.append("file", file);

    const flaskResponse = await axios.post("http://localhost:5050/predict", formData, {
      headers: formData.getHeaders(),
    });

    // Clean up the uploaded file after successful processing
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });

    res.json({
      message: `File ${originalname} analyzed successfully`,
      result: flaskResponse.data,
    });
  } catch (error) {
    console.error(`Error sending file ${originalname} to Flask:`, error.message);
    // Attempt to clean up even on error
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting uploaded file on error:', err);
    });
    res.status(500).json({ error: "Failed to analyze file", details: error.message });
  }
});

// --- Your Existing Docker Interaction Endpoints ---

// Endpoint to run the 'ls' command in Docker container (example for node1)
app.get("/run-ls", (req, res) => {
  exec("docker exec hackathon-node1-1 cat blacklisted_macs.log", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    console.log(`LS Output: ${stdout}`);
    res.json({ output: stdout });
  });
});

// Endpoint to run logs from node1
app.get("/run-log1", (req, res) => {
  exec("docker exec hackathon-node1-1 curl -s node1:5001/blacklisted", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    console.log(`Log Output: ${stdout}`);
    res.json({ output: stdout });
  });
});

// Endpoint to run logs from node2
app.get("/run-log2", (req, res) => {
  exec("docker exec hackathon-node1-1 curl -s node2:5002/blacklisted", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    console.log(`Log Output: ${stdout}`);
    res.json({ output: stdout });
  });
});

// Endpoint to run logs from node3
app.get("/run-log3", (req, res) => {
  exec("docker exec hackathon-node1-1 curl -s node3:5003/blacklisted", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    console.log(`Log Output: ${stdout}`);
    res.json({ output: stdout });
  });
});

// Reset logs for node1
app.get("/run-reset1", (req, res) => {
  exec("docker exec hackathon-node1-1 rm blacklisted_macs.log", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }

    exec("docker exec hackathon-node1-1 touch blacklisted_macs.log", (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ error: error.message });
      }
      res.json({ output: stdout });
    });
  });
});

// Reset logs for node2
app.get("/run-reset2", (req, res) => {
  exec("docker exec hackathon-node2-1 rm blacklisted_macs.log", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }

    exec("docker exec hackathon-node2-1 touch blacklisted_macs.log", (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ error: error.message });
      }
      res.json({ output: stdout });
    });
  });
});

// Reset logs for node3
app.get("/run-reset3", (req, res) => {
  exec("docker exec hackathon-node3-1 rm blacklisted_macs.log", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }

    exec("docker exec hackathon-node3-1 touch blacklisted_macs.log", (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ error: error.message });
      }
      res.json({ output: stdout });
    });
  });
});

// Get stats from node1 - MODIFIED TO PARSE MEMORY
app.get("/run-stat1", (req, res) => {
  exec('docker stats hackathon-node1-1 --no-stream --format "{{.MemUsage}}"', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    const memoryBytes = parseDockerMemoryToBytes(stdout.trim()); // Parse the memory string
    res.json({ output: memoryBytes }); // Send as a number (bytes)
  });
});

// Get stats from node2 - MODIFIED TO PARSE MEMORY
app.get("/run-stat2", (req, res) => {
  exec('docker stats hackathon-node2-1 --no-stream --format "{{.MemUsage}}"', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    const memoryBytes = parseDockerMemoryToBytes(stdout.trim()); // Parse the memory string
    res.json({ output: memoryBytes }); // Send as a number (bytes)
  });
});

// Get stats from node3 - MODIFIED TO PARSE MEMORY
app.get("/run-stat3", (req, res) => {
  exec('docker stats hackathon-node3-1 --no-stream --format "{{.MemUsage}}"', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    const memoryBytes = parseDockerMemoryToBytes(stdout.trim()); // Parse the memory string
    res.json({ output: memoryBytes }); // Send as a number (bytes)
  });
});

// --- New AES Encryption/Decryption Endpoints ---

app.post('/encrypt-text/:nodeId', (req, res) => {
  const { text, key } = req.body;
  const nodeId = req.params.nodeId;
  console.log(`Node ${nodeId}: Encrypting text...`);

  if (!text || !key) {
    return res.status(400).json({ error: 'Text and AES key are required for encryption.' });
  }

  try {
    const encryptedText = encryptAES(text, key);
    res.json({ encryptedText });
  } catch (error) {
    console.error(`Node ${nodeId}: Text encryption failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/decrypt-text/:nodeId', (req, res) => {
  const { encryptedText, key } = req.body;
  const nodeId = req.params.nodeId;
  console.log(`Node ${nodeId}: Decrypting text...`);

  if (!encryptedText || !key) {
    return res.status(400).json({ error: 'Encrypted text and AES key are required for decryption.' });
  }

  try {
    const decryptedText = decryptAES(encryptedText, key);
    res.json({ decryptedText });
  } catch (error) {
    console.error(`Node ${nodeId}: Text decryption failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/encrypt-image/:nodeId', upload.single('image'), (req, res) => {
  const { key } = req.body;
  const nodeId = req.params.nodeId;
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }
  if (!key) {
    return res.status(400).json({ error: 'AES key is required for image encryption.' });
  }
  console.log(`Node ${nodeId}: Encrypting image...`);

  fs.readFile(req.file.path, (err, data) => {
    if (err) {
      console.error('Error reading image file:', err);
      // Clean up the uploaded file even if read fails
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded image on read error:', unlinkErr);
      });
      return res.status(500).json({ error: 'Failed to read image file.' });
    }

    try {
      const base64Image = data.toString('base64');
      const encryptedImage = encryptAES(base64Image, key); // Encrypt the base64 string
      res.json({ encryptedImage });
    } catch (error) {
      console.error(`Node ${nodeId}: Image encryption failed:`, error.message);
      res.status(500).json({ error: error.message });
    } finally {
      // Always clean up the uploaded file
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded image:', unlinkErr);
      });
    }
  });
});

app.post('/decrypt-image/:nodeId', (req, res) => {
  const { encryptedImage, key } = req.body;
  const nodeId = req.params.nodeId;
  console.log(`Node ${nodeId}: Decrypting image...`);

  if (!encryptedImage || !key) {
    return res.status(400).json({ error: 'Encrypted image data and AES key are required for decryption.' });
  }

  try {
    const decryptedBase64 = decryptAES(encryptedImage, key);
    const imageBuffer = Buffer.from(decryptedBase64, 'base64');
    // Determine content type (you might need more robust detection)
    // For simplicity, assuming common image types. In a real app, you might infer from magic bytes or original file extension.
    let contentType = 'application/octet-stream'; // Default if not determined
    // Basic check for common image formats based on base64 prefix
    if (decryptedBase64.startsWith('/9j/')) contentType = 'image/jpeg';
    else if (decryptedBase64.startsWith('iVBORw0KGgo')) contentType = 'image/png';
    else if (decryptedBase64.startsWith('R0lGOD')) contentType = 'image/gif';
    // Add more as needed (e.g., BMP, WebP)

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length
    });
    res.end(imageBuffer);
  } catch (error) {
    console.error(`Node ${nodeId}: Image decryption failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});


// Start the Express server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Express proxy running at http://localhost:${PORT}`);
});