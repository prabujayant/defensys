declare global {
  interface Window {
    Konva: any;
  }
}

export class Visualization {
  private stage: any;
  private layer: any;
  private container: HTMLDivElement;
  private onStateClick: (stateData: any) => void;

  constructor(container: HTMLDivElement, onStateClick: (stateData: any) => void) {
    this.container = container;
    this.onStateClick = onStateClick;
    this.initStage();
  }

  private initStage(): void {
    this.stage = new window.Konva.Stage({
      container: this.container,
      width: this.container.offsetWidth,
      height: this.container.offsetHeight
    });

    this.layer = new window.Konva.Layer();
    this.stage.add(this.layer);

    // Handle resize
    window.addEventListener('resize', () => {
      this.stage.width(this.container.offsetWidth);
      this.stage.height(this.container.offsetHeight);
    });
  }

  clearStage(): void {
    if (this.layer) {
      this.layer.removeChildren();
      this.layer.draw();
    }
  }

  drawMode(mode: string, intermediateStates: any[]): void {
    this.clearStage();
    
    switch (mode) {
      case 'ecb':
        this.drawECB(intermediateStates);
        break;
      case 'cbc':
        this.drawCBC(intermediateStates);
        break;
      case 'ctr':
        this.drawCTR(intermediateStates);
        break;
      case 'cfb':
        this.drawCFB(intermediateStates);
        break;
      case 'ofb':
        this.drawOFB(intermediateStates);
        break;
    }
  }

  private drawECB(states: any[]): void {
    const blockWidth = 120;
    const blockHeight = 60;
    const spacing = 50;
    const startY = 100;

    // Group states by block
    const blockStates = this.groupStatesByBlock(states);
    
    Object.keys(blockStates).forEach((blockKey, index) => {
      if (blockKey === '0') return; // Skip IV/Nonce
      
      const blockNum = parseInt(blockKey);
      const x = 100 + (blockNum - 1) * (blockWidth + spacing);
      
      // Plaintext block
      this.createClickableBlock(
        x, startY,
        blockWidth, blockHeight,
        `P${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'Plaintext Block')
      );

      // Arrow down
      this.createArrow(x + blockWidth / 2, startY + blockHeight, x + blockWidth / 2, startY + blockHeight + 40);

      // AES block
      this.createClickableBlock(
        x, startY + blockHeight + 50,
        blockWidth, blockHeight,
        'AES',
        blockStates[blockKey].find(s => s.stage === 'AES Encryption')
      );

      // Arrow down
      this.createArrow(x + blockWidth / 2, startY + 2 * blockHeight + 50, x + blockWidth / 2, startY + 2 * blockHeight + 90);

      // Ciphertext block
      this.createClickableBlock(
        x, startY + 2 * blockHeight + 100,
        blockWidth, blockHeight,
        `C${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'AES Encryption')
      );
    });

    this.layer.draw();
  }

  private drawCBC(states: any[]): void {
    const blockWidth = 100;
    const blockHeight = 50;
    const spacing = 120;
    const startY = 150;

    const blockStates = this.groupStatesByBlock(states);
    
    // Draw IV
    if (blockStates['0']) {
      this.createClickableBlock(
        50, startY - 100,
        blockWidth, blockHeight,
        'IV',
        blockStates['0'][0]
      );
    }

    Object.keys(blockStates).forEach((blockKey, index) => {
      if (blockKey === '0') return;
      
      const blockNum = parseInt(blockKey);
      const x = 50 + (blockNum - 1) * spacing;
      
      // Plaintext block
      this.createClickableBlock(
        x, startY,
        blockWidth, blockHeight,
        `P${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'Plaintext Block')
      );

      // XOR circle
      this.createXORCircle(
        x + blockWidth / 2, startY + blockHeight + 30,
        blockStates[blockKey].find(s => s.stage === 'XOR with Previous')
      );

      // Arrow down to AES
      this.createArrow(x + blockWidth / 2, startY + blockHeight + 60, x + blockWidth / 2, startY + blockHeight + 100);

      // AES block
      this.createClickableBlock(
        x, startY + blockHeight + 110,
        blockWidth, blockHeight,
        'AES',
        blockStates[blockKey].find(s => s.stage === 'AES Encryption')
      );

      // Arrow down to ciphertext
      this.createArrow(x + blockWidth / 2, startY + 2 * blockHeight + 110, x + blockWidth / 2, startY + 2 * blockHeight + 150);

      // Ciphertext block
      this.createClickableBlock(
        x, startY + 2 * blockHeight + 160,
        blockWidth, blockHeight,
        `C${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'AES Encryption')
      );

      // Feedback arrow to next block's XOR (if not last block)
      if (blockNum < Object.keys(blockStates).length - 1) {
        this.createArrow(
          x + blockWidth, startY + 2 * blockHeight + 185,
          x + spacing, startY + blockHeight + 30
        );
      }

      // Connect IV to first block or previous ciphertext to current XOR
      if (blockNum === 1) {
        // IV to first XOR
        this.createArrow(
          50 + blockWidth, startY - 75,
          x + blockWidth / 2, startY + blockHeight + 30
        );
      }
    });

    this.layer.draw();
  }

