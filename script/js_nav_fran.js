document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Referências de Elementos do DOM ---
    const dialogTitle         = document.getElementById('LGFran_dialogTitle');
    const dialogContent       = document.getElementById('LGFran_dialogContent');
    const playButton          = document.getElementById('LGFran_playAudio');
    const pauseButton         = document.getElementById('LGFran_pauseAudio');
    const prevSegmentButton   = document.getElementById('LGFran_prevSegment');
    const nextSegmentButton   = document.getElementById('LGFran_nextSegment');
    const changeAudioButton   = document.getElementById('LGFran_changeAudio');
    const toggleLoopButton    = document.getElementById('LGFran_toggleLoop');
    const toggleABModeButton  = document.getElementById('LGFran_toggleABMode');
    const repWordButton       = document.getElementById('LGFran_repWord');
    const repFrasButton       = document.getElementById('LGFran_repFras');
    const time4Button         = document.getElementById('LGFran_time4');
    const slowDownAudioButton = document.getElementById('LGFran_slowDownAudio');
    const toggleMuteButton     = document.getElementById('LGFran_toggleMute');
    const languageSelect      = document.getElementById('LGFran_languageSelect');

    // --- 2. Lógica de Alternância de Blocos (HTML Nativo) ---
    const blocks = Array.from(document.querySelectorAll('#LGFran_dialogContent .LGFran_dialog-block'));
    let currentBlockIndex = 0;

    // Detecta qual bloco já inicia visível no HTML (sem a classe LGFran_hidden)
    const initialActiveIndex = blocks.findIndex(block => !block.classList.contains('LGFran_hidden'));
    if (initialActiveIndex !== -1) {
        currentBlockIndex = initialActiveIndex;
    }

    // Função que esconde todos os blocos, mostra o selecionado e atualiza o h2
    function showBlock(index) {
        blocks.forEach((block, idx) => {
            if (idx === index) {
                block.classList.remove('LGFran_hidden');
                
                // Atualiza o título no <h2> lendo o atributo data-title do bloco
                const blockTitle = block.getAttribute('data-title');
                if (dialogTitle && blockTitle) {
                    dialogTitle.textContent = blockTitle;
                }
            } else {
                block.classList.add('LGFran_hidden');
            }
        });
    }

    // Sincroniza o título inicial correto ao carregar
    showBlock(currentBlockIndex);

    // Evento para o botão de trocar de diálogo
    if (changeAudioButton) {
        changeAudioButton.addEventListener('click', () => {
            if (blocks.length === 0) return;

            // Avança para o próximo bloco e faz o loop circular no final
            currentBlockIndex = (currentBlockIndex + 1) % blocks.length;
            showBlock(currentBlockIndex);

            // Para qualquer áudio em reprodução ao trocar de bloco
            stopSpeaking();
        });
    }

    // --- 3. Variáveis de Estado Global ---
    let currentDialogueIndex = 0;
    let currentParagraphIndex = -1;
    let speaking = false;
    let paused = false;
    let loopMode = false;
    let abMode = false;
    let abStartParagraphIndex = -1;
    let abEndParagraphIndex = -1;
    let currentABIndex = -1;
    let repetitionMode = ''; // '', 'word', 'phrase'
    let lastClickedWord = '';
    let lastClickedPhraseParagraph = null;
    let delayMode = false;
    let isSlowed = false;
    let currentAudioRate = 1.0;
    let isMuted = false;
    let currentDisplayLanguage = 'fr';
    let currentSpeechLanguage = 'fr-FR';

    // --- 4. Controle de Timers ---
    let loopTimeout = null;
    let clickDelayTimeout = null;
    let countdownInterval = null;

    // --- Controle de Reprodução Sequencial do Diálogo ---
    let currentParagraphsList = [];
    let playingAllIndex = -1;
    let isPlayingAll = false;

    // Extrai o texto limpo para leitura
    function getCleanTextFromParagraph(paraEl) {
        if (!paraEl) return '';
        
        const targetSpan = paraEl.querySelector(`span[data-lang="${currentDisplayLanguage}"]`);
        if (targetSpan) {
            return targetSpan.textContent.trim();
        }

        const frSpan = paraEl.querySelector('.LGFran_fr, .LGFran_french, [lang="fr"]');
        if (frSpan) {
            return frSpan.textContent.trim();
        }

        return paraEl.textContent.trim();
    }

    // --- 5. Funções Principais de Áudio e Fala ---

    function stopSpeaking() {
        window.speechSynthesis.cancel();
        speaking = false;
        paused = false;
        isPlayingAll = false;
        playingAllIndex = -1;
        
        clearTimeout(loopTimeout);
        clearTimeout(clickDelayTimeout);
        if (typeof stopCountdown === 'function') stopCountdown();
        
        const currentMensagemDiv = document.querySelector('div[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.7)"]');
        if (currentMensagemDiv && document.body.contains(currentMensagemDiv)) {
            document.body.removeChild(currentMensagemDiv);
        }

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

    function speakText(text, rate = 1.0, isRepetition = false, lang = 'fr-FR') {
        if (isMuted) return;

        stopSpeaking();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;

        utterance.onstart = () => {
            speaking = true;
            paused = false;
            playButton?.classList.add('LGFran_active');
        };

        utterance.onend = () => {
            speaking = false;
            paused = false;
            playButton?.classList.remove('LGFran_active');

            if (loopMode && isRepetition) {
                const delay = delayMode ? 4000 : 1000;
                if (typeof startCountdown === 'function' && delayMode) startCountdown(delay);
                loopTimeout = setTimeout(() => {
                    if (typeof stopCountdown === 'function') stopCountdown();
                    if (typeof handleLoopRepetition === 'function') handleLoopRepetition();
                }, delay);
            }
        };

        utterance.onerror = (e) => {
            console.error("Erro na síntese de voz:", e);
            stopSpeaking();
        };

        window.speechSynthesis.speak(utterance);
    }

    // Função para tocar o diálogo inteiro frase por frase
    function playNextInSequence() {
        if (!isPlayingAll || playingAllIndex >= currentParagraphsList.length) {
            isPlayingAll = false;
            playingAllIndex = -1;
            stopSpeaking();
            return;
        }

        const currentPara = currentParagraphsList[playingAllIndex];
        const textToSpeak = getCleanTextFromParagraph(currentPara);

        if (!textToSpeak) {
            playingAllIndex++;
            playNextInSequence();
            return;
        }

        if (typeof highlightParagraph === 'function') {
            highlightParagraph(currentPara);
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = currentSpeechLanguage || 'fr-FR';
        utterance.rate = currentAudioRate || 1.0;

        utterance.onstart = () => {
            speaking = true;
            paused = false;
            playButton?.classList.add('LGFran_active');
            pauseButton?.classList.remove('LGFran_active');
        };

        utterance.onend = () => {
            if (isPlayingAll) {
                playingAllIndex++;
                setTimeout(() => {
                    playNextInSequence();
                }, 300);
            }
        };

        utterance.onerror = (e) => {
            console.error("Erro na reprodução da sequência:", e);
            if (isPlayingAll) {
                playingAllIndex++;
                playNextInSequence();
            } else {
                stopSpeaking();
            }
        };

        window.speechSynthesis.speak(utterance);
    }

    // --- Evento do Botão Play ---
    if (playButton) {
        playButton.addEventListener('click', () => {
            if (paused) {
                resumeSpeaking();
                return;
            }

            const activeBlock = document.querySelector('#LGFran_dialogContent .LGFran_dialog-block:not(.LGFran_hidden)');
            if (!activeBlock) return;

            const querySelectors = '.LGFran_dialog-item, .LGFran_dialog-line, .LGFran_paragraph, p, .LGFran_phrase';
            currentParagraphsList = Array.from(activeBlock.querySelectorAll(querySelectors));

            if (currentParagraphsList.length === 0) {
                currentParagraphsList = Array.from(activeBlock.children);
            }

            if (currentParagraphsList.length > 0) {
                isPlayingAll = true;
                playingAllIndex = 0;
                playNextInSequence();
            }
        });
    }

    // --- Evento do Botão Pause ---
    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            if (speaking && !paused) {
                pauseSpeaking();
            }
        });
    }
    

    function speakParagraph(paragraphElement, isRepetition = false) {
        if (!paragraphElement) return;

        const targetSpan = paragraphElement.querySelector(`span[data-lang="${currentDisplayLanguage}"]`);
        const textToSpeak = targetSpan ? targetSpan.textContent : paragraphElement.textContent;

        highlightParagraph(paragraphElement);
        speakText(textToSpeak, currentAudioRate, isRepetition, currentSpeechLanguage);
    }

    // --- Lógica de Repetição e Ciclos (Loop / AB) ---

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
        if (currentABIndex > abEndParagraphIndex) {
            currentABIndex = abStartParagraphIndex;
        }
    }

    // --- Interface, UI e Manipulação do DOM ---

    function getActiveParagraphs() {
        if (!dialogContent) return [];
        return Array.from(dialogContent.querySelectorAll('.LGFran_dialog-block > p'));
    }

    function highlightParagraph(paragraphElement) {
        clearHighlight();
        if (paragraphElement) {
            paragraphElement.classList.add('LGFran_highlight');
            paragraphElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function clearHighlight() {
        getActiveParagraphs().forEach(p => p.classList.remove('LGFran_highlight'));
    }

    function highlightNextParagraph() {
        const paragraphs = getActiveParagraphs();
        if (paragraphs.length === 0) return;
        currentParagraphIndex = (currentParagraphIndex + 1) % paragraphs.length;
        speakParagraph(paragraphs[currentParagraphIndex]);
    }

    function highlightPrevParagraph() {
        const paragraphs = getActiveParagraphs();
        if (paragraphs.length === 0) return;
        currentParagraphIndex = (currentParagraphIndex - 1 + paragraphs.length) % paragraphs.length;
        speakParagraph(paragraphs[currentParagraphIndex]);
    }

    function startCountdown(durationMs) {
        stopCountdown();
        let secondsLeft = Math.ceil(durationMs / 1000);
        if (time4Button) time4Button.innerText = `⏳ ${secondsLeft}s`;

        countdownInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft > 0) {
                if (time4Button) time4Button.innerText = `⏳ ${secondsLeft}s`;
            } else {
                stopCountdown();
            }
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
            default: currentSpeechLanguage = 'fr-FR'; break;
        }

        if (dialogContent) {
            const allSpans = dialogContent.querySelectorAll('span[data-lang]');
            allSpans.forEach(span => {
                if (span.getAttribute('data-lang') === lang) {
                    span.classList.remove('LGFran_hidden');
                } else {
                    span.classList.add('LGFran_hidden');
                }
            });
        }
    }

    function initializeDialog() {
        stopSpeaking();
        if (!dialogContent) return;
        dialogContent.innerHTML = '';
        const currentData = dialogues[currentDialogueIndex];

        currentData.paragraphs.forEach(item => {
            const block = document.createElement('div');
            block.className = 'LGFran_dialog-block';

            const p = document.createElement('p');
            
            const speakerSpan = document.createElement('strong');
            speakerSpan.textContent = `${item.speaker}: `;
            p.appendChild(speakerSpan);

            const wrapperSpan = document.createElement('span');
            wrapperSpan.className = 'LGFran_original-text';

            Object.keys(item.text).forEach(langKey => {
                const langSpan = document.createElement('span');
                langSpan.setAttribute('data-lang', langKey);
                langSpan.textContent = item.text[langKey];
                if (langKey !== currentDisplayLanguage) {
                    langSpan.classList.add('LGFran_hidden');
                }
                wrapperSpan.appendChild(langSpan);
            });

            p.appendChild(wrapperSpan);
            block.appendChild(p);
            dialogContent.appendChild(block);
        });

        currentParagraphIndex = -1;
    }

    function getWordAtPoint(element, clientX, clientY) {
        if (element.classList.contains('LGFran_original-text')) {
            element = element.querySelector(`span[data-lang="${currentDisplayLanguage}"]:not(.LGFran_hidden)`);
            if (!element) return null;
        }

        if (element.nodeType === Node.ELEMENT_NODE && element.hasAttribute('data-lang')) {
            const range = document.caretRangeFromPoint(clientX, clientY);
            if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                const textNode = range.startContainer;
                const text = textNode.textContent;
                const offset = range.startOffset;

                let start = offset;
                while (start > 0 && /\p{L}|\p{N}/u.test(text[start - 1])) {
                    start--;
                }

                let end = offset;
                while (end < text.length && /\p{L}|\p{N}/u.test(text[end])) {
                    end++;
                }
                const word = text.substring(start, end);
                return word.trim() !== '' ? word.trim() : null;
            }
        }
        return null;
    }

    function updateABButtonIcon() {
        if (!toggleABModeButton) return;

        if (!abMode) {
            toggleABModeButton.innerHTML = '🅰️🅱️';
            return;
        }

        if (abStartParagraphIndex === -1 && abEndParagraphIndex === -1) {
            toggleABModeButton.innerHTML = '❌❌';
        } else if (abStartParagraphIndex !== -1 && abEndParagraphIndex === -1) {
            toggleABModeButton.innerHTML = '🅰️❌';
        } else if (abStartParagraphIndex !== -1 && abEndParagraphIndex !== -1) {
            toggleABModeButton.innerHTML = '🅰️🅱️';
            playButton?.click();
        }
    }

    if (dialogContent) {
        dialogContent.addEventListener('click', (event) => {
            const clickedParagraph = event.target.closest('.LGFran_dialog-block > p');
            if (!clickedParagraph) return;
            
            const existingMensagemDiv = document.querySelector('div[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.7)"]');
            if (existingMensagemDiv && document.body.contains(existingMensagemDiv)) {
                document.body.removeChild(existingMensagemDiv);
            }

            const mensagemDiv = document.createElement('div');
            mensagemDiv.textContent = "⏳ Aguarde ...";
            mensagemDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                z-index: 9999;
                font-size: 1.2em;
                text-align: center;
            `;
            document.body.appendChild(mensagemDiv);
            
            stopSpeaking();
            toggleMuteButton?.click();

            clearTimeout(clickDelayTimeout);
            stopCountdown();

            const initialDelay = delayMode ? 4000 : 0;
            if (delayMode && initialDelay > 0) {
                startCountdown(initialDelay);
            }

            clickDelayTimeout = setTimeout(() => {
                const currentMensagemDiv = document.querySelector('div[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.7)"]');
                if (currentMensagemDiv && document.body.contains(currentMensagemDiv)) {
                    document.body.removeChild(currentMensagemDiv);
                }

                stopCountdown();
                
                if (isMuted) {
                    toggleMuteButton?.click();
                }

                if (repetitionMode === 'word') {
                    const clickedWord = getWordAtPoint(event.target, event.clientX, event.clientY);
                    if (clickedWord) {
                        lastClickedWord = clickedWord;
                        speakText(clickedWord, currentAudioRate, true, currentSpeechLanguage);
                    }
                } else if (repetitionMode === 'phrase') {
                    lastClickedPhraseParagraph = clickedParagraph;
                    speakParagraph(clickedParagraph, true);
                } else if (abMode) {
                    const paragraphs = getActiveParagraphs();
                    const clickedIndex = paragraphs.indexOf(clickedParagraph);

                    if (clickedIndex === -1) return;

                    if (abStartParagraphIndex === -1) {
                        abStartParagraphIndex = clickedIndex;
                        highlightParagraph(clickedParagraph);
                        updateABButtonIcon();
                    } else if (abEndParagraphIndex === -1) {
                        abEndParagraphIndex = clickedIndex;
                        if (abEndParagraphIndex < abStartParagraphIndex) {
                            [abStartParagraphIndex, abEndParagraphIndex] = [abEndParagraphIndex, abStartParagraphIndex];
                        }
                        for (let i = abStartParagraphIndex; i <= abEndParagraphIndex; i++) {
                            if (paragraphs[i]) {
                                paragraphs[i].classList.add('LGFran_highlight-ab');
                            }
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
                    if (currentParagraphIndex !== -1) {
                        speakParagraph(clickedParagraph);
                    }
                }
            }, 2000);
        });
    }

    // --- Event Listeners dos Botões Protegidos ---

    playButton?.addEventListener('click', () => {  
        if (!speaking && !paused) {
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length === 0) return;

            if (loopMode && (repetitionMode === 'word' && !lastClickedWord || repetitionMode === 'phrase' && !lastClickedPhraseParagraph)) {
                return;
            }

            stopSpeaking();
            clearTimeout(clickDelayTimeout);

            const initialDelay = delayMode ? 4000 : 0;

            if (delayMode && initialDelay > 0) {
                startCountdown(initialDelay);
            }

            clickDelayTimeout = setTimeout(() => {
                stopCountdown();
                if (abMode) {
                    playABSegment();
                } else if (loopMode) {
                    handleLoopRepetition();
                } else {
                    if (currentParagraphIndex === -1) {
                        currentParagraphIndex = 0;
                    }
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
                if (delayMode && initialDelay > 0) {
                    startCountdown(initialDelay);
                }
                clickDelayTimeout = setTimeout(() => {
                    stopCountdown();
                    if (abMode) {
                        playABSegment();
                    } else if (loopMode) {
                        handleLoopRepetition();
                    } else {
                        speakParagraph(paragraphs[currentParagraphIndex]);
                    }
                }, initialDelay);
            }
        }
        playButton?.classList.add('LGFran_active');
        pauseButton?.classList.remove('LGFran_active');
    });

    pauseButton?.addEventListener('click', () => {
        pauseSpeaking();
    });

    prevSegmentButton?.addEventListener('click', () => {
        stopSpeaking();
        highlightPrevParagraph();
    });

    nextSegmentButton?.addEventListener('click', () => {
        stopSpeaking();
        highlightNextParagraph();
    });

    changeAudioButton?.addEventListener('click', () => {
        currentDialogueIndex = (currentDialogueIndex + 1) % dialogues.length;
        initializeDialog();
    });

    toggleLoopButton?.addEventListener('click', () => { 
        loopMode = !loopMode;
        toggleLoopButton.classList.toggle('LGFran_active', loopMode);
        mutepalternar();

        if (!loopMode) {
            clearTimeout(loopTimeout);
            stopCountdown();
        } else {
            if (speaking || paused) {
                stopSpeaking();
                if (abMode) {
                    playABSegment();
                } else {
                    const paragraphs = getActiveParagraphs();
                    if (paragraphs.length > 0) {
                        currentParagraphIndex = (currentParagraphIndex === -1) ? 0 : currentParagraphIndex;
                        speakParagraph(paragraphs[currentParagraphIndex]);
                    }
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
        if (repetitionMode === '') {
            lastClickedWord = '';
        }
    });

    repFrasButton?.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'phrase') ? '' : 'phrase';
        mutepalternar();
        repFrasButton.classList.toggle('LGFran_active', repetitionMode === 'phrase');
        repWordButton?.classList.remove('LGFran_active');
        
        stopSpeaking();
        if (repetitionMode === '') {
            lastClickedPhraseParagraph = null;
        }
    });

    time4Button?.addEventListener('click', () => {
        delayMode = !delayMode;
        time4Button.classList.toggle('LGFran_active', delayMode);
        stopCountdown();
    });

    slowDownAudioButton?.addEventListener('click', () => {
        isSlowed = !isSlowed;
        currentAudioRate = isSlowed ? 0.70 : 1.0;
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
        if (isMuted) {
            stopSpeaking();
            toggleMuteButton.innerHTML = '🔇';
        } else {
            toggleMuteButton.innerHTML = '🔊';
        }
    });

    languageSelect?.addEventListener('change', (event) => {
        const selectedLang = event.target.value;
        updateDialogLanguage(selectedLang);
    });

// --- Inicialização ---
    // REMOVE OU COMENTA ESTA LINHA ABAIXO PARA NÃO APAGAR O SEU HTML:
    // initializeDialog(); 

    if (languageSelect) {
        languageSelect.value = 'fr';
        updateDialogLanguage('fr');
    }
    updateABButtonIcon();
});