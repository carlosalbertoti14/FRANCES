document.addEventListener('DOMContentLoaded', () => {

    // ===== DEBUG: ative com window.LGFran_debug = true no console =====
    window.LGFran_debug = false;
    function log(...a)  { if (window.LGFran_debug) console.log('[LGFran]', ...a); }

    // ============================================================
    // 1. DOM
    // ============================================================
    const dialogTitle         = document.getElementById('LGFran_dialogTitle');
    const dialogContent       = document.getElementById('LGFran_dialogContent');

    const playButton          = document.getElementById('LGFran_playAudio')  || document.getElementById('LGFran_play');
    const pauseButton         = document.getElementById('LGFran_pauseAudio') || document.getElementById('LGFran_pause');
    const stopButton          = document.getElementById('LGFran_stop');

    const prevSegmentButton   = document.getElementById('LGFran_prevSegment');
    const nextSegmentButton   = document.getElementById('LGFran_nextSegment');
    const changeAudioButton   = document.getElementById('LGFran_changeAudio');
    const toggleLoopButton    = document.getElementById('LGFran_toggleLoop');
    const toggleABModeButton  = document.getElementById('LGFran_toggleABMode');
    const repWordButton       = document.getElementById('LGFran_repWord');
    const repFrasButton       = document.getElementById('LGFran_repFras');
    const time4Button         = document.getElementById('LGFran_time4');
    const slowDownAudioButton = document.getElementById('LGFran_slowDownAudio');
    const toggleMuteButton    = document.getElementById('LGFran_toggleMute');
    const languageSelect      = document.getElementById('LGFran_languageSelect');

    // ============================================================
    // 2. Blocos HTML
    // ============================================================
    const blocks = Array.from(document.querySelectorAll('#LGFran_dialogContent .LGFran_dialog-block'));
    let currentBlockIndex = 0;
    const initialActiveIndex = blocks.findIndex(b => !b.classList.contains('LGFran_hidden'));
    if (initialActiveIndex !== -1) currentBlockIndex = initialActiveIndex;

    function showBlock(index) {
        blocks.forEach((block, idx) => {
            if (idx === index) {
                block.classList.remove('LGFran_hidden');
                const t = block.getAttribute('data-title');
                if (dialogTitle && t) dialogTitle.textContent = t;
            } else {
                block.classList.add('LGFran_hidden');
            }
        });
    }
    showBlock(currentBlockIndex);

    changeAudioButton?.addEventListener('click', () => {
        if (blocks.length === 0) return;
        currentBlockIndex = (currentBlockIndex + 1) % blocks.length;
        showBlock(currentBlockIndex);
        stopSpeaking();
    });

    // ============================================================
    // 3. Estado
    // ============================================================
    let currentParagraphIndex = -1;
    let speaking = false;
    let paused = false;
    let loopMode = false;
    let abMode = false;
    let abStartParagraphIndex = -1;
    let abEndParagraphIndex = -1;
    let currentABIndex = -1;
    let repetitionMode = '';
    let lastClickedWord = '';
    let lastClickedPhraseParagraph = null;
    let delayMode = false;
    let isSlowed = false;
    let currentAudioRate = 1.0;
    let isMuted = false;
    let currentDisplayLanguage = 'fr';
    let currentSpeechLanguage = 'fr-FR';

    // ============================================================
    // 4. Timers / refs
    // ============================================================
    let loopTimeout = null;
    let clickDelayTimeout = null;
    let countdownInterval = null;
    let activeUtterance = null;
    let utteranceToken = 0;   // token incremental: cada nova fala incrementa

    // ============================================================
    // 5. Helpers
    // ============================================================
    function getActiveParagraphs() {
        if (!dialogContent) return [];
        const activeBlock = dialogContent.querySelector('.LGFran_dialog-block:not(.LGFran_hidden)');
        return activeBlock ? Array.from(activeBlock.querySelectorAll('p')) : [];
    }

    function sanitizeTextForSpeech(text) {
        if (!text) return '';
        return text
            .replace(/[\u2014\u2013]/g, ', ')
            .replace(/\u2026/g, '...')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // ============================================================
    // 6. Fala
    // ============================================================
    function stopSpeaking() {
        utteranceToken++;          // invalida qualquer callback pendente
        activeUtterance = null;
        try { window.speechSynthesis.cancel(); } catch (e) {}

        speaking = false;
        paused = false;

        clearTimeout(loopTimeout);
        clearTimeout(clickDelayTimeout);
        stopCountdown();

        const msg = document.querySelector('div[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.7)"]');
        if (msg && document.body.contains(msg)) document.body.removeChild(msg);

        playButton?.classList.remove('LGFran_active');
        pauseButton?.classList.remove('LGFran_active');
    }

    function pauseSpeaking() {
        if (speaking && !paused) {
            window.speechSynthesis.pause();
            paused = true;
            pauseButton?.classList.add('LGFran_active');
            playButton?.classList.remove('LGFran_active');
        }
    }

    function resumeSpeaking() {
        if (paused) {
            window.speechSynthesis.resume();
            paused = false;
            playButton?.classList.add('LGFran_active');
            pauseButton?.classList.remove('LGFran_active');
        }
    }

    function speakText(rawText, rate = 1.0, isRepetition = false, lang = 'fr-FR') {
        if (isMuted) return;
        const text = sanitizeTextForSpeech(rawText);
        if (!text) return;

        // Só cancela se houver algo realmente em execução/fila.
        // Cancelar quando a fila já está vazia pode envenenar o Chrome.
        try {
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
            }
        } catch (e) {}

        clearTimeout(loopTimeout);
        clearTimeout(clickDelayTimeout);

        const myToken = ++utteranceToken;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        activeUtterance = utterance;

        utterance.onstart = () => {
            if (myToken !== utteranceToken) return;
            speaking = true;
            paused = false;
            playButton?.classList.add('LGFran_active');
            pauseButton?.classList.remove('LGFran_active');
            log('onstart', myToken, text.slice(0, 30));
        };

        utterance.onend = () => {
            if (myToken !== utteranceToken) return;
            speaking = false;
            paused = false;
            playButton?.classList.remove('LGFran_active');
            log('onend', myToken, text.slice(0, 30));

            if (loopMode && isRepetition) {
                const delay = delayMode ? 4000 : 1000;
                if (delayMode) startCountdown(delay);
                loopTimeout = setTimeout(() => {
                    stopCountdown();
                    handleLoopRepetition();
                }, delay);

            } else if (!isRepetition && !abMode && !paused) {
                const paragraphs = getActiveParagraphs();
                if (paragraphs.length > 0 && currentParagraphIndex !== -1) {
                    currentParagraphIndex++;
                    if (currentParagraphIndex >= paragraphs.length) {
                        currentParagraphIndex = 0;
                        if (!loopMode) { stopSpeaking(); return; }
                    }
                    setTimeout(() => {
                        if (myToken === utteranceToken) {
                            speakParagraph(paragraphs[currentParagraphIndex]);
                        }
                    }, 400);
                }
            }
        };

        utterance.onerror = (e) => {
            if (myToken !== utteranceToken) return;
            // Cancelamentos intencionais: ignora silenciosamente
            if (e.error === 'canceled' || e.error === 'interrupted') return;
            log('onerror', myToken, e.error);
            speaking = false;
            paused = false;
            playButton?.classList.remove('LGFran_active');
        };

        try {
            window.speechSynthesis.speak(utterance);
            log('speak', myToken, text.slice(0, 30));
        } catch (e) {
            log('speak falhou', e);
        }
    }

    function speakParagraph(paragraphElement, isRepetition = false) {
        if (!paragraphElement) return;
        const targetSpan = paragraphElement.querySelector(`span[data-lang="${currentDisplayLanguage}"]`);
        const text = targetSpan ? targetSpan.textContent : paragraphElement.textContent;
        highlightParagraph(paragraphElement);
        speakText(text, currentAudioRate, isRepetition, currentSpeechLanguage);
    }

    // ============================================================
    // 7. Loop / AB
    // ============================================================
    function handleLoopRepetition() {
        if (!loopMode) return;
        if (repetitionMode === 'word' && lastClickedWord) {
            speakText(lastClickedWord, currentAudioRate, true, currentSpeechLanguage);
        } else if (repetitionMode === 'phrase' && lastClickedPhraseParagraph) {
            speakParagraph(lastClickedPhraseParagraph, true);
        } else if (abMode) {
            playABSegment();
        } else {
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length === 0) return;
            currentParagraphIndex = (currentParagraphIndex + 1) % paragraphs.length;
            speakParagraph(paragraphs[currentParagraphIndex], true);
        }
    }

    function playABSegment() {
        const paragraphs = getActiveParagraphs();
        if (abStartParagraphIndex === -1 || abEndParagraphIndex === -1) return;
        if (currentABIndex < abStartParagraphIndex || currentABIndex > abEndParagraphIndex) {
            currentABIndex = abStartParagraphIndex;
        }
        speakParagraph(paragraphs[currentABIndex], true);
        currentABIndex++;
        if (currentABIndex > abEndParagraphIndex) currentABIndex = abStartParagraphIndex;
    }

    // ============================================================
    // 8. UI
    // ============================================================
    function highlightParagraph(el) {
        clearHighlight();
        if (el) {
            el.classList.add('LGFran_highlight');
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    function clearHighlight() {
        dialogContent?.querySelectorAll('.LGFran_highlight').forEach(p => p.classList.remove('LGFran_highlight'));
    }
    function highlightNextParagraph() {
        const paragraphs = getActiveParagraphs();
        if (!paragraphs.length) return;
        currentParagraphIndex = (currentParagraphIndex + 1) % paragraphs.length;
        speakParagraph(paragraphs[currentParagraphIndex]);
    }
    function highlightPrevParagraph() {
        const paragraphs = getActiveParagraphs();
        if (!paragraphs.length) return;
        currentParagraphIndex = (currentParagraphIndex - 1 + paragraphs.length) % paragraphs.length;
        speakParagraph(paragraphs[currentParagraphIndex]);
    }

    function startCountdown(durationMs) {
        stopCountdown();
        let s = Math.ceil(durationMs / 1000);
        if (time4Button) time4Button.innerText = `⏳ ${s}s`;
        countdownInterval = setInterval(() => {
            s--;
            if (s > 0) { if (time4Button) time4Button.innerText = `⏳ ${s}s`; }
            else stopCountdown();
        }, 1000);
    }
    function stopCountdown() {
        clearInterval(countdownInterval);
        if (time4Button) time4Button.innerText = '⏱️';
    }

    function mutepalternar() {
        if (isMuted) return;
        window.speechSynthesis.cancel();
    }

    function updateDialogLanguage(lang) {
        currentDisplayLanguage = lang;
        switch (lang) {
            case 'pt': currentSpeechLanguage = 'pt-BR'; break;
            case 'en': currentSpeechLanguage = 'en-US'; break;
            default:   currentSpeechLanguage = 'fr-FR'; break;
        }
        if (dialogContent) {
            dialogContent.querySelectorAll('span[data-lang]').forEach(s => {
                if (s.getAttribute('data-lang') === lang) s.classList.remove('LGFran_hidden');
                else s.classList.add('LGFran_hidden');
            });
        }
    }

    function getWordAtPoint(element, x, y) {
        if (element.classList.contains('LGFran_original-text')) {
            element = element.querySelector(`span[data-lang="${currentDisplayLanguage}"]:not(.LGFran_hidden)`);
            if (!element) return null;
        }
        if (element.nodeType === Node.ELEMENT_NODE && element.hasAttribute('data-lang')) {
            const range = document.caretRangeFromPoint(x, y);
            if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                const t = range.startContainer.textContent;
                const o = range.startOffset;
                let s = o; while (s > 0 && /\p{L}|\p{N}/u.test(t[s-1])) s--;
                let e = o; while (e < t.length && /\p{L}|\p{N}/u.test(t[e])) e++;
                const w = t.substring(s, e).trim();
                return w || null;
            }
        }
        return null;
    }

    function updateABButtonIcon() {
        if (!toggleABModeButton) return;
        if (!abMode) { toggleABModeButton.innerHTML = '🅰️🅱️'; return; }
        if (abStartParagraphIndex === -1 && abEndParagraphIndex === -1) toggleABModeButton.innerHTML = '❌❌';
        else if (abStartParagraphIndex !== -1 && abEndParagraphIndex === -1) toggleABModeButton.innerHTML = '🅰️❌';
        else if (abStartParagraphIndex !== -1 && abEndParagraphIndex !== -1) {
            toggleABModeButton.innerHTML = '🅰️🅱️';
            playButton?.click();
        }
    }

    // ============================================================
    // 9. Clique no conteúdo
    // ============================================================
    if (dialogContent) {
        dialogContent.addEventListener('click', (event) => {
            const clickedParagraph = event.target.closest('.LGFran_dialog-block > p');
            if (!clickedParagraph) return;

            const prev = document.querySelector('div[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.7)"]');
            if (prev && document.body.contains(prev)) document.body.removeChild(prev);

            const msg = document.createElement('div');
            msg.textContent = "⏳ Aguarde ...";
            msg.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background-color:rgba(0,0,0,0.7);color:white;padding:15px 25px;border-radius:8px;z-index:9999;font-size:1.2em;text-align:center;`;
            document.body.appendChild(msg);

            stopSpeaking();
            toggleMuteButton?.click();

            clearTimeout(clickDelayTimeout);
            stopCountdown();

            const initialDelay = delayMode ? 4000 : 0;
            if (delayMode && initialDelay > 0) startCountdown(initialDelay);

            clickDelayTimeout = setTimeout(() => {
                const cur = document.querySelector('div[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.7)"]');
                if (cur && document.body.contains(cur)) document.body.removeChild(cur);
                stopCountdown();
                if (isMuted) toggleMuteButton?.click();

                if (repetitionMode === 'word') {
                    const w = getWordAtPoint(event.target, event.clientX, event.clientY);
                    if (w) { lastClickedWord = w; speakText(w, currentAudioRate, true, currentSpeechLanguage); }
                } else if (repetitionMode === 'phrase') {
                    lastClickedPhraseParagraph = clickedParagraph;
                    speakParagraph(clickedParagraph, true);
                } else if (abMode) {
                    const paragraphs = getActiveParagraphs();
                    const idx = paragraphs.indexOf(clickedParagraph);
                    if (idx === -1) return;
                    if (abStartParagraphIndex === -1) {
                        abStartParagraphIndex = idx;
                        highlightParagraph(clickedParagraph);
                        updateABButtonIcon();
                    } else if (abEndParagraphIndex === -1) {
                        abEndParagraphIndex = idx;
                        if (abEndParagraphIndex < abStartParagraphIndex) {
                            [abStartParagraphIndex, abEndParagraphIndex] = [abEndParagraphIndex, abStartParagraphIndex];
                        }
                        for (let i = abStartParagraphIndex; i <= abEndParagraphIndex; i++) {
                            paragraphs[i]?.classList.add('LGFran_highlight-ab');
                        }
                        clearHighlight();
                        updateABButtonIcon();
                    } else {
                        abStartParagraphIndex = -1;
                        abEndParagraphIndex = -1;
                        currentABIndex = -1;
                        document.querySelectorAll('.LGFran_highlight-ab').forEach(p => p.classList.remove('LGFran_highlight-ab'));
                        updateABButtonIcon();
                    }
                } else {
                    currentParagraphIndex = getActiveParagraphs().indexOf(clickedParagraph);
                    if (currentParagraphIndex !== -1) speakParagraph(clickedParagraph);
                }
            }, 2000);
        });
    }

    // ============================================================
    // 10. Botões
    // ============================================================
    playButton?.addEventListener('click', () => {
        if (!speaking && !paused) {
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length === 0) return;

            if (loopMode && ((repetitionMode === 'word' && !lastClickedWord) ||
                             (repetitionMode === 'phrase' && !lastClickedPhraseParagraph))) {
                return;
            }

            stopSpeaking();
            clearTimeout(clickDelayTimeout);

            const initialDelay = delayMode ? 4000 : 0;
            if (delayMode && initialDelay > 0) startCountdown(initialDelay);

            clickDelayTimeout = setTimeout(() => {
                stopCountdown();
                if (abMode) playABSegment();
                else if (loopMode) handleLoopRepetition();
                else {
                    if (currentParagraphIndex === -1) currentParagraphIndex = 0;
                    speakParagraph(paragraphs[currentParagraphIndex]);
                }
            }, initialDelay);

        } else if (paused) {
            resumeSpeaking();

        } else if (speaking) {
            stopSpeaking();
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0 && currentParagraphIndex !== -1) {
                const initialDelay = delayMode ? 4000 : 0;
                if (delayMode && initialDelay > 0) startCountdown(initialDelay);
                clickDelayTimeout = setTimeout(() => {
                    stopCountdown();
                    if (abMode) playABSegment();
                    else if (loopMode) handleLoopRepetition();
                    else speakParagraph(paragraphs[currentParagraphIndex]);
                }, initialDelay);
            }
        }
        playButton.classList.add('LGFran_active');
        pauseButton?.classList.remove('LGFran_active');
    });

    pauseButton?.addEventListener('click', () => pauseSpeaking());

    stopButton?.addEventListener('click', () => {
        stopSpeaking();
        stopCountdown();
        clearTimeout(loopTimeout);
        clearTimeout(clickDelayTimeout);
        currentParagraphIndex = -1;
        log('STOP');
    });

    prevSegmentButton?.addEventListener('click', () => { stopSpeaking(); highlightPrevParagraph(); });
    nextSegmentButton?.addEventListener('click', () => { stopSpeaking(); highlightNextParagraph(); });

    toggleLoopButton?.addEventListener('click', () => {
        loopMode = !loopMode;
        toggleLoopButton.classList.toggle('LGFran_active', loopMode);
        mutepalternar();
        if (!loopMode) { clearTimeout(loopTimeout); stopCountdown(); }
        else if (speaking || paused) {
            stopSpeaking();
            if (abMode) playABSegment();
            else {
                const paragraphs = getActiveParagraphs();
                if (paragraphs.length > 0) {
                    currentParagraphIndex = (currentParagraphIndex === -1) ? 0 : currentParagraphIndex;
                    speakParagraph(paragraphs[currentParagraphIndex]);
                }
            }
        }
    });

    toggleABModeButton?.addEventListener('click', () => {
        abMode = !abMode;
        toggleABModeButton.classList.toggle('LGFran_active', abMode);
        stopSpeaking();
        document.querySelectorAll('.LGFran_highlight-ab').forEach(p => p.classList.remove('LGFran_highlight-ab'));
        abStartParagraphIndex = -1;
        abEndParagraphIndex = -1;
        currentABIndex = -1;
        updateABButtonIcon();
    });

    repWordButton?.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'word') ? '' : 'word';
        mutepalternar();
        repWordButton.classList.toggle('LGFran_active', repetitionMode === 'word');
        repFrasButton?.classList.remove('LGFran_active');
        stopSpeaking();
        if (repetitionMode === '') lastClickedWord = '';
    });

    repFrasButton?.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'phrase') ? '' : 'phrase';
        mutepalternar();
        repFrasButton.classList.toggle('LGFran_active', repetitionMode === 'phrase');
        repWordButton?.classList.remove('LGFran_active');
        stopSpeaking();
        if (repetitionMode === '') lastClickedPhraseParagraph = null;
    });

    time4Button?.addEventListener('click', () => {
        delayMode = !delayMode;
        time4Button.classList.toggle('LGFran_active', delayMode);
        stopCountdown();
    });

    slowDownAudioButton?.addEventListener('click', () => {
        isSlowed = !isSlowed;
        currentAudioRate = isSlowed ? 0.50 : 1.0;
        slowDownAudioButton.classList.toggle('LGFran_active', isSlowed);
        if (speaking || paused) {
            stopSpeaking();
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0 && currentParagraphIndex !== -1) {
                speakParagraph(paragraphs[currentParagraphIndex]);
            }
        }
    });

    toggleMuteButton?.addEventListener('click', () => {
        isMuted = !isMuted;
        toggleMuteButton.classList.toggle('LGFran_active', isMuted);
        if (isMuted) { stopSpeaking(); toggleMuteButton.innerHTML = '🔇'; }
        else toggleMuteButton.innerHTML = '🔊';
    });

    languageSelect?.addEventListener('change', (e) => updateDialogLanguage(e.target.value));

    // ============================================================
    // 11. Init
    // ============================================================
    if (languageSelect) { languageSelect.value = 'fr'; updateDialogLanguage('fr'); }
    updateABButtonIcon();

    log('Pronto. Ative debug com: window.LGFran_debug = true');
});