  private drawCTR(states: any[]): void {
    const blockWidth = 100;
    const blockHeight = 50;
    const spacing = 140;
    const startY = 100;

    const blockStates = this.groupStatesByBlock(states);
    
    // Draw Nonce
    if (blockStates['0']) {
      this.createClickableBlock(
        50, 50,
        blockWidth, blockHeight,
        'Nonce',
        blockStates['0'][0]
      );
    }

    Object.keys(blockStates).forEach((blockKey, index) => {
      if (blockKey === '0') return;
      
      const blockNum = parseInt(blockKey);
      const x = 50 + (blockNum - 1) * spacing;
      
      // Counter block
      this.createClickableBlock(
        x, startY,
        blockWidth, blockHeight,
        `Nonce+${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'Counter Block')
      );

      // Arrow down to AES
      this.createArrow(x + blockWidth / 2, startY + blockHeight, x + blockWidth / 2, startY + blockHeight + 30);

      // AES block
      this.createClickableBlock(
        x, startY + blockHeight + 40,
        blockWidth, blockHeight,
        'AES',
        blockStates[blockKey].find(s => s.stage === 'Keystream')
      );

      // Arrow down to XOR
      this.createArrow(x + blockWidth / 2, startY + 2 * blockHeight + 40, x + blockWidth / 2, startY + 2 * blockHeight + 70);

      // XOR circle
      this.createXORCircle(
        x + blockWidth / 2, startY + 2 * blockHeight + 80,
        blockStates[blockKey].find(s => s.stage === 'XOR Result')
      );

      // Plaintext block (input to XOR from left)
      this.createClickableBlock(
        x - 60, startY + 2 * blockHeight + 55,
        blockWidth * 0.8, blockHeight,
        `P${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'Plaintext Block')
      );

      // Arrow from plaintext to XOR
      this.createArrow(x - 60 + blockWidth * 0.8, startY + 2 * blockHeight + 80, x + blockWidth / 2 - 15, startY + 2 * blockHeight + 80);

      // Arrow down from XOR to ciphertext
      this.createArrow(x + blockWidth / 2, startY + 2 * blockHeight + 95, x + blockWidth / 2, startY + 2 * blockHeight + 120);

      // Ciphertext block
      this.createClickableBlock(
        x, startY + 2 * blockHeight + 130,
        blockWidth, blockHeight,
        `C${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'XOR Result')
      );
    });

    this.layer.draw();
  }

  private drawCFB(states: any[]): void {
    const blockWidth = 100;
    const blockHeight = 50;
    const spacing = 140;
    const startY = 150;

    const blockStates = this.groupStatesByBlock(states);
    
    // Draw IV
    if (blockStates['0']) {
      this.createClickableBlock(
        50, startY - 100,
        blockWidth, blockHeight,
        'IV',
        blockStates['0'][0]
      );
    }

    Object.keys(blockStates).forEach((blockKey, index) => {
      if (blockKey === '0') return;
      
      const blockNum = parseInt(blockKey);
      const x = 50 + (blockNum - 1) * spacing;
      
      // AES block (fed by IV or previous ciphertext)
      this.createClickableBlock(
        x, startY,
        blockWidth, blockHeight,
        'AES',
        blockStates[blockKey].find(s => s.stage === 'Keystream Block')
      );

      // Arrow down to XOR
      this.createArrow(x + blockWidth / 2, startY + blockHeight, x + blockWidth / 2, startY + blockHeight + 30);

      // XOR circle
      this.createXORCircle(
        x + blockWidth / 2, startY + blockHeight + 40,
        blockStates[blockKey].find(s => s.stage === 'Ciphertext Block')
      );

      // Plaintext block (input to XOR from left)
      this.createClickableBlock(
        x - 60, startY + blockHeight + 15,
        blockWidth * 0.8, blockHeight,
        `P${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'Plaintext Block')
      );

      // Arrow from plaintext to XOR
      this.createArrow(x - 60 + blockWidth * 0.8, startY + blockHeight + 40, x + blockWidth / 2 - 15, startY + blockHeight + 40);

      // Arrow down from XOR to ciphertext
      this.createArrow(x + blockWidth / 2, startY + blockHeight + 55, x + blockWidth / 2, startY + blockHeight + 80);

      // Ciphertext block
      this.createClickableBlock(
        x, startY + blockHeight + 90,
        blockWidth, blockHeight,
        `C${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'Ciphertext Block')
      );

      // Feedback arrow to next block's AES (if not last block)
      if (blockNum < Object.keys(blockStates).length - 1) {
        this.createArrow(
          x + blockWidth, startY + blockHeight + 115,
          x + spacing, startY + 25
        );
      }

      // Connect IV to first block
      if (blockNum === 1) {
        this.createArrow(
          50 + blockWidth, startY - 75,
          x + blockWidth / 2, startY
        );
      }
    });

    this.layer.draw();
  }

  private drawOFB(states: any[]): void {
    const blockWidth = 100;
    const blockHeight = 50;
    const spacing = 140;
    const startY = 150;

    const blockStates = this.groupStatesByBlock(states);
    
    // Draw IV
    if (blockStates['0']) {
      this.createClickableBlock(
        50, startY - 100,
        blockWidth, blockHeight,
        'IV',
        blockStates['0'][0]
      );
    }

    Object.keys(blockStates).forEach((blockKey, index) => {
      if (blockKey === '0') return;
      
      const blockNum = parseInt(blockKey);
      const x = 50 + (blockNum - 1) * spacing;
      
      // AES block
      this.createClickableBlock(
        x, startY,
        blockWidth, blockHeight,
        'AES',
        blockStates[blockKey].find(s => s.stage === 'Keystream Block')
      );

      // Split arrow from AES - one to XOR, one to next AES (feedback)
      this.createArrow(x + blockWidth / 2, startY + blockHeight, x + blockWidth / 2, startY + blockHeight + 30);

      // XOR circle
      this.createXORCircle(
        x + blockWidth / 2, startY + blockHeight + 40,
        blockStates[blockKey].find(s => s.stage === 'Ciphertext Block')
      );

      // Plaintext block (input to XOR from left)
      this.createClickableBlock(
        x - 60, startY + blockHeight + 15,
        blockWidth * 0.8, blockHeight,
        `P${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'Plaintext Block')
      );

      // Arrow from plaintext to XOR
      this.createArrow(x - 60 + blockWidth * 0.8, startY + blockHeight + 40, x + blockWidth / 2 - 15, startY + blockHeight + 40);

      // Arrow down from XOR to ciphertext
      this.createArrow(x + blockWidth / 2, startY + blockHeight + 55, x + blockWidth / 2, startY + blockHeight + 80);

      // Ciphertext block
      this.createClickableBlock(
        x, startY + blockHeight + 90,
        blockWidth, blockHeight,
        `C${blockNum}`,
        blockStates[blockKey].find(s => s.stage === 'Ciphertext Block')
      );

      // Feedback arrow from AES output to next AES input (keystream feedback)
      if (blockNum < Object.keys(blockStates).length - 1) {
        // Horizontal line from AES block
        this.createArrow(
          x + blockWidth, startY + 25,
          x + spacing, startY + 25
        );
        // Vertical line down to next AES
        this.createArrow(
          x + spacing, startY + 25,
          x + spacing, startY
        );
      }

      // Connect IV to first block
      if (blockNum === 1) {
        this.createArrow(
          50 + blockWidth, startY - 75,
          x + blockWidth / 2, startY
        );
      }
    });

    this.layer.draw();
  }

