// ==UserScript==
// @name         DougHub Board Question Capture
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Capture board questions from PeerPrep and MKSAP into DougHub
// @author       DougHub
// @match        https://*.acep.org/*
// @match        https://mksap.acponline.org/*
// @match        https://*.acponline.org/*
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_addStyle
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        PORT: 23847,
        ENDPOINT: '/api/capture',
        RETRY_DELAYS: [1000, 2000, 4000],
        TIMEOUT: 10000
    };

    let captureButton = null;

    // --- Utility Functions ---

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function detectSite() {
        const host = window.location.hostname;
        if (host.includes('acep.org')) return 'ACEP PeerPrep';
        if (host.includes('acponline.org') || host.includes('mksap')) return 'MKSAP 19';
        return null;
    }

    // --- Image Extraction Logic ---

    function extractImages(site) {
        const images = [];

        if (site === 'ACEP PeerPrep') {
            // Question Gallery (Fancybox)
            document.querySelectorAll('#media-links a.fancybox, a[data-fancybox]').forEach(a => {
                images.push({
                    url: a.href,
                    title: a.title || 'PeerPrep Gallery Image',
                    type: 'fancybox-gallery',
                    source: 'question'
                });
            });

            // Feedback/KeyPoint Images
            document.querySelectorAll('.feedbackTab img, .keyPointsTab img').forEach(img => {
                images.push({
                    url: img.src,
                    title: img.alt || 'PeerPrep Feedback Image',
                    type: 'inline-image',
                    source: img.closest('.keyPointsTab') ? 'keypoints' : 'feedback'
                });
            });
        } else if (site === 'MKSAP 19') {
            // MKSAP Images
            document.querySelectorAll('.question-text img, .critique img').forEach(img => {
                images.push({
                    url: img.src,
                    title: img.alt || 'MKSAP Image',
                    type: 'inline-image',
                    source: img.closest('.critique') ? 'feedback' : 'question'
                });
            });
        }

        return images;
    }

    // --- Core Capture Logic ---

    function buildPayload() {
        const siteName = detectSite();
        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            hostname: window.location.hostname,
            siteName: siteName,
            pageHTML: document.documentElement.outerHTML,
            bodyText: document.body.innerText,
            images: extractImages(siteName)
        };
    }

    async function sendToDougHub(payload, attempt = 0) {
        setButtonState('sending');

        try {
            return await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `http://localhost:${CONFIG.PORT}${CONFIG.ENDPOINT}`,
                    data: JSON.stringify(payload),
                    headers: { 'Content-Type': 'application/json' },
                    timeout: CONFIG.TIMEOUT,
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) {
                            resolve(res);
                        } else {
                            reject(new Error(`Server responded with ${res.status}`));
                        }
                    },
                    onerror: (err) => reject(new Error('Connection failed')),
                    ontimeout: () => reject(new Error('Request timed out'))
                });
            });
        } catch (error) {
            if (attempt < CONFIG.RETRY_DELAYS.length) {
                setButtonState('retrying', attempt + 1);
                await sleep(CONFIG.RETRY_DELAYS[attempt]);
                return sendToDougHub(payload, attempt + 1);
            }
            throw error;
        }
    }

    // --- UI/Button Management ---

    function setButtonState(state, retryCount = 0) {
        if (!captureButton) return;

        switch (state) {
            case 'idle':
                captureButton.innerText = 'Send to DougHub';
                captureButton.style.backgroundColor = '#2563eb';
                captureButton.disabled = false;
                break;
            case 'sending':
                captureButton.innerText = 'Sending...';
                captureButton.style.backgroundColor = '#1d4ed8';
                captureButton.disabled = true;
                break;
            case 'retrying':
                captureButton.innerText = `Retrying (${retryCount}/3)...`;
                captureButton.style.backgroundColor = '#f59e0b';
                break;
            case 'success':
                captureButton.innerText = '✓ Sent!';
                captureButton.style.backgroundColor = '#10b981';
                setTimeout(() => setButtonState('idle'), 3000);
                break;
            case 'error':
                captureButton.innerText = '✗ Failed';
                captureButton.style.backgroundColor = '#ef4444';
                setTimeout(() => setButtonState('idle'), 3000);
                break;
        }
    }

    function createButton() {
        if (document.getElementById('doughub-capture-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'doughub-capture-btn';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            padding: 12px 24px;
            background-color: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            font-family: sans-serif;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: all 0.2s;
            display: none;
        `;

        btn.innerText = 'Send to DougHub';
        btn.onclick = async () => {
            try {
                const payload = buildPayload();
                await sendToDougHub(payload);
                setButtonState('success');
            } catch (err) {
                setButtonState('error');
                const msg = err.message.includes('failed')
                    ? 'DougHub not running - please start the app'
                    : err.message;
                GM_notification({
                    title: 'DougHub Error',
                    text: msg,
                    timeout: 5000
                });
            }
        };

        document.body.appendChild(btn);
        captureButton = btn;
    }

    function shouldShowButton() {
        const site = detectSite();
        const bodyContent = document.body.innerText;

        if (site === 'ACEP PeerPrep') {
            return bodyContent.includes('Key Point');
        } else if (site === 'MKSAP 19') {
            return bodyContent.includes('Correct Answer') || !!document.querySelector('.critique');
        }
        return false;
    }

    // --- Initialization ---

    function init() {
        if (!detectSite()) return;

        createButton();

        const observer = new MutationObserver(() => {
            if (shouldShowButton()) {
                if (captureButton) captureButton.style.display = 'block';
            } else {
                if (captureButton) captureButton.style.display = 'none';
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    init();
})();
