// server.js
const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Define upload directory relative to project root
const uploadDir = path.join(__dirname, "Uploads");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Define valid AES modes
const VALID_AES_MODES = ['GCM', 'ECB', 'CBC', 'CFB', 'OFB', 'CTR'];

// Helper function to derive a 256-bit key from input
function deriveKey(inputKey) {
  if (!inputKey || typeof inputKey !== 'string' || inputKey.length === 0) {
    throw new Error('AES key cannot be empty or invalid.');
  }
  // Using SHA-256 to derive a 32-byte (256-bit) key
  return crypto.createHash('sha256').update(inputKey).digest();
}

// AES Encryption function with AEAD support
function encryptAES(data, inputKey, mode = 'GCM') {
  if (!data || (typeof data === 'string' && data.length === 0)) {
    throw new Error('Data to encrypt cannot be empty or invalid.');
  }
  
  if (!VALID_AES_MODES.includes(mode.toUpperCase())) {
    throw new Error(`Invalid AES mode: ${mode}. Supported modes: ${VALID_AES_MODES.join(', ')}.`);
  }
  
  try {
    const keyBuffer = deriveKey(inputKey);
    const steps = [`Starting ${mode} encryption`];
    
    let iv, cipher, authTag;
    
    // Handle different modes
    if (mode.toUpperCase() === 'ECB') {
      // Note: ECB doesn't provide confidentiality for patterns and is not recommended
      cipher = crypto.createCipheriv(`aes-256-${mode.toLowerCase()}`, keyBuffer, null);
      steps.push('ECB mode: No IV required (Not recommended for security)');
    } else if (mode.toUpperCase() === 'GCM') {
      // GCM mode for authenticated encryption
      iv = crypto.randomBytes(12); // 12 bytes is recommended for GCM
      cipher = crypto.createCipheriv(`aes-256-${mode.toLowerCase()}`, keyBuffer, iv);
      cipher.setAAD(Buffer.from('associated data')); // Optional associated data
      steps.push(`Generated IV for GCM: ${iv.toString('hex')}`);
    } else {
      // Other modes (CBC, CFB, OFB, CTR)
      iv = crypto.randomBytes(16); // 16 bytes for other modes
      cipher = crypto.createCipheriv(`aes-256-${mode.toLowerCase()}`, keyBuffer, iv);
      steps.push(`Generated IV: ${iv.toString('hex')}`);
    }
    
    steps.push(`Input data size: ${Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8')} bytes`);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // For GCM mode, get the authentication tag
    if (mode.toUpperCase() === 'GCM') {
      authTag = cipher.getAuthTag();
      steps.push(`Generated Auth Tag: ${authTag.toString('hex')}`);
      // Format for GCM: IV:AUTH_TAG:CIPHERTEXT
      return { 
        output: `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`, 
        steps,
        authTag: authTag.toString('hex') // Include auth tag in response
      };
    } else if (mode.toUpperCase() === 'ECB') {
      // Format for ECB: ciphertext (no IV)
      return { output: encrypted, steps };
    } else {
      // Format for other modes: IV:ciphertext
      return { output: `${iv.toString('hex')}:${encrypted}`, steps };
    }
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// AES Decryption function with AEAD support
function decryptAES(encryptedData, inputKey, mode = 'GCM') {
  if (!encryptedData || typeof encryptedData !== 'string' || encryptedData.length === 0) {
    throw new Error('Encrypted data cannot be empty or invalid.');
  }
  
  if (!VALID_AES_MODES.includes(mode.toUpperCase())) {
    throw new Error(`Invalid AES mode: ${mode}. Supported modes: ${VALID_AES_MODES.join(', ')}.`);
  }
  
  try {
    const keyBuffer = deriveKey(inputKey);
    const steps = [`Starting ${mode} decryption`];
    
    let parts, iv, authTag, ciphertext, decipher;
    
    if (mode.toUpperCase() === 'ECB') {
      // ECB mode (no IV)
      ciphertext = encryptedData;
      decipher = crypto.createDecipheriv(`aes-256-${mode.toLowerCase()}`, keyBuffer, null);
      steps.push('ECB mode: No IV required');
    } else if (mode.toUpperCase() === 'GCM') {
      // GCM mode format: IV:AUTH_TAG:CIPHERTEXT
      parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format for GCM. Expected IV:AUTH_TAG:CIPHERTEXT.');
      }
      iv = Buffer.from(parts[0], 'hex');
      authTag = Buffer.from(parts[1], 'hex');
      ciphertext = parts[2];
      decipher = crypto.createDecipheriv(`aes-256-${mode.toLowerCase()}`, keyBuffer, iv);
      decipher.setAuthTag(authTag); // Set the authentication tag for verification
      decipher.setAAD(Buffer.from('associated data')); // Must match encryption
      steps.push(`Using IV: ${iv.toString('hex')}`);
      steps.push(`Using Auth Tag: ${authTag.toString('hex')}`);
    } else {
      // Other modes format: IV:CIPHERTEXT
      parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error(`Invalid encrypted data format for ${mode}. Expected IV:ciphertext.`);
      }
      iv = Buffer.from(parts[0], 'hex');
      ciphertext = parts[1];
      decipher = crypto.createDecipheriv(`aes-256-${mode.toLowerCase()}`, keyBuffer, iv);
      steps.push(`Using IV: ${iv.toString('hex')}`);
    }
    
    steps.push(`Input ciphertext size: ${ciphertext.length / 2} bytes`);
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    steps.push(`Decrypted output size: ${Buffer.byteLength(decrypted, 'utf8')} bytes`);
    steps.push('Decryption completed');
    
    return { output: decrypted, steps };
  } catch (error) {
    if (error.message.includes('Unsupported state or unable to authenticate data')) {
      throw new Error('Authentication failed. The data may have been tampered with or the key is incorrect.');
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// --- Docker Commands Endpoints ---
// IMPORTANT: Container names are taken from Pasted_Text_1753349688734.txt
// Ensure these match your actual container names from docker-compose.yml

// Node 1 Stats
app.get("/run-stat1", (req, res) => {
  // Using container name from Pasted_Text_1753349688734.txt
  exec('docker stats hackathon-node1-1 --no-stream --format "{{.MemUsage}}"', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error fetching stats for Node 1: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr for Node 1 stats: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    const memoryBytes = parseDockerMemoryToBytes(stdout.trim());
    res.json({ output: memoryBytes });
  });
});

// Node 2 Stats
app.get("/run-stat2", (req, res) => {
  // Using container name from Pasted_Text_1753349688734.txt
  exec('docker stats hackathon-node2-1 --no-stream --format "{{.MemUsage}}"', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error fetching stats for Node 2: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr for Node 2 stats: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    const memoryBytes = parseDockerMemoryToBytes(stdout.trim());
    res.json({ output: memoryBytes });
  });
});

// Node 3 Stats
app.get("/run-stat3", (req, res) => {
  // Using container name from Pasted_Text_1753349688734.txt
  exec('docker stats hackathon-node3-1 --no-stream --format "{{.MemUsage}}"', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error fetching stats for Node 3: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr for Node 3 stats: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    const memoryBytes = parseDockerMemoryToBytes(stdout.trim());
    res.json({ output: memoryBytes });
  });
});

