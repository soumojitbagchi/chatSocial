# 🛠️ chatSocial — Complete Technology Stack & Architecture

This document provides a comprehensive, 100% accurate breakdown of every framework, library, protocol, database, and cloud service used throughout the **chatSocial** project.

---

## 📑 Table of Contents
1. [Frontend Architecture & Core](#1-frontend-architecture--core)
2. [UI, Styling & Animation Systems](#2-ui-styling--animation-systems)
3. [3D Graphics & Visual Effects](#3-3d-graphics--visual-effects)
4. [Real-Time Networking & WebRTC Calling](#4-real-time-networking--webrtc-calling)
5. [Backend Core & REST API Framework](#5-backend-core--rest-api-framework)
6. [Database, ODM & In-Memory Store](#6-database-odm--in-memory-store)
7. [Security, Authentication & Validation](#7-security-authentication--validation)
8. [Cloud Storage, Media CDN & File Uploads](#8-cloud-storage-media-cdn--file-uploads)
9. [DevOps, Tooling & Cloud Deployment](#9-devops-tooling--cloud-deployment)
10. [High-Level System Architecture Diagram](#10-high-level-system-architecture-diagram)

---

## 1. Frontend Architecture & Core

| Technology | Version | Description & Role in Codebase |
|---|---|---|
| **React** | `19.2.7` | Modern component-based declarative UI library powering stateful interfaces, custom hooks, and context providers. |
| **React DOM** | `19.2.7` | DOM rendering and reconciliation layer for React 19. |
| **Vite** | `8.1.1` | Next-generation ultra-fast frontend build tool and development server with Hot Module Replacement (HMR). |
| **TypeScript** | `5.9.3` | Strong static typing, interface contracts, and compile-time safety across all UI features. |
| **React Router** | `8.3.0` | Client-side Single Page Application (SPA) declarative routing for authentication, landing page, and chat views. |

---

## 2. UI, Styling & Animation Systems

| Technology | Version | Description & Role in Codebase |
|---|---|---|
| **Tailwind CSS v4** | `4.3.3` | Utility-first modern CSS framework integrated directly via `@tailwindcss/vite`. |
| **Radix UI Primitives** | `^2.1.15` / `^1.3.3` | Unstyled, fully accessible UI primitives (`@radix-ui/react-label`, `@radix-ui/react-slot`). |
| **Framer Motion** | `13.1.1` | Spring physics animations, layout transitions, drag interactions, and micro-animations. |
| **tw-animate-css** | `1.4.0` | Pre-built CSS keyframe animations for smooth UI feedback and transitions. |
| **Lucide React** | `1.33.0` | Modern, clean icon library used across chat rails, message menus, modals, and call controls. |
| **Class Variance Authority (CVA)** | `0.7.1` | Type-safe component variant management for modular UI components. |
| **clsx** & **tailwind-merge** | `2.1.1` / `3.6.0` | Conditional class name joining and conflict-free Tailwind utility resolution (`cn` utility). |

---

## 3. 3D Graphics & Visual Effects

| Technology | Version | Description & Role in Codebase |
|---|---|---|
| **Three.js** | `0.185.1` | WebGL 3D rendering engine with custom shaders (powers the interactive 3D grass/terrain shader in `GrassCanvas.tsx` on the landing page). |
| **Canvas Confetti** | `1.9.4` | HTML5 canvas-based particle confetti system for celebratory interactions and events. |

---

## 4. Real-Time Networking & WebRTC Calling

| Technology | Version | Layer | Description & Role in Codebase |
|---|---|---|---|
| **Socket.IO** | `4.8.3` | Fullstack (`socket.io` / `socket.io-client`) | Full-duplex WebSocket communication for instant messaging, live typing indicators, user online/offline presence, room sync, and call signaling. |
| **Mediasoup Client** | `3.23.1` | Frontend | WebRTC client library to send and receive audio and video RTP tracks via SFU transports. |
| **Mediasoup SFU** | `3.26.0` | Backend | High-performance Selective Forwarding Unit (SFU) media server handling multi-party WebRTC audio and video calling. |

---

## 5. Backend Core & REST API Framework

| Technology | Version | Description & Role in Codebase |
|---|---|---|
| **Node.js** | `>=18.0.0` (ESM) | Native ECMAScript Modules (`"type": "module"`) server runtime. |
| **Express.js** | `5.2.1` | Fast, minimalist backend web framework organizing REST endpoints for auth, rooms, messages, users, statuses, and calls. |
| **Axios** | `1.19.0` | Promise-based HTTP client with request/response interceptors for Bearer JWT injection and multipart upload headers. |

---

## 6. Database, ODM & In-Memory Store

| Technology | Version | Description & Role in Codebase |
|---|---|---|
| **MongoDB Atlas** / **MongoDB** | Cloud NoSQL DB | Primary cloud document database storing users, contacts, chat rooms, messages, 24h stories, and call logs. |
| **Mongoose** | `9.9.3` | Schema-based Object Data Modeling (ODM) library providing schema validations, populations, indexes, and soft-delete capabilities. |
| **Redis** | `6.2.1` | Optional in-memory key-value data store for distributed caching and horizontal session scaling. |

---

## 7. Security, Authentication & Validation

| Technology | Version | Description & Role in Codebase |
|---|---|---|
| **JSON Web Tokens (JWT)** | `9.0.3` | Cryptographically signed authentication tokens (HMAC-SHA256) verified in REST middleware and WebSocket handshakes. |
| **Bcrypt** | `6.0.0` | Salted password hashing algorithm with timing-attack resistant credential comparisons. |
| **Cookie-Parser** | `1.4.7` | Middleware for parsing and securing HTTP-only authentication cookies. |
| **CORS** | `2.8.6` | Dynamic origin whitelisting supporting multi-domain frontend connections (Vercel & localhost). |
| **Express-Validator** | `7.3.2` | Declarative request payload validation and sanitization middleware. |

---

## 8. Cloud Storage, Media CDN & File Uploads

| Technology | Version | Description & Role in Codebase |
|---|---|---|
| **ImageKit Node.js SDK** | `7.11.0` | Cloud media CDN management for user avatars, group pictures, chat attachments (photos, videos, docs), and 24-hour expiring status stories. |
| **Multer** | `2.3.0` | Middleware handling `multipart/form-data` with in-memory buffers before streaming to ImageKit. |

---

## 9. DevOps, Tooling & Cloud Deployment

| Technology | Purpose & Description |
|---|---|
| **Nodemon** | Development server monitoring file changes and triggering automatic backend restarts. |
| **ESLint 10** | Next-generation linter configured with React Hooks rules and TypeScript parser plugins. |
| **Dotenv** | Secure environment configuration management (`.env`). |
| **Vercel** (`vercel.json`) | Frontend cloud edge deployment with Single Page Application catch-all rewrites. |
| **Render** (`render.yaml`) | Backend managed Web Service deployment with automated build and startup pipelines. |

---

## 10. High-Level System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Vercel)                             │
│  React 19 + TypeScript + Tailwind CSS v4 + Three.js + Framer Motion    │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
         REST API (HTTP / Axios)           WebSockets (Socket.IO)
         JWT in Bearer / Cookies           WebRTC Signaling (Mediasoup)
                   │                                 │
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Render)                              │
│              Express.js 5 + Node.js (ESM) + Mediasoup SFU              │
└─────────┬───────────────────┬───────────────────┬──────────────────┬───┘
          │                   │                   │                  │
          ▼                   ▼                   ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌───────────────┐ ┌───────────────┐
│  MongoDB Atlas   │ │   ImageKit CDN   │ │ JWT & Bcrypt  │ │ Redis (Opt)   │
│  (Mongoose ODM)  │ │ (Media Storage)  │ │  (Security)   │ │   (Caching)   │
└──────────────────┘ └──────────────────┘ └───────────────┘ └───────────────┘
```
