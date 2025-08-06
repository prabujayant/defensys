declare global {
  interface Window {
    CryptoJS: any;
  }
}

export class AESTool {
  static generateRandomKey(): string {
    const array = new Uint8Array(32); // 256-bit key
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static stringToWordArray(str: string): any {
    return window.CryptoJS.enc.Utf8.parse(str);
  }

  static wordArrayToString(wordArray: any): string {
    return window.CryptoJS.enc.Utf8.stringify(wordArray);
  }

  static pixelDataToWordArray(imageData: ImageData): any {
    // Convert ImageData to bytes array
    const bytes = new Uint8Array(imageData.data.buffer);
    
    // Pad to multiple of 16 bytes (AES block size)
    const paddedLength = Math.ceil(bytes.length / 16) * 16;
    const paddedBytes = new Uint8Array(paddedLength);
    paddedBytes.set(bytes);
    
    // Fill remaining bytes with PKCS7 padding
    const paddingValue = paddedLength - bytes.length;
    for (let i = bytes.length; i < paddedLength; i++) {
      paddedBytes[i] = paddingValue;
    }
    
    // Convert to hex string and then to WordArray
    const hex = Array.from(paddedBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return window.CryptoJS.enc.Hex.parse(hex);
  }

  static wordArrayToPixelData(wordArray: any, width: number, height: number): ImageData {
    const hex = window.CryptoJS.enc.Hex.stringify(wordArray);
    const bytes = new Uint8Array(hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const imageData = new ImageData(width, height);
    
    // Copy bytes to image data
    const minLength = Math.min(bytes.length, imageData.data.length);
    for (let i = 0; i < minLength; i++) {
      imageData.data[i] = bytes[i];
    }
    
    // Fill alpha channel if not present
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) imageData.data[i] = 255;
    }
    
    return imageData;
  }

  static padWordArray(wordArray: any): any {
    const blockSize = 4; // 128 bits / 32 bits per word
    const sigBytes = wordArray.sigBytes;
    const padding = blockSize - (sigBytes % blockSize);
    
    if (padding !== blockSize) {
      for (let i = 0; i < padding; i++) {
        wordArray.words.push(padding << 24);
      }
      wordArray.sigBytes += padding;
    }
    
    return wordArray;
  }

  // ENCRYPTION METHODS
  static encryptECB(plaintext: any, key: any): any {
    const intermediateStates: any[] = [];
    const blockSize = 16; // 128 bits
    const blocks: any[] = [];
    
    // Split into 16-byte blocks
    let currentPos = 0;
    while (currentPos < plaintext.sigBytes) {
      const remainingBytes = Math.min(blockSize, plaintext.sigBytes - currentPos);
      const blockWords = [];
      
      // Extract words for this block
      for (let i = 0; i < Math.ceil(remainingBytes / 4); i++) {
        const wordIndex = Math.floor((currentPos + i * 4) / 4);
        blockWords.push(plaintext.words[wordIndex] || 0);
      }
      
      const blockData = window.CryptoJS.lib.WordArray.create(blockWords, remainingBytes);
      
      // Pad block if necessary
      if (blockData.sigBytes < blockSize) {
        const padding = blockSize - blockData.sigBytes;
        const paddingWord = (padding << 24) | (padding << 16) | (padding << 8) | padding;
        
        while (blockData.sigBytes < blockSize) {
          if (blockData.words.length <= Math.floor(blockData.sigBytes / 4)) {
            blockData.words.push(paddingWord);
          }
          blockData.sigBytes = Math.min(blockData.sigBytes + 4, blockSize);
        }
      }
      
      blocks.push(blockData);
      currentPos += blockSize;
    }

    const encryptedBlocks: any[] = [];
    
    blocks.forEach((block, index) => {
      intermediateStates.push({
        stage: 'Plaintext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(block),
        textData: this.tryDecodeText(block)
      });

      const encrypted = window.CryptoJS.AES.encrypt(block, key, {
        mode: window.CryptoJS.mode.ECB,
        padding: window.CryptoJS.pad.NoPadding
      });

      intermediateStates.push({
        stage: 'AES Encryption',
        block: index + 1,
        hexData: encrypted.ciphertext.toString(),
        textData: null
      });

      encryptedBlocks.push(encrypted.ciphertext);
    });

    const finalCiphertext = encryptedBlocks.reduce((acc, block) => acc + block.toString(), '');
    
    return {
      ciphertext: finalCiphertext,
      intermediateStates
    };
  }

  static encryptCBC(plaintext: any, key: any): any {
    const intermediateStates: any[] = [];
    const blockSize = 16;
    const iv = window.CryptoJS.lib.WordArray.random(16);
    
    intermediateStates.push({
      stage: 'Initialization Vector',
      block: 0,
      hexData: window.CryptoJS.enc.Hex.stringify(iv),
      textData: null
    });

    const blocks: any[] = [];
    let currentPos = 0;
    while (currentPos < plaintext.sigBytes) {
      const remainingBytes = Math.min(blockSize, plaintext.sigBytes - currentPos);
      const blockWords = [];
      
      for (let i = 0; i < Math.ceil(remainingBytes / 4); i++) {
        const wordIndex = Math.floor((currentPos + i * 4) / 4);
        blockWords.push(plaintext.words[wordIndex] || 0);
      }
      
      const blockData = window.CryptoJS.lib.WordArray.create(blockWords, remainingBytes);
      
      // Pad block if necessary
      if (blockData.sigBytes < blockSize) {
        const padding = blockSize - blockData.sigBytes;
        const paddingWord = (padding << 24) | (padding << 16) | (padding << 8) | padding;
        
        while (blockData.sigBytes < blockSize) {
          if (blockData.words.length <= Math.floor(blockData.sigBytes / 4)) {
            blockData.words.push(paddingWord);
          }
          blockData.sigBytes = Math.min(blockData.sigBytes + 4, blockSize);
        }
      }
      
      blocks.push(blockData);
      currentPos += blockSize;
    }

    const encryptedBlocks: any[] = [];
    let previousCiphertext = iv;

    blocks.forEach((block, index) => {
      intermediateStates.push({
        stage: 'Plaintext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(block),
        textData: this.tryDecodeText(block)
      });

      // XOR with previous ciphertext
      const xorResult = this.xorWordArrays(block, previousCiphertext);
      
      intermediateStates.push({
        stage: 'XOR with Previous',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(xorResult),
        textData: null
      });

      const encrypted = window.CryptoJS.AES.encrypt(xorResult, key, {
        mode: window.CryptoJS.mode.ECB,
        padding: window.CryptoJS.pad.NoPadding
      });

      intermediateStates.push({
        stage: 'AES Encryption',
        block: index + 1,
        hexData: encrypted.ciphertext.toString(),
        textData: null
      });

      encryptedBlocks.push(encrypted.ciphertext);
      previousCiphertext = encrypted.ciphertext;
    });

    const finalCiphertext = window.CryptoJS.enc.Hex.stringify(iv) + encryptedBlocks.reduce((acc, block) => acc + block.toString(), '');
    
    return {
      ciphertext: finalCiphertext,
      intermediateStates,
      iv: window.CryptoJS.enc.Hex.stringify(iv)
    };
  }

  static encryptCTR(plaintext: any, key: any): any {
    const intermediateStates: any[] = [];
    const blockSize = 16;
    const nonce = window.CryptoJS.lib.WordArray.random(12);
    let counter = 1;

    intermediateStates.push({
      stage: 'Nonce',
      block: 0,
      hexData: window.CryptoJS.enc.Hex.stringify(nonce),
      textData: null
    });

    const blocks: any[] = [];
    let currentPos = 0;
    while (currentPos < plaintext.sigBytes) {
      const remainingBytes = Math.min(blockSize, plaintext.sigBytes - currentPos);
      const blockWords = [];
      
      for (let i = 0; i < Math.ceil(remainingBytes / 4); i++) {
        const wordIndex = Math.floor((currentPos + i * 4) / 4);
        blockWords.push(plaintext.words[wordIndex] || 0);
      }
      
      const blockData = window.CryptoJS.lib.WordArray.create(blockWords, remainingBytes);
      blocks.push(blockData);
      currentPos += blockSize;
    }

    const encryptedBlocks: any[] = [];

    blocks.forEach((block, index) => {
      intermediateStates.push({
        stage: 'Plaintext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(block),
        textData: this.tryDecodeText(block)
      });

      // Create counter block (nonce + counter)
      const counterBytes = new Uint8Array(4);
      counterBytes[0] = (counter >>> 24) & 0xFF;
      counterBytes[1] = (counter >>> 16) & 0xFF;
      counterBytes[2] = (counter >>> 8) & 0xFF;
      counterBytes[3] = counter & 0xFF;
      
      const nonceBytes = new Uint8Array(window.CryptoJS.enc.Hex.parse(window.CryptoJS.enc.Hex.stringify(nonce)).sigBytes);
      for (let i = 0; i < nonceBytes.length; i++) {
        nonceBytes[i] = (nonce.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8)) & 0xFF;
      }
      
      const counterBlockBytes = new Uint8Array(16);
      counterBlockBytes.set(nonceBytes.slice(0, 12));
      counterBlockBytes.set(counterBytes, 12);
      
      const counterBlockHex = Array.from(counterBlockBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      const counterBlock = window.CryptoJS.enc.Hex.parse(counterBlockHex);

      intermediateStates.push({
        stage: 'Counter Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(counterBlock),
        textData: null
      });

      // Encrypt counter
      const keystream = window.CryptoJS.AES.encrypt(counterBlock, key, {
        mode: window.CryptoJS.mode.ECB,
        padding: window.CryptoJS.pad.NoPadding
      });

      intermediateStates.push({
        stage: 'Keystream',
        block: index + 1,
        hexData: keystream.ciphertext.toString(),
        textData: null
      });

      // XOR with plaintext (only use as many bytes as needed)
      const keystreamTruncated = window.CryptoJS.lib.WordArray.create(
        keystream.ciphertext.words.slice(0, Math.ceil(block.sigBytes / 4)),
        block.sigBytes
      );
      const ciphertext = this.xorWordArrays(block, keystreamTruncated);

      intermediateStates.push({
        stage: 'XOR Result',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(ciphertext),
        textData: null
      });

      encryptedBlocks.push(ciphertext);
      counter++;
    });

    const finalCiphertext = window.CryptoJS.enc.Hex.stringify(nonce) + encryptedBlocks.reduce((acc, block) => acc + window.CryptoJS.enc.Hex.stringify(block), '');
    
    return {
      ciphertext: finalCiphertext,
      intermediateStates,
      nonce: window.CryptoJS.enc.Hex.stringify(nonce)
    };
  }

  static encryptCFB(plaintext: any, key: any): any {
    const intermediateStates: any[] = [];
    const blockSize = 16;
    const iv = window.CryptoJS.lib.WordArray.random(16);
    
    intermediateStates.push({
      stage: 'Initialization Vector',
      block: 0,
      hexData: window.CryptoJS.enc.Hex.stringify(iv),
      textData: null
    });

    const blocks: any[] = [];
    let currentPos = 0;
    while (currentPos < plaintext.sigBytes) {
      const remainingBytes = Math.min(blockSize, plaintext.sigBytes - currentPos);
      const blockWords = [];
      
      for (let i = 0; i < Math.ceil(remainingBytes / 4); i++) {
        const wordIndex = Math.floor((currentPos + i * 4) / 4);
        blockWords.push(plaintext.words[wordIndex] || 0);
      }
      
      const blockData = window.CryptoJS.lib.WordArray.create(blockWords, remainingBytes);
      blocks.push(blockData);
      currentPos += blockSize;
    }

    const encryptedBlocks: any[] = [];
    let feedbackRegister = iv;

    blocks.forEach((block, index) => {
      intermediateStates.push({
        stage: 'Plaintext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(block),
        textData: this.tryDecodeText(block)
      });

      // Encrypt feedback register
      const keystreamBlock = window.CryptoJS.AES.encrypt(feedbackRegister, key, {
        mode: window.CryptoJS.mode.ECB,
        padding: window.CryptoJS.pad.NoPadding
      });

      intermediateStates.push({
        stage: 'Keystream Block',
        block: index + 1,
        hexData: keystreamBlock.ciphertext.toString(),
        textData: null
      });

      // XOR with plaintext (only use as many bytes as needed)
      const keystreamTruncated = window.CryptoJS.lib.WordArray.create(
        keystreamBlock.ciphertext.words.slice(0, Math.ceil(block.sigBytes / 4)),
        block.sigBytes
      );
      const ciphertext = this.xorWordArrays(block, keystreamTruncated);

      intermediateStates.push({
        stage: 'Ciphertext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(ciphertext),
        textData: null
      });

      encryptedBlocks.push(ciphertext);
      
      // For CFB, feedback the ciphertext (padded to full block size for next iteration)
      if (index < blocks.length - 1) {
        const paddedCiphertext = window.CryptoJS.lib.WordArray.create(
          keystreamBlock.ciphertext.words.slice(),
          16
        );
        // Replace the first part with actual ciphertext
        const ciphertextBytes = window.CryptoJS.enc.Hex.parse(window.CryptoJS.enc.Hex.stringify(ciphertext));
        for (let i = 0; i < Math.min(ciphertextBytes.words.length, paddedCiphertext.words.length); i++) {
          paddedCiphertext.words[i] = ciphertextBytes.words[i];
        }
        feedbackRegister = paddedCiphertext;
      }
    });

    const finalCiphertext = window.CryptoJS.enc.Hex.stringify(iv) + encryptedBlocks.reduce((acc, block) => acc + window.CryptoJS.enc.Hex.stringify(block), '');
    
    return {
      ciphertext: finalCiphertext,
      intermediateStates,
      iv: window.CryptoJS.enc.Hex.stringify(iv)
    };
  }

  static encryptOFB(plaintext: any, key: any): any {
    const intermediateStates: any[] = [];
    const blockSize = 16;
    const iv = window.CryptoJS.lib.WordArray.random(16);
    
    intermediateStates.push({
      stage: 'Initialization Vector',
      block: 0,
      hexData: window.CryptoJS.enc.Hex.stringify(iv),
      textData: null
    });

    const blocks: any[] = [];
    let currentPos = 0;
    while (currentPos < plaintext.sigBytes) {
      const remainingBytes = Math.min(blockSize, plaintext.sigBytes - currentPos);
      const blockWords = [];
      
      for (let i = 0; i < Math.ceil(remainingBytes / 4); i++) {
        const wordIndex = Math.floor((currentPos + i * 4) / 4);
        blockWords.push(plaintext.words[wordIndex] || 0);
      }
      
      const blockData = window.CryptoJS.lib.WordArray.create(blockWords, remainingBytes);
      blocks.push(blockData);
      currentPos += blockSize;
    }

    const encryptedBlocks: any[] = [];
    let feedbackRegister = iv;

    blocks.forEach((block, index) => {
      intermediateStates.push({
        stage: 'Plaintext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(block),
        textData: this.tryDecodeText(block)
      });

      // Encrypt feedback register
      const keystreamBlock = window.CryptoJS.AES.encrypt(feedbackRegister, key, {
        mode: window.CryptoJS.mode.ECB,
        padding: window.CryptoJS.pad.NoPadding
      });

      intermediateStates.push({
        stage: 'Keystream Block',
        block: index + 1,
        hexData: keystreamBlock.ciphertext.toString(),
        textData: null
      });

      // XOR with plaintext (only use as many bytes as needed)
      const keystreamTruncated = window.CryptoJS.lib.WordArray.create(
        keystreamBlock.ciphertext.words.slice(0, Math.ceil(block.sigBytes / 4)),
        block.sigBytes
      );
      const ciphertext = this.xorWordArrays(block, keystreamTruncated);

      intermediateStates.push({
        stage: 'Ciphertext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(ciphertext),
        textData: null
      });

      encryptedBlocks.push(ciphertext);
      
      // For OFB, feedback the keystream output (not the ciphertext)
      feedbackRegister = keystreamBlock.ciphertext;
    });

    const finalCiphertext = window.CryptoJS.enc.Hex.stringify(iv) + encryptedBlocks.reduce((acc, block) => acc + window.CryptoJS.enc.Hex.stringify(block), '');
    
    return {
      ciphertext: finalCiphertext,
      intermediateStates,
      iv: window.CryptoJS.enc.Hex.stringify(iv)
    };
  }

  // DECRYPTION METHODS
  static decryptECB(ciphertext: any, key: any): any {
    const intermediateStates: any[] = [];
    const blockSize = 16;
    const blocks: any[] = [];
    
    // Split ciphertext into blocks
    let currentPos = 0;
    while (currentPos < ciphertext.sigBytes) {
      const remainingBytes = Math.min(blockSize, ciphertext.sigBytes - currentPos);
      const blockWords = [];
      
      for (let i = 0; i < Math.ceil(remainingBytes / 4); i++) {
        const wordIndex = Math.floor((currentPos + i * 4) / 4);
        blockWords.push(ciphertext.words[wordIndex] || 0);
      }
      
      const blockData = window.CryptoJS.lib.WordArray.create(blockWords, remainingBytes);
      blocks.push(blockData);
      currentPos += blockSize;
    }

    const decryptedBlocks: any[] = [];
    
    blocks.forEach((block, index) => {
      intermediateStates.push({
        stage: 'Ciphertext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(block),
        textData: null
      });

      const decrypted = window.CryptoJS.AES.decrypt(
        { ciphertext: block },
        key,
        {
          mode: window.CryptoJS.mode.ECB,
          padding: window.CryptoJS.pad.NoPadding
        }
      );

      intermediateStates.push({
        stage: 'AES Decryption',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(decrypted),
        textData: this.tryDecodeText(decrypted)
      });

      decryptedBlocks.push(decrypted);
    });

    const finalPlaintext = window.CryptoJS.lib.WordArray.create(
      decryptedBlocks.reduce((acc, block) => acc.concat(block.words), []),
      decryptedBlocks.reduce((acc, block) => acc + block.sigBytes, 0)
    );
    
    return {
      plaintext: finalPlaintext,
      intermediateStates
    };
  }

  static decryptCBC(ciphertext: any, key: any): any {
    const intermediateStates: any[] = [];
    const blockSize = 16;
    
    // Extract IV from the beginning of ciphertext
    const ivHex = window.CryptoJS.enc.Hex.stringify(ciphertext).substring(0, 32);
    const iv = window.CryptoJS.enc.Hex.parse(ivHex);
    const actualCiphertext = window.CryptoJS.enc.Hex.parse(
      window.CryptoJS.enc.Hex.stringify(ciphertext).substring(32)
    );
    
    intermediateStates.push({
      stage: 'Initialization Vector',
      block: 0,
      hexData: ivHex,
      textData: null
    });

    const blocks: any[] = [];
    let currentPos = 0;
    while (currentPos < actualCiphertext.sigBytes) {
      const remainingBytes = Math.min(blockSize, actualCiphertext.sigBytes - currentPos);
      const blockWords = [];
      
      for (let i = 0; i < Math.ceil(remainingBytes / 4); i++) {
        const wordIndex = Math.floor((currentPos + i * 4) / 4);
        blockWords.push(actualCiphertext.words[wordIndex] || 0);
      }
      
      const blockData = window.CryptoJS.lib.WordArray.create(blockWords, remainingBytes);
      blocks.push(blockData);
      currentPos += blockSize;
    }

    const decryptedBlocks: any[] = [];
    let previousCiphertext = iv;

    blocks.forEach((block, index) => {
      intermediateStates.push({
        stage: 'Ciphertext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(block),
        textData: null
      });

      const decrypted = window.CryptoJS.AES.decrypt(
        { ciphertext: block },
        key,
        {
          mode: window.CryptoJS.mode.ECB,
          padding: window.CryptoJS.pad.NoPadding
        }
      );

      intermediateStates.push({
        stage: 'AES Decryption',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(decrypted),
        textData: null
      });

      // XOR with previous ciphertext/IV
      const plaintext = this.xorWordArrays(decrypted, previousCiphertext);
      
      intermediateStates.push({
        stage: 'XOR with Previous',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(plaintext),
        textData: this.tryDecodeText(plaintext)
      });

      decryptedBlocks.push(plaintext);
      previousCiphertext = block;
    });

    const finalPlaintext = window.CryptoJS.lib.WordArray.create(
      decryptedBlocks.reduce((acc, block) => acc.concat(block.words), []),
      decryptedBlocks.reduce((acc, block) => acc + block.sigBytes, 0)
    );
    
    return {
      plaintext: finalPlaintext,
      intermediateStates
    };
  }

  static decryptCTR(ciphertext: any, key: any): any {
    const intermediateStates: any[] = [];
    
    // Extract nonce from the beginning of ciphertext
    const nonceHex = window.CryptoJS.enc.Hex.stringify(ciphertext).substring(0, 24);
    const nonce = window.CryptoJS.enc.Hex.parse(nonceHex);
    const actualCiphertext = window.CryptoJS.enc.Hex.parse(
      window.CryptoJS.enc.Hex.stringify(ciphertext).substring(24)
    );
    
    intermediateStates.push({
      stage: 'Nonce',
      block: 0,
      hexData: nonceHex,
      textData: null
    });

    // CTR decryption is identical to encryption - just XOR with keystream
    return this.encryptCTRWithNonce(actualCiphertext, key, nonce, intermediateStates);
  }

  static decryptCFB(ciphertext: any, key: any): any {
    const intermediateStates: any[] = [];
    const blockSize = 16;
    
    // Extract IV from the beginning of ciphertext
    const ivHex = window.CryptoJS.enc.Hex.stringify(ciphertext).substring(0, 32);
    const iv = window.CryptoJS.enc.Hex.parse(ivHex);
    const actualCiphertext = window.CryptoJS.enc.Hex.parse(
      window.CryptoJS.enc.Hex.stringify(ciphertext).substring(32)
    );
    
    intermediateStates.push({
      stage: 'Initialization Vector',
      block: 0,
      hexData: ivHex,
      textData: null
    });

    const blocks: any[] = [];
    let currentPos = 0;
    while (currentPos < actualCiphertext.sigBytes) {
      const remainingBytes = Math.min(blockSize, actualCiphertext.sigBytes - currentPos);
      const blockWords = [];
      
      for (let i = 0; i < Math.ceil(remainingBytes / 4); i++) {
        const wordIndex = Math.floor((currentPos + i * 4) / 4);
        blockWords.push(actualCiphertext.words[wordIndex] || 0);
      }
      
      const blockData = window.CryptoJS.lib.WordArray.create(blockWords, remainingBytes);
      blocks.push(blockData);
      currentPos += blockSize;
    }

    const decryptedBlocks: any[] = [];
    let feedbackRegister = iv;

    blocks.forEach((block, index) => {
      intermediateStates.push({
        stage: 'Ciphertext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(block),
        textData: null
      });

      // Encrypt feedback register to get keystream
      const keystreamBlock = window.CryptoJS.AES.encrypt(feedbackRegister, key, {
        mode: window.CryptoJS.mode.ECB,
        padding: window.CryptoJS.pad.NoPadding
      });

      intermediateStates.push({
        stage: 'Keystream Block',
        block: index + 1,
        hexData: keystreamBlock.ciphertext.toString(),
        textData: null
      });

      // XOR ciphertext with keystream to get plaintext
      const keystreamTruncated = window.CryptoJS.lib.WordArray.create(
        keystreamBlock.ciphertext.words.slice(0, Math.ceil(block.sigBytes / 4)),
        block.sigBytes
      );
      const plaintext = this.xorWordArrays(block, keystreamTruncated);

      intermediateStates.push({
        stage: 'Plaintext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(plaintext),
        textData: this.tryDecodeText(plaintext)
      });

      decryptedBlocks.push(plaintext);
      
      // For CFB, feedback the ciphertext for next iteration
      if (index < blocks.length - 1) {
        const paddedCiphertext = window.CryptoJS.lib.WordArray.create(
          keystreamBlock.ciphertext.words.slice(),
          16
        );
        const ciphertextBytes = window.CryptoJS.enc.Hex.parse(window.CryptoJS.enc.Hex.stringify(block));
        for (let i = 0; i < Math.min(ciphertextBytes.words.length, paddedCiphertext.words.length); i++) {
          paddedCiphertext.words[i] = ciphertextBytes.words[i];
        }
        feedbackRegister = paddedCiphertext;
      }
    });

    const finalPlaintext = window.CryptoJS.lib.WordArray.create(
      decryptedBlocks.reduce((acc, block) => acc.concat(block.words), []),
      decryptedBlocks.reduce((acc, block) => acc + block.sigBytes, 0)
    );
    
    return {
      plaintext: finalPlaintext,
      intermediateStates
    };
  }

  static decryptOFB(ciphertext: any, key: any): any {
    const intermediateStates: any[] = [];
    const blockSize = 16;
    
    // Extract IV from the beginning of ciphertext
    const ivHex = window.CryptoJS.enc.Hex.stringify(ciphertext).substring(0, 32);
    const iv = window.CryptoJS.enc.Hex.parse(ivHex);
    const actualCiphertext = window.CryptoJS.enc.Hex.parse(
      window.CryptoJS.enc.Hex.stringify(ciphertext).substring(32)
    );
    
    intermediateStates.push({
      stage: 'Initialization Vector',
      block: 0,
      hexData: ivHex,
      textData: null
    });

    const blocks: any[] = [];
    let currentPos = 0;
    while (currentPos < actualCiphertext.sigBytes) {
      const remainingBytes = Math.min(blockSize, actualCiphertext.sigBytes - currentPos);
      const blockWords = [];
      
      for (let i = 0; i < Math.ceil(remainingBytes / 4); i++) {
        const wordIndex = Math.floor((currentPos + i * 4) / 4);
        blockWords.push(actualCiphertext.words[wordIndex] || 0);
      }
      
      const blockData = window.CryptoJS.lib.WordArray.create(blockWords, remainingBytes);
      blocks.push(blockData);
      currentPos += blockSize;
    }

    const decryptedBlocks: any[] = [];
    let feedbackRegister = iv;

    blocks.forEach((block, index) => {
      intermediateStates.push({
        stage: 'Ciphertext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(block),
        textData: null
      });

      // Encrypt feedback register to get keystream
      const keystreamBlock = window.CryptoJS.AES.encrypt(feedbackRegister, key, {
        mode: window.CryptoJS.mode.ECB,
        padding: window.CryptoJS.pad.NoPadding
      });

      intermediateStates.push({
        stage: 'Keystream Block',
        block: index + 1,
        hexData: keystreamBlock.ciphertext.toString(),
        textData: null
      });

      // XOR ciphertext with keystream to get plaintext
      const keystreamTruncated = window.CryptoJS.lib.WordArray.create(
        keystreamBlock.ciphertext.words.slice(0, Math.ceil(block.sigBytes / 4)),
        block.sigBytes
      );
      const plaintext = this.xorWordArrays(block, keystreamTruncated);

      intermediateStates.push({
        stage: 'Plaintext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(plaintext),
        textData: this.tryDecodeText(plaintext)
      });

      decryptedBlocks.push(plaintext);
      
      // For OFB, feedback the keystream output (not the ciphertext)
      feedbackRegister = keystreamBlock.ciphertext;
    });

    const finalPlaintext = window.CryptoJS.lib.WordArray.create(
      decryptedBlocks.reduce((acc, block) => acc.concat(block.words), []),
      decryptedBlocks.reduce((acc, block) => acc + block.sigBytes, 0)
    );
    
    return {
      plaintext: finalPlaintext,
      intermediateStates
    };
  }

  // Helper method for CTR decryption
  private static encryptCTRWithNonce(plaintext: any, key: any, nonce: any, intermediateStates: any[]): any {
    const blockSize = 16;
    let counter = 1;

    const blocks: any[] = [];
    let currentPos = 0;
    while (currentPos < plaintext.sigBytes) {
      const remainingBytes = Math.min(blockSize, plaintext.sigBytes - currentPos);
      const blockWords = [];
      
      for (let i = 0; i < Math.ceil(remainingBytes / 4); i++) {
        const wordIndex = Math.floor((currentPos + i * 4) / 4);
        blockWords.push(plaintext.words[wordIndex] || 0);
      }
      
      const blockData = window.CryptoJS.lib.WordArray.create(blockWords, remainingBytes);
      blocks.push(blockData);
      currentPos += blockSize;
    }

    const resultBlocks: any[] = [];

    blocks.forEach((block, index) => {
      intermediateStates.push({
        stage: 'Ciphertext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(block),
        textData: null
      });

      // Create counter block (nonce + counter)
      const counterBytes = new Uint8Array(4);
      counterBytes[0] = (counter >>> 24) & 0xFF;
      counterBytes[1] = (counter >>> 16) & 0xFF;
      counterBytes[2] = (counter >>> 8) & 0xFF;
      counterBytes[3] = counter & 0xFF;
      
      const nonceBytes = new Uint8Array(12);
      for (let i = 0; i < 12; i++) {
        nonceBytes[i] = (nonce.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8)) & 0xFF;
      }
      
      const counterBlockBytes = new Uint8Array(16);
      counterBlockBytes.set(nonceBytes);
      counterBlockBytes.set(counterBytes, 12);
      
      const counterBlockHex = Array.from(counterBlockBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      const counterBlock = window.CryptoJS.enc.Hex.parse(counterBlockHex);

      intermediateStates.push({
        stage: 'Counter Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(counterBlock),
        textData: null
      });

      // Encrypt counter
      const keystream = window.CryptoJS.AES.encrypt(counterBlock, key, {
        mode: window.CryptoJS.mode.ECB,
        padding: window.CryptoJS.pad.NoPadding
      });

      intermediateStates.push({
        stage: 'Keystream',
        block: index + 1,
        hexData: keystream.ciphertext.toString(),
        textData: null
      });

      // XOR with ciphertext (only use as many bytes as needed)
      const keystreamTruncated = window.CryptoJS.lib.WordArray.create(
        keystream.ciphertext.words.slice(0, Math.ceil(block.sigBytes / 4)),
        block.sigBytes
      );
      const plaintext = this.xorWordArrays(block, keystreamTruncated);

      intermediateStates.push({
        stage: 'Plaintext Block',
        block: index + 1,
        hexData: window.CryptoJS.enc.Hex.stringify(plaintext),
        textData: this.tryDecodeText(plaintext)
      });

      resultBlocks.push(plaintext);
      counter++;
    });

    const finalPlaintext = window.CryptoJS.lib.WordArray.create(
      resultBlocks.reduce((acc, block) => acc.concat(block.words), []),
      resultBlocks.reduce((acc, block) => acc + block.sigBytes, 0)
    );
    
    return {
      plaintext: finalPlaintext,
      intermediateStates
    };
  }

  private static xorWordArrays(a: any, b: any): any {
    const result = window.CryptoJS.lib.WordArray.create();
    const maxLength = Math.max(
      Math.ceil(a.sigBytes / 4), 
      Math.ceil(b.sigBytes / 4)
    );
    
    for (let i = 0; i < maxLength; i++) {
      const wordA = a.words[i] || 0;
      const wordB = b.words[i] || 0;
      result.words.push(wordA ^ wordB);
    }
    
    result.sigBytes = Math.min(a.sigBytes, b.sigBytes);
    return result;
  }

  private static tryDecodeText(wordArray: any): string | null {
    try {
      const decoded = window.CryptoJS.enc.Utf8.stringify(wordArray);
      // Check if it contains mostly printable characters
      const printableRatio = (decoded.match(/[\x20-\x7E]/g) || []).length / decoded.length;
      if (printableRatio > 0.7 && decoded.length > 0) {
        return decoded.replace(/\0+$/, ''); // Remove null padding
      }
      return null;
    } catch {
      return null;
    }
  }
}