// Node 4 Stats (Hidden)
app.get("/run-stat4", (req, res) => {
  // Node 4 is intentionally hidden
  res.json({ output: "N/A (Hidden)" });
});

// Parse Docker memory output (e.g., "100MiB / 2GiB")
function parseDockerMemoryToBytes(memString) {
  const parts = memString.trim().split(' ')[0]; // Get the used part before '/'
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
    default: return 0;
  }
}

// Node 1 Logs
app.get("/run-log1", (req, res) => {
  // Using orchestrator container name from Pasted_Text_1753349688734.txt to curl Node 1
  exec("docker exec hackathon-node1-1 curl -s node1:5001/blacklisted", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error fetching logs for Node 1: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr for Node 1 log: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    console.log(`Log Output for Node 1: ${stdout}`);
    res.json({ output: stdout });
  });
});

// Node 2 Logs
app.get("/run-log2", (req, res) => {
  // Using orchestrator container name from Pasted_Text_1753349688734.txt to curl Node 2
  exec("docker exec hackathon-node1-1 curl -s node2:5002/blacklisted", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error fetching logs for Node 2: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr for Node 2 log: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    console.log(`Log Output for Node 2: ${stdout}`);
    res.json({ output: stdout });
  });
});

// Node 3 Logs
app.get("/run-log3", (req, res) => {
  // Using orchestrator container name from Pasted_Text_1753349688734.txt to curl Node 3
  exec("docker exec hackathon-node1-1 curl -s node3:5003/blacklisted", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error fetching logs for Node 3: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr for Node 3 log: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    console.log(`Log Output for Node 3: ${stdout}`);
    res.json({ output: stdout });
  });
});

