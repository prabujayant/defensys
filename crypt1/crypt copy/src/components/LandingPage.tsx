import React, { useRef, useEffect } from 'react';

// Import all three sound files from your assets folder
import retroBlipSound from '../assets/retro_blip.wav'; // Specific for Contact Me button hover
import hoverSound from '../assets/access.wav';       // For general mode card hover

interface LandingPageProps {
  onModeSelect: (mode: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onModeSelect }) => {
  const modes = [
    { id: 'ecb', name: 'ECB', fullName: 'Electronic Codebook' },
    { id: 'cbc', name: 'CBC', fullName: 'Cipher Block Chaining' },
    { id: 'ctr', name: 'CTR', fullName: 'Counter Mode' },
    { id: 'cfb', name: 'CFB', fullName: 'Cipher Feedback' },
    { id: 'ofb', name: 'OFB', fullName: 'Output Feedback' }
  ];

  const handleContactClick = () => {
    const emailAddress = 'prabu.jayant2022@gmail.com';
    const subject = encodeURIComponent('Inquiry about AES Visualization Project');
    const body = encodeURIComponent('Hello Prabu,\n\nI saw your AES visualization project and wanted to reach out.\n\nBest regards,');
    
    const gmailComposeUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${emailAddress}&su=${subject}&body=${body}`;
    
    window.open(gmailComposeUrl, '_blank'); 
  };

  // --- NEW: Separate refs for each sound ---
  const retroBlipAudioRef = useRef<HTMLAudioElement | null>(null); // For Contact Me button
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);   // For mode cards hover

  useEffect(() => {
    // Initialize retroBlipSound for Contact Me button
    retroBlipAudioRef.current = new Audio(retroBlipSound);
    retroBlipAudioRef.current.volume = 0.5;
    retroBlipAudioRef.current.load();

    // Initialize general hover sound for mode cards
    hoverAudioRef.current = new Audio(hoverSound);
    hoverAudioRef.current.volume = 0.5; 
    hoverAudioRef.current.load();

    // Cleanup function for all audio elements
    return () => {
      if (retroBlipAudioRef.current) {
        retroBlipAudioRef.current.pause();
        retroBlipAudioRef.current.currentTime = 0;
        retroBlipAudioRef.current = null;
      }
      if (hoverAudioRef.current) {
        hoverAudioRef.current.pause();
        hoverAudioRef.current.currentTime = 0;
        hoverAudioRef.current = null;
      }
     
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // --- NEW: Play function specific to retroBlipSound ---
  const playRetroBlipSound = () => {
    if (retroBlipAudioRef.current) {
      retroBlipAudioRef.current.pause();
      retroBlipAudioRef.current.currentTime = 0;
      retroBlipAudioRef.current.play().catch(error => {
        console.warn("Retro blip audio play failed:", error);
      });
    }
  };

  // Existing play functions for general hover and access
  const playHoverSound = () => {
    if (hoverAudioRef.current) {
      hoverAudioRef.current.pause();
      hoverAudioRef.current.currentTime = 0; 
      hoverAudioRef.current.play().catch(error => {
        console.warn("General hover audio play failed:", error);
      });
    }
  };


  // --- END NEW/MODIFIED CODE ---

  return (
    <div className="retro-container">
      <h1 className="retro-title">AES OPERATION MODES</h1>
      <div className="retro-panel">
        <p className="retro-text" style={{ textAlign: 'center', marginBottom: '30px' }}>
          Interactive visualization of Advanced Encryption Standard operation modes.
          <br />
          Select a mode to learn more and visualize its encryption process.
        </p>
        <div className="mode-grid">
          {modes.map((mode) => (
            <div
              key={mode.id}
              className="mode-card"
              onClick={() => { onModeSelect(mode.id); }} 
              onMouseEnter={playHoverSound} 
            >
              <h3 className="retro-subtitle" style={{ marginBottom: '15px' }}>
                {mode.name}
              </h3>
              <p className="retro-text" style={{ fontSize: '10px' }}>
                {mode.fullName}
              </p>
            </div>
          ))}
        </div>
        {/* Contact Me Button - now with its specific hover sound */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button 
            className="retro-button" 
            onClick={handleContactClick}
            onMouseEnter={playRetroBlipSound} // <--- Assign the specific retroBlipSound here
          >
            Contact Me
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;