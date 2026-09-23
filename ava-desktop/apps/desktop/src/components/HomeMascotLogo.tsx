import React from "react";

export function HomeMascotLogo() {
  return (
    <span
      className="home-mascot-logo"
      data-testid="home-mascot-logo"
      aria-hidden="true"
    >
      <div className="ava-core-sphere-wrap">
        {/* Ambient Backlight Glow */}
        <div className="ava-core-glow" />

        {/* Orbit Ring 1 */}
        <div className="ava-orbit-ring ring-outer" />

        {/* Orbit Ring 2 */}
        <div className="ava-orbit-ring ring-inner" />

        {/* Main Glowing Sphere */}
        <div className="ava-sphere-body">
          {/* Glass Specular Reflection Highlight */}
          <div className="ava-sphere-highlight" />

          {/* Inner Pulsing Core */}
          <div className="ava-sphere-inner-core" />

          {/* Quantum Energy Waves */}
          <div className="ava-sphere-wave wave-1" />
          <div className="ava-sphere-wave wave-2" />
        </div>

        {/* Soft Ground Shadow */}
        <div className="ava-sphere-shadow" />
      </div>

      <style>{`
        .ava-core-sphere-wrap {
          position: relative;
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          pointer-events: none;
        }

        /* Ambient Glow */
        .ava-core-glow {
          position: absolute;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(56, 189, 248, 0.2) 45%, transparent 70%);
          filter: blur(12px);
          animation: avaCoreGlowPulse 4s ease-in-out infinite alternate;
          z-index: 1;
        }

        :root[data-theme="light"] .ava-core-glow {
          background: radial-gradient(circle, rgba(147, 51, 234, 0.22) 0%, rgba(14, 165, 233, 0.15) 50%, transparent 70%);
          filter: blur(14px);
        }

        /* Orbiting Rings */
        .ava-orbit-ring {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
        }

        .ava-orbit-ring.ring-outer {
          width: 88px;
          height: 88px;
          border: 1.5px dashed rgba(168, 85, 247, 0.45);
          animation: avaOrbitSpin 14s linear infinite;
        }

        .ava-orbit-ring.ring-inner {
          width: 76px;
          height: 76px;
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-top-color: rgba(192, 132, 252, 0.8);
          border-bottom-color: rgba(56, 189, 248, 0.8);
          animation: avaOrbitCounterSpin 9s linear infinite;
        }

        :root[data-theme="light"] .ava-orbit-ring.ring-outer {
          border-color: rgba(147, 51, 234, 0.35);
        }

        :root[data-theme="light"] .ava-orbit-ring.ring-inner {
          border-color: rgba(14, 165, 233, 0.3);
          border-top-color: rgba(147, 51, 234, 0.6);
        }

        /* Main Sphere Body */
        .ava-sphere-body {
          position: relative;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #38bdf8 0%, #8b5cf6 38%, #4c1d95 72%, #1e1b4b 100%);
          box-shadow:
            inset -3px -3px 8px rgba(0, 0, 0, 0.5),
            inset 3px 3px 10px rgba(255, 255, 255, 0.45),
            0 0 20px rgba(139, 92, 246, 0.5),
            0 0 35px rgba(56, 189, 248, 0.3);
          animation: avaSphereFloat 3.6s ease-in-out infinite;
          overflow: hidden;
          z-index: 3;
        }

        :root[data-theme="light"] .ava-sphere-body {
          background: radial-gradient(circle at 35% 30%, #60a5fa 0%, #a855f7 40%, #7c3aed 75%, #4c1d95 100%);
          box-shadow:
            inset -2px -2px 6px rgba(0, 0, 0, 0.25),
            inset 2px 2px 8px rgba(255, 255, 255, 0.6),
            0 6px 16px rgba(147, 51, 234, 0.3),
            0 0 24px rgba(56, 189, 248, 0.2);
        }

        /* Glass Specular Highlight */
        .ava-sphere-highlight {
          position: absolute;
          top: 7px;
          left: 10px;
          width: 22px;
          height: 14px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 80%);
          transform: rotate(-35deg);
        }

        /* Inner Pulsing Core */
        .ava-sphere-inner-core {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          margin-top: -10px;
          margin-left: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, #ffffff 0%, #c084fc 45%, transparent 80%);
          animation: avaCorePulse 2.4s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 6px #38bdf8);
        }

        /* Energy Waves */
        .ava-sphere-wave {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.3);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .ava-sphere-wave.wave-1 {
          width: 32px;
          height: 32px;
          animation: avaWaveExpand 3.2s ease-out infinite;
        }

        .ava-sphere-wave.wave-2 {
          width: 32px;
          height: 32px;
          animation: avaWaveExpand 3.2s ease-out infinite 1.6s;
        }

        /* Soft Ground Shadow */
        .ava-sphere-shadow {
          position: absolute;
          bottom: 2px;
          width: 44px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.45) 0%, transparent 70%);
          animation: avaShadowScale 3.6s ease-in-out infinite;
          z-index: 1;
        }

        :root[data-theme="light"] .ava-sphere-shadow {
          background: radial-gradient(ellipse at center, rgba(109, 40, 217, 0.22) 0%, transparent 70%);
        }

        /* Keyframes */
        @keyframes avaSphereFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes avaShadowScale {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(0.75);
            opacity: 0.25;
          }
        }

        @keyframes avaCoreGlowPulse {
          0% {
            opacity: 0.65;
            transform: scale(0.94);
          }
          100% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        @keyframes avaCorePulse {
          0% {
            transform: scale(0.85);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.25);
            opacity: 1;
          }
        }

        @keyframes avaOrbitSpin {
          0% {
            transform: rotateX(68deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(68deg) rotateZ(360deg);
          }
        }

        @keyframes avaOrbitCounterSpin {
          0% {
            transform: rotateX(62deg) rotateY(25deg) rotateZ(360deg);
          }
          100% {
            transform: rotateX(62deg) rotateY(25deg) rotateZ(0deg);
          }
        }

        @keyframes avaWaveExpand {
          0% {
            width: 14px;
            height: 14px;
            opacity: 0.8;
          }
          100% {
            width: 52px;
            height: 52px;
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ava-sphere-body,
          .ava-sphere-shadow,
          .ava-core-glow,
          .ava-sphere-inner-core,
          .ava-orbit-ring,
          .ava-sphere-wave {
            animation: none !important;
          }
        }
      `}</style>
    </span>
  );
}