// Node 1 Reset
app.get("/run-reset1", (req, res) => {
  // Using orchestrator container name from Pasted_Text_1753349688734.txt to reset Node 1's log
  exec("docker exec hackathon-node1-1 rm blacklisted_macs.log", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error resetting Node 1: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr for Node 1 reset: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    
    // Get updated log after reset
    exec("docker exec hackathon-node1-1 curl -s node1:5001/blacklisted", (logError, logStdout, logStderr) => {
      if (logError) {
        console.error(`Error fetching log after Node 1 reset: ${logError.message}`);
        return res.status(500).json({ error: logError.message });
      }
      if (logStderr) {
        console.error(`Stderr for Node 1 log after reset: ${logStderr}`);
        return res.status(500).json({ error: logStderr });
      }
      console.log(`Reset Log Output for Node 1: ${logStdout}`);
      res.json({ output: logStdout });
    });
  });
});

// Node 2 Reset
app.get("/run-reset2", (req, res) => {
  // Using orchestrator container name from Pasted_Text_1753349688734.txt to reset Node 2's log
  exec("docker exec hackathon-node1-1 rm blacklisted_macs.log", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error resetting Node 2: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr for Node 2 reset: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    
    // Get updated log after reset
    exec("docker exec hackathon-node1-1 curl -s node2:5002/blacklisted", (logError, logStdout, logStderr) => {
      if (logError) {
        console.error(`Error fetching log after Node 2 reset: ${logError.message}`);
        return res.status(500).json({ error: logError.message });
      }
      if (logStderr) {
        console.error(`Stderr for Node 2 log after reset: ${logStderr}`);
        return res.status(500).json({ error: logStderr });
      }
      console.log(`Reset Log Output for Node 2: ${logStdout}`);
      res.json({ output: logStdout });
    });
  });
});

// Node 3 Reset
app.get("/run-reset3", (req, res) => {
  // Using orchestrator container name from Pasted_Text_1753349688734.txt to reset Node 3's log
  exec("docker exec hackathon-node1-1 rm blacklisted_macs.log", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error resetting Node 3: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr for Node 3 reset: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    
    // Get updated log after reset
    exec("docker exec hackathon-node1-1 curl -s node3:5003/blacklisted", (logError, logStdout, logStderr) => {
      if (logError) {
        console.error(`Error fetching log after Node 3 reset: ${logError.message}`);
        return res.status(500).json({ error: logError.message });
      }
      if (logStderr) {
        console.error(`Stderr for Node 3 log after reset: ${logStderr}`);
        return res.status(500).json({ error: logStderr });
      }
      console.log(`Reset Log Output for Node 3: ${logStdout}`);
      res.json({ output: logStdout });
    });
  });
});

// --- AES Encryption/Decryption Endpoints ---

// AES Encryption Endpoint for Text
app.post('/encrypt-text/:nodeId', (req, res) => {
  const { text, key, mode = 'GCM' } = req.body;
  const nodeId = req.params.nodeId;
  
  console.log(`Node ${nodeId}: Encrypting text with ${mode} mode...`);
  
  if (!text || !key) {
    return res.status(400).json({ error: 'Text and AES key are required for encryption.' });
  }
  
  try {
    const { output: encryptedText, steps } = encryptAES(text, key, mode);
    res.json({ encryptedText, steps });
  } catch (error) {
    console.error(`Node ${nodeId}: Text encryption failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// AES Decryption Endpoint for Text
app.post('/decrypt-text/:nodeId', (req, res) => {
  const { encryptedText, key, mode = 'GCM' } = req.body;
  const nodeId = req.params.nodeId;
  
  console.log(`Node ${nodeId}: Decrypting text with ${mode} mode...`);
  
  if (!encryptedText || !key) {
    return res.status(400).json({ error: 'Encrypted text and AES key are required for decryption.' });
  }
  
  try {
    const { output: decryptedText, steps } = decryptAES(encryptedText, key, mode);
    res.json({ decryptedText, steps });
  } catch (error) {
    console.error(`Node ${nodeId}: Text decryption failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// AES Encryption Endpoint for Images
app.post('/encrypt-image/:nodeId', upload.single('image'), (req, res) => {
  const { key, mode = 'GCM' } = req.body;
  const nodeId = req.params.nodeId;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }
  
  if (!key) {
    return res.status(400).json({ error: 'AES key is required for image encryption.' });
  }
  
  console.log(`Node ${nodeId}: Encrypting image with ${mode} mode...`);
  
  fs.readFile(req.file.path, (err, data) => {
    if (err) {
      console.error('Error reading image file:', err);
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded image on read error:', unlinkErr);
      });
      return res.status(500).json({ error: 'Error reading image file.' });
    }
    
    try {
      // Convert binary image data to base64 string for encryption
      const base64ImageData = data.toString('base64'); 
      const { output: encryptedImage, steps } = encryptAES(base64ImageData, key, mode);
      
      // Clean up uploaded file
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded image:', unlinkErr);
      });
      
      res.json({ encryptedImage, steps });
    } catch (error) {
      console.error(`Node ${nodeId}: Image encryption failed:`, error.message);
      // Clean up uploaded file
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded image on encryption error:', unlinkErr);
      });
      res.status(500).json({ error: error.message });
    }
  });
});