  private groupStatesByBlock(states: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    states.forEach(state => {
      const blockKey = state.block.toString();
      if (!grouped[blockKey]) {
        grouped[blockKey] = [];
      }
      grouped[blockKey].push(state);
    });
    
    return grouped;
  }

  private createClickableBlock(x: number, y: number, width: number, height: number, text: string, stateData?: any): void {
    const rect = new window.Konva.Rect({
      x,
      y,
      width,
      height,
      fill: '#004400',
      stroke: '#00FF00',
      strokeWidth: 2,
      cornerRadius: 4
    });

    const label = new window.Konva.Text({
      x,
      y: y + height / 2 - 8,
      width,
      text,
      fontSize: 14,
      fontFamily: 'Press Start 2P, monospace',
      fill: '#00FF00',
      align: 'center'
    });

    if (stateData) {
      const group = new window.Konva.Group();
      group.add(rect);
      group.add(label);
      
      group.on('click', () => {
        this.onStateClick(stateData);
        // Visual feedback
        rect.fill('#39FF14');
        this.layer.draw();
        setTimeout(() => {
          rect.fill('#004400');
          this.layer.draw();
        }, 200);
      });
      
      group.on('mouseenter', () => {
        rect.strokeWidth(3);
        rect.shadowColor('#00FF00');
        rect.shadowBlur(10);
        this.layer.draw();
        document.body.style.cursor = 'pointer';
      });
      
      group.on('mouseleave', () => {
        rect.strokeWidth(2);
        rect.shadowBlur(0);
        this.layer.draw();
        document.body.style.cursor = 'default';
      });
      
      this.layer.add(group);
    } else {
      this.layer.add(rect);
      this.layer.add(label);
    }
  }

