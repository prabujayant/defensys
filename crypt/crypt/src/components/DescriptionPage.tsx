import React from 'react';

interface ModeInfo {
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  applications: string[];
}

interface DescriptionPageProps {
  mode: string;
  onBack: () => void;
  onVisualize: () => void;
}

const DescriptionPage: React.FC<DescriptionPageProps> = ({ mode, onBack, onVisualize }) => {
  const modesData: Record<string, ModeInfo> = {
    ecb: {
      title: 'ECB (Electronic Codebook)',
      description: 'The simplest AES mode where each block of plaintext is encrypted independently using the same key. Each plaintext block produces the same ciphertext block.',
      pros: [
        'Simple to implement and understand',
        'Parallel processing possible',
        'No error propagation between blocks',
        'Random access to encrypted data'
      ],
      cons: [
        'Identical plaintext blocks produce identical ciphertext',
        'Patterns in plaintext are preserved',
        'Vulnerable to known-plaintext attacks',
        'Not semantically secure'
      ],
      applications: [
        'Legacy systems (not recommended)',
        'Educational purposes only',
        'Single block encryption scenarios',
        'When pattern preservation is acceptable'
      ]
    },
    cbc: {
      title: 'CBC (Cipher Block Chaining)',
      description: 'Each plaintext block is XORed with the previous ciphertext block before encryption. An Initialization Vector (IV) is used for the first block.',
      pros: [
        'Identical plaintext blocks produce different ciphertext',
        'More secure than ECB mode',
        'Widely supported and standardized',
        'Good diffusion properties'
      ],
      cons: [
        'Sequential processing required',
        'Error propagation affects subsequent blocks',
        'Requires secure IV generation',
        'Padding oracle attacks possible'
      ],
      applications: [
        'File encryption',
        'Database encryption',
        'VPN protocols',
        'Secure communication protocols'
      ]
    },
    ctr: {
      title: 'CTR (Counter Mode)',
      description: 'Converts AES into a stream cipher. A counter value is encrypted to generate a keystream, which is XORed with plaintext to produce ciphertext.',
      pros: [
        'Parallel processing possible',
        'Random access to encrypted data',
        'No padding required',
        'Preprocessing of keystream possible'
      ],
      cons: [
        'Counter values must never repeat',
        'Requires secure nonce generation',
        'No built-in authentication',
        'Vulnerable if keystream is reused'
      ],
      applications: [
        'High-speed networking',
        'Disk encryption',
        'Real-time communications',
        'Streaming media encryption'
      ]
    },
    cfb: {
      title: 'CFB (Cipher Feedback)',
      description: 'Converts AES into a stream cipher. Previous ciphertext is encrypted to generate a keystream, which is XORed with plaintext segments.',
      pros: [
        'Stream cipher operation',
        'Self-synchronizing',
        'No padding required for partial blocks',
        'Error recovery after shift register fills'
      ],
      cons: [
        'Sequential processing required',
        'Error propagation affects multiple blocks',
        'More complex than other modes',
        'Requires secure IV generation'
      ],
      applications: [
        'Character-oriented applications',
        'Network protocols with error recovery',
        'Systems requiring partial block encryption',
        'Legacy communication systems'
      ]
    },
    ofb: {
      title: 'OFB (Output Feedback)',
      description: 'Converts AES into a stream cipher. The AES output is fed back as input for the next encryption round, creating a keystream independent of plaintext.',
      pros: [
        'Stream cipher operation',
        'No error propagation',
        'Keystream generation independent of data',
        'Preprocessing of keystream possible'
      ],
      cons: [
        'Sequential keystream generation',
        'Vulnerable to bit-flipping attacks',
        'Requires secure IV generation',
        'IV must never repeat with same key'
      ],
      applications: [
        'Satellite communications',
        'Radio frequency applications',
        'Systems sensitive to transmission errors',
        'Stream encryption scenarios'
      ]
    }
  };

  const modeInfo = modesData[mode];

  if (!modeInfo) {
    return <div>Mode not found</div>;
  }

  return (
    <div className="retro-container">
      <div className="back-button">
        <button className="retro-button" onClick={onBack}>
          &lt; BACK TO MODES
        </button>
      </div>
      
      <h1 className="retro-title">{modeInfo.title}</h1>
      
      <div className="retro-panel">
        <h2 className="retro-subtitle">DESCRIPTION</h2>
        <p className="retro-text">{modeInfo.description}</p>
      </div>

      <div className="retro-panel">
        <h2 className="retro-subtitle">ADVANTAGES</h2>
        <ul className="section-list">
          {modeInfo.pros.map((pro, index) => (
            <li key={index} className="retro-text">{pro}</li>
          ))}
        </ul>
      </div>

      <div className="retro-panel">
        <h2 className="retro-subtitle">DISADVANTAGES</h2>
        <ul className="section-list">
          {modeInfo.cons.map((con, index) => (
            <li key={index} className="retro-text">{con}</li>
          ))}
        </ul>
      </div>

      <div className="retro-panel">
        <h2 className="retro-subtitle">TYPICAL APPLICATIONS</h2>
        <ul className="section-list">
          {modeInfo.applications.map((app, index) => (
            <li key={index} className="retro-text">{app}</li>
          ))}
        </ul>
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button className="retro-button" onClick={onVisualize}>
          VISUALIZE {mode.toUpperCase()}
        </button>
      </div>
    </div>
  );
};

export default DescriptionPage;