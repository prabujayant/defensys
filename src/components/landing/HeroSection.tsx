import React from 'react';
import { Shield, ArrowRight, Cpu, Network, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ParticleNetwork } from '../three/ParticleNetwork';
import { AnimatedText } from './AnimatedText';
import { VectorBackground } from './VectorBackground';

export function HeroSection() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 opacity-30">
        <VectorBackground />
      </div>
      <div className="absolute inset-0 z-[1] opacity-20">
        <ParticleNetwork />
      </div>

      {/* Content */}
      <div className="relative z-[2] max-w-6xl mx-auto px-6 text-center">
        {/* Logo Badge */}
        <AnimatedText delay="0">
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <Shield className="w-24 h-24 text-indigo-400 transition-all duration-500 group-hover:text-indigo-300" />
              <Cpu className="w-16 h-16 text-indigo-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              <span className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
            </div>
          </div>
        </AnimatedText>

        {/* Title */}
        <AnimatedText delay="100">
          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            DefenSys
          </h1>
        </AnimatedText>

        {/* Tagline */}
        <AnimatedText delay="200">
          <p className="text-xl sm:text-2xl font-light text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Autonomous AI-Powered Cybersecurity Platform
            <br />
            <span className="text-gray-400 text-lg mt-2 block">Detecting Threats • Simulating Attacks • Healing Systems</span>
          </p>
        </AnimatedText>

        {/* CTA Buttons */}
        <AnimatedText delay="300">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              to="/dashboard"
              className="group flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300"
            >
              Launch Live Dashboard
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center px-8 py-4 text-lg font-medium text-indigo-300 border border-indigo-500/30 rounded-xl hover:bg-indigo-950/40 transition-all duration-300"
            >
              Explore Capabilities
            </a>
          </div>
        </AnimatedText>

        {/* Stats / Features Preview */}
        <AnimatedText delay="400">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-sm text-gray-400">
            <div className="bg-black/30 p-4 rounded-lg backdrop-blur-sm border border-gray-800 hover:border-indigo-500/50 transition-all">
              <div className="text-indigo-400 text-xl font-bold mb-1">CNN/ResNet</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Malware Detection</div>
            </div>
            <div className="bg-black/30 p-4 rounded-lg backdrop-blur-sm border border-gray-800 hover:border-indigo-500/50 transition-all">
              <div className="text-indigo-400 text-xl font-bold mb-1">3-Node</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Mesh Simulation</div>
            </div>
            <div className="bg-black/30 p-4 rounded-lg backdrop-blur-sm border border-gray-800 hover:border-indigo-500/50 transition-all">
              <div className="text-indigo-400 text-xl font-bold mb-1">{'<1s'}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Threat Response</div>
            </div>
            <div className="bg-black/30 p-4 rounded-lg backdrop-blur-sm border border-gray-800 hover:border-indigo-500/50 transition-all">
              <div className="text-indigo-400 text-xl font-bold mb-1">Auto</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Self-Healing</div>
            </div>
          </div>
        </AnimatedText>
      </div>
    </div>
  );
}