// AES Decryption Endpoint for Images
app.post('/decrypt-image/:nodeId', (req, res) => {
  const { encryptedImage, key, mode = 'GCM' } = req.body;
  const nodeId = req.params.nodeId;
  
  if (!encryptedImage || !key) {
    return res.status(400).json({ error: 'Encrypted image data and AES key are required for decryption.' });
  }
  
  console.log(`Node ${nodeId}: Decrypting image with ${mode} mode...`);
  
  try {
    // Decrypt the base64 string of the image
    const { output: decryptedBase64, steps } = decryptAES(encryptedImage, key, mode);

    // Convert the decrypted base64 string back to a buffer
    const imageBuffer = Buffer.from(decryptedBase64, 'base64');

    // Determine the correct Content-Type (basic method, consider 'file-type' package)
    let contentType = 'application/octet-stream';
    if (decryptedBase64.startsWith('/9j/')) {
      contentType = 'image/jpeg';
    } else if (decryptedBase64.startsWith('iVBORw0KGgo')) {
      contentType = 'image/png';
    } else if (decryptedBase64.startsWith('R0lGOD')) {
      contentType = 'image/gif';
    }
    // Add more image type checks if necessary

    // Send the binary image data with the correct content-type header
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length
    });
    res.end(imageBuffer); // Send the raw image buffer

  } catch (error) {
    console.error(`Node ${nodeId}: Image decryption failed:`, error.message);
    // Send JSON error response for failures
    res.status(500).json({ error: error.message });
  }
});

// AEAD demonstration endpoint
app.post('/tamper-and-decrypt/:nodeId', (req, res) => {
  const { encryptedText, key, mode = 'GCM' } = req.body;
  const nodeId = req.params.nodeId;
  
  console.log(`Node ${nodeId}: Tampering with encrypted data and attempting decryption with ${mode}...`);
  
  if (!encryptedText || !key) {
    return res.status(400).json({ error: 'Encrypted text and AES key are required.' });
  }
  
  if (mode.toUpperCase() !== 'GCM') {
    return res.status(400).json({ error: 'Tampering demonstration only available for GCM mode.' });
  }
  
  try {
    // Split the GCM data
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format for GCM. Expected IV:AUTH_TAG:CIPHERTEXT.');
    }
    
    // Tamper with the ciphertext (modify one character)
    const originalCiphertext = parts[2];
    const tamperedCiphertext = originalCiphertext.slice(0, -1) + 
      (originalCiphertext.slice(-1) === '0' ? '1' : '0');
    
    // Reconstruct with tampered data
    const tamperedData = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;
    
    // Attempt decryption - this should fail authentication
    const { output, steps } = decryptAES(tamperedData, key, mode);
    
    // If we get here, something unexpected happened
    res.json({ 
      result: output, 
      steps, 
      message: "Unexpected: Decryption succeeded despite tampering" 
    });
  } catch (error) {
    console.error(`Node ${nodeId}: Tampered decryption failed as expected:`, error.message);
    res.status(400).json({ 
      error: error.message,
      message: "Authentication correctly failed due to data tampering"
    });
  }
});

// Malware Analyzer Endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  
  const filePath = req.file.path;
  const originalname = req.file.originalname;
  
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    
    const flaskResponse = await axios.post("http://localhost:5050/predict", formData, {
      headers: formData.getHeaders(),
    });
    
    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });
    
    res.json({ result: flaskResponse.data, filename: originalname });
  } catch (error) {
    console.error("Malware analysis error:", error.message);
    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });
    
    if (error.response) {
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: "Internal server error during malware analysis" });
    }
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Defensys Server running on port ${PORT}`);
});