  private createXORCircle(x: number, y: number, stateData?: any): void {
    const circle = new window.Konva.Circle({
      x,
      y,
      radius: 20,
      fill: '#004400',
      stroke: '#00FF00',
      strokeWidth: 2
    });

    const xorText = new window.Konva.Text({
      x: x - 10,
      y: y - 8,
      text: '⊕',
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#00FF00'
    });

    if (stateData) {
      const group = new window.Konva.Group();
      group.add(circle);
      group.add(xorText);
      
      group.on('click', () => {
        this.onStateClick(stateData);
        circle.fill('#39FF14');
        this.layer.draw();
        setTimeout(() => {
          circle.fill('#004400');
          this.layer.draw();
        }, 200);
      });
      
      group.on('mouseenter', () => {
        circle.strokeWidth(3);
        circle.shadowColor('#00FF00');
        circle.shadowBlur(10);
        this.layer.draw();
        document.body.style.cursor = 'pointer';
      });
      
      group.on('mouseleave', () => {
        circle.strokeWidth(2);
        circle.shadowBlur(0);
        this.layer.draw();
        document.body.style.cursor = 'default';
      });
      
      this.layer.add(group);
    } else {
      this.layer.add(circle);
      this.layer.add(xorText);
    }
  }

  private createArrow(x1: number, y1: number, x2: number, y2: number): void {
    const arrow = new window.Konva.Arrow({
      points: [x1, y1, x2, y2],
      pointerLength: 8,
      pointerWidth: 8,
      fill: '#00FF00',
      stroke: '#00FF00',
      strokeWidth: 2
    });

    this.layer.add(arrow);
  }

  destroy(): void {
    if (this.stage) {
      this.stage.destroy();
    }
  }
}