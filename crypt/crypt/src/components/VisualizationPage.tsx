import React, { useState, useEffect, useRef } from 'react';
import { AESTool } from '../utils/aesModes';
import { Visualization } from '../utils/visualization';

interface VisualizationPageProps {
  mode: string;
  onBack: () => void;
}

const VisualizationPage: React.FC<VisualizationPageProps> = ({ mode, onBack }) => {
  const [plaintext, setPlaintext] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [currentKey, setCurrentKey] = useState('');
  const [ciphertext, setCiphertext] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [selectedState, setSelectedState] = useState<any>(null);
  const [isProcessed, setIsProcessed] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [operationMode, setOperationMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const encryptedImageCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageCanvasRef = useRef<HTMLCanvasElement>(null);
  const decryptedImageCanvasRef = useRef<HTMLCanvasElement>(null);
  const visualizationRef = useRef<Visualization | null>(null);

  const modeNames: Record<string, string> = {
    ecb: 'ECB (Electronic Codebook)',
    cbc: 'CBC (Cipher Block Chaining)',
    ctr: 'CTR (Counter Mode)',
    cfb: 'CFB (Cipher Feedback)',
    ofb: 'OFB (Output Feedback)'
  };

  useEffect(() => {
    generateNewKey();
  }, []);

  useEffect(() => {
    if (canvasContainerRef.current && !visualizationRef.current) {
      visualizationRef.current = new Visualization(canvasContainerRef.current, handleStateClick);
    }
    
    return () => {
      if (visualizationRef.current) {
        visualizationRef.current.destroy();
        visualizationRef.current = null;
      }
    };
  }, []);

  const generateNewKey = () => {
    const key = AESTool.generateRandomKey();
    setCurrentKey(key);
  };

  const handleStateClick = (stateData: any) => {
    setSelectedState(stateData);
  };

  const processInput = async () => {
    if (!currentKey) return;

    let inputData: any;
    let isImage = false;

    if (imageFile) {
      const result = await processImageFile(imageFile);
      inputData = result.wordArray;
      setOriginalImageData(result.imageData);
      isImage = true;
    } else if (plaintext.trim()) {
      inputData = AESTool.stringToWordArray(plaintext);
    } else {
      alert('Please enter text or select an image file');
      return;
    }

    try {
      const keyWordArray = (window as any).CryptoJS.enc.Hex.parse(currentKey);
      let result: any;

      if (operationMode === 'encrypt') {
        switch (mode) {
          case 'ecb':
            result = AESTool.encryptECB(inputData, keyWordArray);
            break;
          case 'cbc':
            result = AESTool.encryptCBC(inputData, keyWordArray);
            break;
          case 'ctr':
            result = AESTool.encryptCTR(inputData, keyWordArray);
            break;
          case 'cfb':
            result = AESTool.encryptCFB(inputData, keyWordArray);
            break;
          case 'ofb':
            result = AESTool.encryptOFB(inputData, keyWordArray);
            break;
          default:
            throw new Error('Unknown mode');
        }

        setCiphertext(result.ciphertext);
        setDecryptedText('');
        setIsDecrypted(false);
        
        if (visualizationRef.current) {
          visualizationRef.current.drawMode(mode, result.intermediateStates);
        }

        if (isImage && originalImageData) {
          renderEncryptedImage(result.ciphertext, originalImageData);
          renderOriginalImage(originalImageData);
        }
      } else {
        // Decryption mode
        if (!ciphertext) {
          alert('No ciphertext to decrypt. Please encrypt something first.');
          return;
        }

        const ciphertextWordArray = (window as any).CryptoJS.enc.Hex.parse(ciphertext);
        
        switch (mode) {
          case 'ecb':
            result = AESTool.decryptECB(ciphertextWordArray, keyWordArray);
            break;
          case 'cbc':
            result = AESTool.decryptCBC(ciphertextWordArray, keyWordArray);
            break;
          case 'ctr':
            result = AESTool.decryptCTR(ciphertextWordArray, keyWordArray);
            break;
          case 'cfb':
            result = AESTool.decryptCFB(ciphertextWordArray, keyWordArray);
            break;
          case 'ofb':
            result = AESTool.decryptOFB(ciphertextWordArray, keyWordArray);
            break;
          default:
            throw new Error('Unknown mode');
        }

        if (isImage && originalImageData) {
          renderDecryptedImage(result.plaintext, originalImageData);
        } else {
          setDecryptedText(AESTool.wordArrayToString(result.plaintext));
        }
        
        setIsDecrypted(true);
        
        if (visualizationRef.current) {
          visualizationRef.current.drawMode(mode, result.intermediateStates);
        }
      }

      setIsProcessed(true);
    } catch (error) {
      console.error('Encryption/Decryption error:', error);
      alert('Error during operation. Please try again.');
    }
  };

  const processImageFile = (file: File): Promise<{wordArray: any, imageData: ImageData}> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxSize = 128;
        let { width, height } = img;
        
        // Scale down if too large
        if (width > maxSize || height > maxSize) {
          const scale = Math.min(maxSize / width, maxSize / height);
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx!.drawImage(img, 0, 0, width, height);
        
        const imageData = ctx!.getImageData(0, 0, width, height);
        const wordArray = AESTool.pixelDataToWordArray(imageData);
        resolve({ wordArray, imageData });
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const renderOriginalImage = (imageData: ImageData) => {
    const canvas = originalImageCanvasRef.current;
    if (!canvas) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
  };

  const renderEncryptedImage = (ciphertextHex: string, originalImageData: ImageData) => {
    const canvas = encryptedImageCanvasRef.current;
    if (!canvas) return;

    canvas.width = originalImageData.width;
    canvas.height = originalImageData.height;
    const ctx = canvas.getContext('2d')!;
    
    try {
      // Convert hex string to bytes
      const hexBytes = ciphertextHex.match(/.{2}/g) || [];
      const bytes = new Uint8Array(hexBytes.map(byte => parseInt(byte, 16)));
      
      // Create new image data
      const encryptedImageData = ctx.createImageData(originalImageData.width, originalImageData.height);
      
      // Fill with encrypted data
      const pixelCount = originalImageData.width * originalImageData.height;
      const bytesPerPixel = 4; // RGBA
      
      for (let i = 0; i < pixelCount; i++) {
        const pixelIndex = i * bytesPerPixel;
        const byteIndex = i * bytesPerPixel;
        
        if (byteIndex < bytes.length) {
          // Use encrypted bytes for RGB
          encryptedImageData.data[pixelIndex] = bytes[byteIndex] || 0;     // R
          encryptedImageData.data[pixelIndex + 1] = bytes[byteIndex + 1] || 0; // G
          encryptedImageData.data[pixelIndex + 2] = bytes[byteIndex + 2] || 0; // B
          encryptedImageData.data[pixelIndex + 3] = 255; // A (fully opaque)
        } else {
          // Fill remaining pixels with noise pattern
          encryptedImageData.data[pixelIndex] = Math.floor(Math.random() * 256);
          encryptedImageData.data[pixelIndex + 1] = Math.floor(Math.random() * 256);
          encryptedImageData.data[pixelIndex + 2] = Math.floor(Math.random() * 256);
          encryptedImageData.data[pixelIndex + 3] = 255;
        }
      }
      
      ctx.putImageData(encryptedImageData, 0, 0);
    } catch (error) {
      console.error('Error rendering encrypted image:', error);
      // Fallback: create a visible noise pattern
      const imageData = ctx.createImageData(originalImageData.width, originalImageData.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.floor(Math.random() * 256);     // R
        imageData.data[i + 1] = Math.floor(Math.random() * 256); // G
        imageData.data[i + 2] = Math.floor(Math.random() * 256); // B
        imageData.data[i + 3] = 255;                             // A
      }
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const renderDecryptedImage = (plaintextWordArray: any, originalImageData: ImageData) => {
    const canvas = decryptedImageCanvasRef.current;
    if (!canvas) return;

    canvas.width = originalImageData.width;
    canvas.height = originalImageData.height;
    const ctx = canvas.getContext('2d')!;
    
    try {
      const decryptedImageData = AESTool.wordArrayToPixelData(plaintextWordArray, originalImageData.width, originalImageData.height);
      ctx.putImageData(decryptedImageData, 0, 0);
    } catch (error) {
      console.error('Error rendering decrypted image:', error);
      // Show original as fallback
      ctx.putImageData(originalImageData, 0, 0);
    }
  };

  const resetVisualization = () => {
    setPlaintext('');
    setImageFile(null);
    setOriginalImageData(null);
    setCiphertext('');
    setDecryptedText('');
    setSelectedState(null);
    setIsProcessed(false);
    setIsDecrypted(false);
    setOperationMode('encrypt');
    
    if (visualizationRef.current) {
      visualizationRef.current.clearStage();
    }
    
    // Clear canvases
    [encryptedImageCanvasRef, originalImageCanvasRef, decryptedImageCanvasRef].forEach(canvasRef => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    });
  };

  const formatHexDisplay = (hex: string) => {
    return hex.match(/.{1,32}/g)?.join('\n') || hex;
  };

  return (
    <div className="retro-container">
      <div className="back-button">
        <button className="retro-button" onClick={onBack}>
          &lt; BACK TO DESCRIPTION
        </button>
      </div>

      <h1 className="retro-title">{modeNames[mode]}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Control Panel */}
        <div className="control-panel">
          <h2 className="retro-subtitle">OPERATION MODE</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button 
              className={`retro-button ${operationMode === 'encrypt' ? 'active' : ''}`}
              onClick={() => setOperationMode('encrypt')}
              style={{ 
                flex: 1,
                backgroundColor: operationMode === 'encrypt' ? '#39FF14' : '#004400',
                color: operationMode === 'encrypt' ? '#000000' : '#00FF00'
              }}
            >
              ENCRYPT
            </button>
            <button 
              className={`retro-button ${operationMode === 'decrypt' ? 'active' : ''}`}
              onClick={() => setOperationMode('decrypt')}
              style={{ 
                flex: 1,
                backgroundColor: operationMode === 'decrypt' ? '#39FF14' : '#004400',
                color: operationMode === 'decrypt' ? '#000000' : '#00FF00'
              }}
            >
              DECRYPT
            </button>
          </div>

          <h2 className="retro-subtitle">INPUT</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label className="retro-text" style={{ display: 'block', marginBottom: '10px' }}>
              Text Input:
            </label>
            <textarea
              className="retro-textarea"
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              placeholder={operationMode === 'encrypt' ? "Enter plaintext..." : "Enter ciphertext (hex)..."}
              rows={4}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="retro-text" style={{ display: 'block', marginBottom: '10px' }}>
              Image Input:
            </label>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="image-input"
                accept="image/png,image/jpeg,image/bmp"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="image-input" className="file-input-label">
                {imageFile ? imageFile.name : 'Choose Image File'}
              </label>
            </div>
            <p className="retro-text" style={{ fontSize: '8px', marginTop: '5px' }}>
              Max 128x128 pixels recommended
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <button className="retro-button" onClick={processInput} style={{ width: '100%' }}>
              {operationMode === 'encrypt' ? 'ENCRYPT INPUT' : 'DECRYPT INPUT'}
            </button>
          </div>

          <h2 className="retro-subtitle">ENCRYPTION KEY</h2>
          <div className="hex-display" style={{ marginBottom: '10px' }}>
            {formatHexDisplay(currentKey)}
          </div>
          <button className="retro-button" onClick={generateNewKey} style={{ width: '100%', marginBottom: '20px' }}>
            GENERATE NEW KEY
          </button>

          <button className="retro-button" onClick={resetVisualization} style={{ width: '100%' }}>
            RESET VISUALIZATION
          </button>

          {selectedState && (
            <div className="state-display">
              <h3 className="retro-text" style={{ color: '#39FF14', marginBottom: '10px' }}>
                CURRENT STAGE DATA:
              </h3>
              <div className="retro-text">
                <strong>Stage:</strong> {selectedState.stage}
              </div>
              <div className="retro-text">
                <strong>Block:</strong> {selectedState.block}
              </div>
              <div className="retro-text">
                <strong>Hex:</strong>
              </div>
              <div className="hex-display">
                {formatHexDisplay(selectedState.hexData)}
              </div>
              {selectedState.textData && (
                <>
                  <div className="retro-text">
                    <strong>Text:</strong>
                  </div>
                  <div className="hex-display">
                    {selectedState.textData}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Visualization Area */}
        <div className="visualization-area">
          <div ref={canvasContainerRef} style={{ width: '100%', height: '600px' }} />
          
          {isProcessed && (
            <div style={{ padding: '20px' }}>
              {operationMode === 'encrypt' && ciphertext && (
                <>
                  <h3 className="retro-subtitle">CIPHERTEXT OUTPUT:</h3>
                  <div className="hex-display">
                    {formatHexDisplay(ciphertext)}
                  </div>
                </>
              )}
              
              {operationMode === 'decrypt' && isDecrypted && (
                <>
                  <h3 className="retro-subtitle">DECRYPTED OUTPUT:</h3>
                  <div className="hex-display">
                    {decryptedText || 'Image data decrypted (see preview below)'}
                  </div>
                </>
              )}
              
              {imageFile && originalImageData && (
                <div style={{ marginTop: '20px' }}>
                  <h3 className="retro-subtitle">IMAGE COMPARISON:</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isDecrypted ? '1fr 1fr 1fr' : '1fr 1fr', 
                    gap: '20px', 
                    marginTop: '15px' 
                  }}>
                    <div>
                      <h4 className="retro-text" style={{ marginBottom: '10px', textAlign: 'center' }}>
                        ORIGINAL IMAGE:
                      </h4>
                      <div className="canvas-container">
                        <canvas 
                          ref={originalImageCanvasRef} 
                          style={{ 
                            maxWidth: '100%', 
                            imageRendering: 'pixelated',
                            border: '1px solid #00FF00'
                          }} 
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="retro-text" style={{ marginBottom: '10px', textAlign: 'center' }}>
                        ENCRYPTED IMAGE:
                      </h4>
                      <div className="canvas-container">
                        <canvas 
                          ref={encryptedImageCanvasRef} 
                          style={{ 
                            maxWidth: '100%', 
                            imageRendering: 'pixelated',
                            border: '1px solid #00FF00'
                          }} 
                        />
                      </div>
                    </div>
                    {isDecrypted && (
                      <div>
                        <h4 className="retro-text" style={{ marginBottom: '10px', textAlign: 'center' }}>
                          DECRYPTED IMAGE:
                        </h4>
                        <div className="canvas-container">
                          <canvas 
                            ref={decryptedImageCanvasRef} 
                            style={{ 
                              maxWidth: '100%', 
                              imageRendering: 'pixelated',
                              border: '1px solid #00FF00'
                            }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="retro-text" style={{ fontSize: '10px', marginTop: '10px', textAlign: 'center' }}>
                    Notice how {mode.toUpperCase()} mode affects the visual patterns in the encrypted image
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualizationPage;