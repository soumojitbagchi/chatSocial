import * as React from "react";

export interface LoaderProps {
  color?: string;
  className?: string;
  text?: string;
  fullscreen?: boolean;
}

export function Loader({
  color = "#10b981",
  className = "",
  text,
  fullscreen = false,
}: LoaderProps) {
  const content = (
    <div
      className={`jetpack-loader-wrapper relative flex flex-col items-center justify-center ${className}`}
      style={{
        ["--loader-color" as string]: color,
        minHeight: fullscreen ? "100vh" : "180px",
        minWidth: "260px",
      }}
    >
      <div className="jetpack-loader-container relative w-[220px] h-[120px] overflow-hidden flex items-center justify-center">
        <div className="jetpack-loader">
          <span className="jetpack-helmet-wing">
            <span />
            <span />
            <span />
            <span />
          </span>
          <div className="jetpack-base">
            <span />
            <div className="jetpack-face" />
          </div>
        </div>

        <div className="jetpack-longfazers">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      {text && (
        <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse tracking-wide">
          {text}
        </p>
      )}

      <style>{`
        .jetpack-loader-wrapper {
          --c: var(--loader-color, #10b981);
        }

        .jetpack-loader {
          position: absolute;
          top: 50%;
          left: 50%;
          margin-left: -50px;
          margin-top: -10px;
          animation: jetpack-speeder 0.4s linear infinite;
        }

        .jetpack-loader > .jetpack-helmet-wing {
          height: 5px;
          width: 35px;
          background: var(--c);
          position: absolute;
          top: -19px;
          left: 60px;
          border-radius: 2px 10px 1px 0;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        }

        .jetpack-base span {
          position: absolute;
          width: 0;
          height: 0;
          border-top: 6px solid transparent;
          border-right: 100px solid var(--c);
          border-bottom: 6px solid transparent;
          filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.3));
        }

        .jetpack-base span:before {
          content: "";
          height: 22px;
          width: 22px;
          border-radius: 50%;
          background: var(--c);
          position: absolute;
          right: -110px;
          top: -16px;
        }

        .jetpack-base span:after {
          content: "";
          position: absolute;
          width: 0;
          height: 0;
          border-top: 0 solid transparent;
          border-right: 55px solid var(--c);
          border-bottom: 16px solid transparent;
          top: -16px;
          right: -98px;
        }

        .jetpack-face {
          position: absolute;
          height: 12px;
          width: 20px;
          background: var(--c);
          border-radius: 20px 20px 0 0;
          transform: rotate(-40deg);
          right: -125px;
          top: -15px;
        }

        .jetpack-face:after {
          content: "";
          height: 12px;
          width: 12px;
          background: var(--c);
          right: 4px;
          top: 7px;
          position: absolute;
          transform: rotate(40deg);
          transform-origin: 50% 50%;
          border-radius: 0 0 0 2px;
        }

        .jetpack-helmet-wing > span:nth-child(1),
        .jetpack-helmet-wing > span:nth-child(2),
        .jetpack-helmet-wing > span:nth-child(3),
        .jetpack-helmet-wing > span:nth-child(4) {
          width: 30px;
          height: 1.5px;
          background: var(--c);
          position: absolute;
          animation: jetpack-fazer1 0.2s linear infinite;
        }

        .jetpack-helmet-wing > span:nth-child(2) {
          top: 3px;
          animation: jetpack-fazer2 0.4s linear infinite;
        }

        .jetpack-helmet-wing > span:nth-child(3) {
          top: 1px;
          animation: jetpack-fazer3 0.4s linear infinite;
          animation-delay: -1s;
        }

        .jetpack-helmet-wing > span:nth-child(4) {
          top: 4px;
          animation: jetpack-fazer4 1s linear infinite;
          animation-delay: -1s;
        }

        @keyframes jetpack-fazer1 {
          0% {
            left: 0;
          }
          100% {
            left: -80px;
            opacity: 0;
          }
        }

        @keyframes jetpack-fazer2 {
          0% {
            left: 0;
          }
          100% {
            left: -100px;
            opacity: 0;
          }
        }

        @keyframes jetpack-fazer3 {
          0% {
            left: 0;
          }
          100% {
            left: -50px;
            opacity: 0;
          }
        }

        @keyframes jetpack-fazer4 {
          0% {
            left: 0;
          }
          100% {
            left: -150px;
            opacity: 0;
          }
        }

        @keyframes jetpack-speeder {
          0% {
            transform: translate(2px, 1px) rotate(0deg);
          }
          10% {
            transform: translate(-1px, -3px) rotate(-1deg);
          }
          20% {
            transform: translate(-2px, 0px) rotate(1deg);
          }
          30% {
            transform: translate(1px, 2px) rotate(0deg);
          }
          40% {
            transform: translate(1px, -1px) rotate(1deg);
          }
          50% {
            transform: translate(-1px, 3px) rotate(-1deg);
          }
          60% {
            transform: translate(-1px, 1px) rotate(0deg);
          }
          70% {
            transform: translate(3px, 1px) rotate(-1deg);
          }
          80% {
            transform: translate(-2px, -1px) rotate(1deg);
          }
          90% {
            transform: translate(2px, 1px) rotate(0deg);
          }
          100% {
            transform: translate(1px, -2px) rotate(-1deg);
          }
        }

        .jetpack-longfazers {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .jetpack-longfazers span {
          position: absolute;
          height: 2px;
          width: 25%;
          background: var(--c);
          opacity: 0.8;
          border-radius: 2px;
        }

        .jetpack-longfazers span:nth-child(1) {
          top: 20%;
          animation: jetpack-lf 0.6s linear infinite;
          animation-delay: -5s;
        }

        .jetpack-longfazers span:nth-child(2) {
          top: 40%;
          animation: jetpack-lf2 0.8s linear infinite;
          animation-delay: -1s;
        }

        .jetpack-longfazers span:nth-child(3) {
          top: 60%;
          animation: jetpack-lf3 0.6s linear infinite;
        }

        .jetpack-longfazers span:nth-child(4) {
          top: 80%;
          animation: jetpack-lf4 0.5s linear infinite;
          animation-delay: -3s;
        }

        @keyframes jetpack-lf {
          0% {
            left: 200%;
          }
          100% {
            left: -200%;
            opacity: 0;
          }
        }

        @keyframes jetpack-lf2 {
          0% {
            left: 200%;
          }
          100% {
            left: -200%;
            opacity: 0;
          }
        }

        @keyframes jetpack-lf3 {
          0% {
            left: 200%;
          }
          100% {
            left: -100%;
            opacity: 0;
          }
        }

        @keyframes jetpack-lf4 {
          0% {
            left: 200%;
          }
          100% {
            left: -100%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}

export default Loader;
