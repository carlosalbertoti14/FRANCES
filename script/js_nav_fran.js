// script/js_nav_fran.js

document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('LGFran_play');
    const pauseButton = document.getElementById('LGFran_pause');
    const prevSegmentButton = document.getElementById('LGFran_prevSegment');
    const nextSegmentButton = document.getElementById('LGFran_nextSegment');
    const toggleLoopButton = document.getElementById('LGFran_toggleLoop');
    const toggleABModeButton = document.getElementById('LGFran_toggleABMode');
    const toggleMuteButton = document.getElementById('LGFran_toggleMute');
    const changeAudioButton = document.getElementById('LGFran_changeAudio');
    const dialogContent = document.getElementById('LGFran_dialogContent');
    const dialogBlocks = document.querySelectorAll('.LGFran_dialog-block');
    const dialogTitle = document.getElementById('LGFran_dialogTitle');

    const repWordButton = document.getElementById('LGFran_repWord');
    const repFrasButton = document.getElementById('LGFran_repFras');
    const time4Button = document.getElementById('LGFran_time4'); // Novo botão

    let currentUtterance = null;
    let speaking = false;
    let paused = false;
    let loopMode = false;
    let abMode = false;
    let abStartParagraphIndex = -1;
    let abEndParagraphIndex = -1;
    let currentParagraphIndex = -1;
    let isMuted = false;
    let repetitionMode = ''; // 'word', 'phrase', ou '' (para repetição normal de parágrafo)
    let delayMode = false; // Novo estado para o botão de 4s
    let loopTimeout = null; // Para controlar o tempo de espera no loop

    // Variáveis para armazenar a última palavra/frase clicada para repetição em loop
    let lastClickedWord = '';
    let lastClickedPhraseParagraph = null; // Armazena o elemento <p> da frase clicada

    const dialogues = [
        { id: 'LGFran_dialog_Dialogo_do_Cafe', title: 'Diálogo do Café' },
        { id: 'LGFran_dialog_Caio_et_Ayheon_Vieux_Amis', title: 'Caio e Ayheon - Velhos Amigos' },
        { id: 'LGFran_dialog_Caio_et_la_Francaise', title: 'Caio e a Francesa' }
    ];
    let currentDialogueIndex = 0;

    // --- Funções de Leitura (Speech Synthesis) ---

    let voices = [];
    let preferredVoice = null;

    function populateVoiceList() {
        voices = window.speechSynthesis.getVoices();
        const frenchVoices = voices.filter(voice => voice.lang.startsWith('fr-') || voice.lang === 'fr-FR');
        if (frenchVoices.length > 0) {
            preferredVoice = frenchVoices.find(voice => voice.name.includes('Google Français')) || frenchVoices[0];
            console.log('Voz francesa preferida:', preferredVoice ? preferredVoice.name : 'Nenhuma voz específica encontrada.');
        } else {
            console.warn('Nenhuma voz francesa encontrada. A síntese de fala pode não funcionar como esperado.');
        }
    }

    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList();

    // Função para ler um texto específico
    function speakText(text, rate = 1.0, isRepetition = false) {
        if (isMuted) {
            speaking = false; // Garante que speaking seja false se mudo
            return;
        }

        speechSynthesis.cancel(); // Cancela qualquer fala anterior

        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = 'fr-FR';
        currentUtterance.rate = rate;

        if (preferredVoice) {
            currentUtterance.voice = preferredVoice;
        }

        currentUtterance.onend = () => {
            speaking = false;
            paused = false;

            // Lógica de loop com ou sem delay
            if (loopMode) {
                if (delayMode) {
                    loopTimeout = setTimeout(() => {
                        handleLoopRepetition();
                    }, 4000); // 4 segundos de espera
                } else {
                    handleLoopRepetition();
                }
            } else if (!isRepetition && !abMode && !paused) {
                // Se não está em loop, nem repetição isolada, nem AB, avança normalmente
                highlightNextParagraph();
            } else if (!isRepetition && abMode) {
                // Lógica de modo AB (já tratada na função playABSegment)
            } else if (isRepetition && repetitionMode !== '') {
                // Para repetições isoladas (word/phrase) sem loop, não faz nada depois de falar
                clearHighlight(); // Remove destaque após a fala isolada
            }
        };

        currentUtterance.onerror = (event) => {
            console.error('Erro na síntese de fala:', event.error);
            speaking = false;
            // Em caso de erro, ainda tenta continuar o loop se ativado
            if (loopMode) {
                if (delayMode) {
                    loopTimeout = setTimeout(() => {
                        handleLoopRepetition();
                    }, 4000);
                } else {
                    handleLoopRepetition();
                }
            }
        };

        speechSynthesis.speak(currentUtterance);
        speaking = true;
        paused = false;

        // Atualiza o estado do botão de Play/Pause
        playButton.classList.add('LGFran_active');
        pauseButton.classList.remove('LGFran_active');
    }

    // Função para parar a leitura
    function stopSpeaking() {
        speechSynthesis.cancel();
        clearTimeout(loopTimeout); // Limpa qualquer timeout de loop
        speaking = false;
        paused = false;
        clearHighlight();
        playButton.classList.remove('LGFran_active');
        pauseButton.classList.remove('LGFran_active');
    }

    // Função para pausar a leitura
    function pauseSpeaking() {
        if (speaking && !paused) {
            speechSynthesis.pause();
            clearTimeout(loopTimeout); // Limpa o timeout ao pausar
            paused = true;
            pauseButton.classList.add('LGFran_active');
            playButton.classList.remove('LGFran_active');
        }
    }

    // Função para continuar a leitura
    function resumeSpeaking() {
        if (speaking && paused) {
            speechSynthesis.resume();
            paused = false;
            playButton.classList.add('LGFran_active');
            pauseButton.classList.remove('LGFran_active');
        } else if (!speaking && currentParagraphIndex !== -1) {
            // Se não estava falando mas tinha um parágrafo selecionado (e o loop está ativo)
            if (loopMode) {
                handleLoopRepetition(); // Retoma o loop
            } else {
                // Senão, retoma a fala do parágrafo atual (comportamento padrão)
                const paragraph = getActiveParagraphs()[currentParagraphIndex];
                if (paragraph) {
                    speakParagraph(paragraph);
                }
            }
        }
    }

    // --- Funções de Controle de Diálogo e Destaque ---

    function getActiveParagraphs() {
        const activeDialogBlock = document.getElementById(dialogues[currentDialogueIndex].id);
        return activeDialogBlock ? Array.from(activeDialogBlock.querySelectorAll('p')) : [];
    }

    function clearHighlight() {
        document.querySelectorAll('.LGFran_highlight').forEach(p => {
            p.classList.remove('LGFran_highlight');
        });
    }

    function highlightParagraph(paragraph) {
        clearHighlight();
        if (paragraph) {
            paragraph.classList.add('LGFran_highlight');
            paragraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Função para iniciar a fala de um parágrafo
    function speakParagraph(paragraph, isRepetition = false) {
        if (paragraph) {
            const originalTextSpan = paragraph.querySelector('.LGFran_original-text');
            if (originalTextSpan) {
                const textToSpeak = originalTextSpan.textContent;
                highlightParagraph(paragraph);
                speakText(textToSpeak, 1.0, isRepetition);
            }
        }
    }

    // Função para avançar para o próximo parágrafo (usado no modo normal e loop de parágrafo)
    function highlightNextParagraph(isLooping = false) {
        const paragraphs = getActiveParagraphs();
        if (paragraphs.length === 0) return;

        currentParagraphIndex++;
        if (currentParagraphIndex >= paragraphs.length) {
            currentParagraphIndex = 0; // Volta ao início para loop

            if (!loopMode && !isLooping) { // Se não estiver em loop, para ao chegar ao fim
                stopSpeaking();
                return;
            }
        }
        speakParagraph(paragraphs[currentParagraphIndex]);
    }

    // Função para voltar para o parágrafo anterior
    function highlightPrevParagraph() {
        const paragraphs = getActiveParagraphs();
        if (paragraphs.length === 0) return;

        currentParagraphIndex--;
        if (currentParagraphIndex < 0) {
            currentParagraphIndex = paragraphs.length - 1;
        }
        speakParagraph(paragraphs[currentParagraphIndex]);
    }

    // Inicializa o diálogo atual, esconde os outros e atualiza o título
    function initializeDialog() {
        stopSpeaking();
        clearHighlight();
        dialogBlocks.forEach(block => block.classList.add('LGFran_hidden'));
        const activeDialogBlock = document.getElementById(dialogues[currentDialogueIndex].id);
        if (activeDialogBlock) {
            activeDialogBlock.classList.remove('LGFran_hidden');
            dialogTitle.textContent = dialogues[currentDialogueIndex].title;
            currentParagraphIndex = -1;
            abStartParagraphIndex = -1;
            abEndParagraphIndex = -1;
            // Garante que os modos são desativados visualmente e logicamente
            toggleABModeButton.classList.remove('LGFran_active');
            abMode = false;
        }
        repWordButton.classList.remove('LGFran_active');
        repFrasButton.classList.remove('LGFran_active');
        repetitionMode = '';
        toggleLoopButton.classList.remove('LGFran_active');
        loopMode = false;
        time4Button.classList.remove('LGFran_active'); // Desativa o botão 4s
        delayMode = false;
        toggleMuteButton.classList.remove('LGFran_active');
        isMuted = false;
        toggleMuteButton.innerHTML = '🔇'; // Resetar ícone
        lastClickedWord = '';
        lastClickedPhraseParagraph = null;
    }

    // --- Lógica de Repetição em Loop (centralizada) ---
    function handleLoopRepetition() {
        if (!loopMode) {
            stopSpeaking();
            return;
        }

        if (repetitionMode === 'word' && lastClickedWord) {
            speakText(lastClickedWord, 0.9, true); // True para isRepetition
        } else if (repetitionMode === 'phrase' && lastClickedPhraseParagraph) {
            speakParagraph(lastClickedPhraseParagraph, true); // True para isRepetition
        } else if (abMode) {
            // Se AB está ativo e Loop também, o AB tem prioridade sobre o loop de parágrafo
            playABSegment(); // Chama a função de loop AB
        }
        else {
            // Comportamento padrão de loop de parágrafo se nenhum modo de repetição de palavra/frase estiver ativo
            highlightNextParagraph(true); // True para isLooping
        }
    }


    // --- Event Listeners ---

    playButton.addEventListener('click', () => {
        if (!speaking && !paused) {
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0) {
                if (loopMode && (repetitionMode === 'word' || repetitionMode === 'phrase')) {
                    // Se loop e repetição de palavra/frase estão ativos, mas nada foi clicado ainda
                    if (repetitionMode === 'word' && !lastClickedWord) {
                        alert('Por favor, clique em uma palavra no texto para iniciar a repetição em loop.');
                        return;
                    } else if (repetitionMode === 'phrase' && !lastClickedPhraseParagraph) {
                        alert('Por favor, clique em uma frase no texto para iniciar a repetição em loop.');
                        return;
                    }
                    handleLoopRepetition(); // Inicia a repetição em loop
                } else if (abMode) {
                    playABSegment(); // Inicia o modo AB
                }
                else {
                    // Comportamento normal de play
                    if (currentParagraphIndex === -1) {
                        currentParagraphIndex = 0;
                    }
                    speakParagraph(paragraphs[currentParagraphIndex]);
                }
            }
        } else if (paused) {
            resumeSpeaking();
        } else if (speaking) {
            stopSpeaking(); // Parar e reiniciar (comportamento de resetar para o início do parágrafo atual)
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0 && currentParagraphIndex !== -1) {
                if (loopMode && (repetitionMode === 'word' || repetitionMode === 'phrase')) {
                     handleLoopRepetition(); // Reinicia a repetição em loop
                } else if (abMode) {
                    playABSegment(); // Reinicia o modo AB
                } else {
                    speakParagraph(paragraphs[currentParagraphIndex]);
                }
            }
        }
        playButton.classList.add('LGFran_active');
        pauseButton.classList.remove('LGFran_active');
    });

    pauseButton.addEventListener('click', () => {
        pauseSpeaking();
    });

    nextSegmentButton.addEventListener('click', () => {
        stopSpeaking();
        highlightNextParagraph();
        // Limpa o estado da última palavra/frase clicada ao avançar
        lastClickedWord = '';
        lastClickedPhraseParagraph = null;
    });

    prevSegmentButton.addEventListener('click', () => {
        stopSpeaking();
        highlightPrevParagraph();
        // Limpa o estado da última palavra/frase clicada ao retroceder
        lastClickedWord = '';
        lastClickedPhraseParagraph = null;
    });

    repWordButton.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'word') ? '' : 'word';
        repWordButton.classList.toggle('LGFran_active', repetitionMode === 'word');
        repFrasButton.classList.remove('LGFran_active');
        console.log('Modo de repetição de palavra:', repetitionMode === 'word' ? 'ativado' : 'desativado');
        stopSpeaking();
        toggleABModeButton.classList.remove('LGFran_active');
        abMode = false;
        abStartParagraphIndex = -1;
        abEndParagraphIndex = -1;
        // Limpa a última palavra clicada se o modo for desativado
        if (repetitionMode !== 'word') {
            lastClickedWord = '';
        }
        lastClickedPhraseParagraph = null; // Garante que o outro modo de repetição esteja limpo
    });

    repFrasButton.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'phrase') ? '' : 'phrase';
        repFrasButton.classList.toggle('LGFran_active', repetitionMode === 'phrase');
        repWordButton.classList.remove('LGFran_active');
        console.log('Modo de repetição de frase:', repetitionMode === 'phrase' ? 'ativado' : 'desativado');
        stopSpeaking();
        toggleABModeButton.classList.remove('LGFran_active');
        abMode = false;
        abStartParagraphIndex = -1;
        abEndParagraphIndex = -1;
        // Limpa a última frase clicada se o modo for desativado
        if (repetitionMode !== 'phrase') {
            lastClickedPhraseParagraph = null;
        }
        lastClickedWord = ''; // Garante que o outro modo de repetição esteja limpo
    });

    toggleLoopButton.addEventListener('click', () => {
        loopMode = !loopMode;
        toggleLoopButton.classList.toggle('LGFran_active', loopMode);
        console.log('Modo Loop:', loopMode ? 'ativado' : 'desativado');
        stopSpeaking(); // Sempre para a fala atual ao alternar o loop

        // Ao ativar/desativar o loop, se os modos de repetição de palavra/frase já estiverem ativos,
        // ele tentará iniciar/parar a repetição em loop imediatamente
        if (loopMode && (repetitionMode === 'word' && lastClickedWord || repetitionMode === 'phrase' && lastClickedPhraseParagraph)) {
            handleLoopRepetition();
        } else if (loopMode && !abMode) {
            // Se loop ativado e não está em modo AB e não tem repetição de palavra/frase definida
            // Começa a repetir o parágrafo atual
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0) {
                if (currentParagraphIndex === -1) {
                    currentParagraphIndex = 0; // Começa do primeiro se nenhum selecionado
                }
                speakParagraph(paragraphs[currentParagraphIndex]);
            }
        }
        // Ao ativar/desativar o loop, desativa o modo AB
        toggleABModeButton.classList.remove('LGFran_active');
        abMode = false;
        abStartParagraphIndex = -1;
        abEndParagraphIndex = -1;
    });

    // Novo Event Listener para o botão de 4 segundos
    time4Button.addEventListener('click', () => {
        delayMode = !delayMode;
        time4Button.classList.toggle('LGFran_active', delayMode);
        console.log('Modo de espera de 4s:', delayMode ? 'ativado' : 'desativado');

        // Se o loop já estiver ativo e houver uma repetição em andamento, reinicia para aplicar o delay
        if (loopMode && speaking) {
            stopSpeaking();
            handleLoopRepetition();
        } else if (loopMode && paused) {
            // Se estava pausado no loop, não inicia a fala, mas prepara o próximo resume com delay
            // A lógica de resume já lida com o delayMode
        }
    });


    toggleABModeButton.addEventListener('click', () => {
        abMode = !abMode;
        toggleABModeButton.classList.toggle('LGFran_active', abMode);
        stopSpeaking();
        abStartParagraphIndex = -1;
        abEndParagraphIndex = -1;
        clearHighlight();

        // Ao ativar este modo, desativa repetição de palavra/frase e loop visualmente e logicamente
        repWordButton.classList.remove('LGFran_active');
        repFrasButton.classList.remove('LGFran_active');
        repetitionMode = '';
        toggleLoopButton.classList.remove('LGFran_active');
        loopMode = false;
        time4Button.classList.remove('LGFran_active'); // Desativa o botão 4s
        delayMode = false;

        if (abMode) {
            alert('Modo AB ativado. Clique no início e no fim do trecho que deseja repetir.');
        } else {
            alert('Modo AB desativado.');
        }
    });

    toggleMuteButton.addEventListener('click', () => {
        isMuted = !isMuted;
        toggleMuteButton.innerHTML = isMuted ? '🔊' : '🔇'; // Altera o ícone
        toggleMuteButton.classList.toggle('LGFran_active', isMuted); // Ativa/desativa a classe
        if (isMuted) {
            stopSpeaking();
        } else {
            // Se desmutar, pode retomar a fala se estava pausada e era para estar falando
            if (currentUtterance && !speechSynthesis.speaking && paused) {
                resumeSpeaking();
            }
        }
    });

    changeAudioButton.addEventListener('click', () => {
        currentDialogueIndex = (currentDialogueIndex + 1) % dialogues.length;
        initializeDialog();
    });

    // Clique em um parágrafo para iniciar a leitura ou definir o modo AB
    dialogContent.addEventListener('click', (event) => {
        const clickedParagraph = event.target.closest('p');
        if (!clickedParagraph) return;

        const paragraphs = getActiveParagraphs();
        const index = paragraphs.indexOf(clickedParagraph);

        if (index === -1) return;

        currentParagraphIndex = index;

        // Limpa lastClickedWord/PhraseParagraph para evitar repetição indesejada
        lastClickedWord = '';
        lastClickedPhraseParagraph = null;

        // Desativa modos de repetição e loop se um parágrafo é clicado para reprodução normal
        // Apenas se não estiver em modo AB ou de repetição (word/phrase)
        if (!abMode && repetitionMode === '' && !loopMode) {
            toggleLoopButton.classList.remove('LGFran_active');
            // Também desativa os botões de repetição visualmente
            repWordButton.classList.remove('LGFran_active');
            repFrasButton.classList.remove('LGFran_active');
        }


        if (abMode) {
            if (abStartParagraphIndex === -1) {
                abStartParagraphIndex = index;
                highlightParagraph(clickedParagraph);
                alert('Início do trecho AB definido.');
            } else if (abEndParagraphIndex === -1) {
                abEndParagraphIndex = index;
                if (abStartParagraphIndex > abEndParagraphIndex) {
                    [abStartParagraphIndex, abEndParagraphIndex] = [abEndParagraphIndex, abStartParagraphIndex];
                }
                highlightParagraph(paragraphs[abEndParagraphIndex]);
                alert('Fim do trecho AB definido. Reproduzindo...');
                playABSegment();
            } else {
                abStartParagraphIndex = index;
                abEndParagraphIndex = -1;
                highlightParagraph(clickedParagraph);
                alert('Início do trecho AB redefinido. Clique no novo fim.');
            }
        } else if (repetitionMode === 'phrase') {
            lastClickedPhraseParagraph = clickedParagraph; // Salva o parágrafo para loop futuro
            if (loopMode) {
                handleLoopRepetition(); // Inicia o loop de frase
            } else {
                stopSpeaking();
                speakParagraph(clickedParagraph, true); // Repetição de frase única
            }
        } else if (repetitionMode === 'word') {
            if (event.target.classList.contains('LGFran_original-text')) {
                const word = getWordAtPoint(event.target, event.clientX, event.clientY);
                if (word) {
                    lastClickedWord = word; // Salva a palavra para loop futuro
                    if (loopMode) {
                        handleLoopRepetition(); // Inicia o loop de palavra
                    } else {
                        stopSpeaking();
                        speakText(word, 0.9, true); // Repetição de palavra única
                    }
                } else {
                    // Fallback para frase se palavra não for encontrada, mas ainda dentro do modo word
                    lastClickedPhraseParagraph = clickedParagraph;
                    if (loopMode) {
                        speakParagraph(clickedParagraph, true); // Inicia o loop de frase como fallback
                    } else {
                        speakParagraph(clickedParagraph, true); // Fala a frase como fallback
                    }
                }
            } else {
                // Fallback para frase se clique não for em span, mas ainda dentro do modo word
                lastClickedPhraseParagraph = clickedParagraph;
                if (loopMode) {
                    speakParagraph(clickedParagraph, true); // Inicia o loop de frase como fallback
                } else {
                    speakParagraph(clickedParagraph, true); // Fala a frase como fallback
                }
            }
        } else {
            // Comportamento padrão: apenas clica e começa a ler dali para a frente
            stopSpeaking();
            speakParagraph(clickedParagraph);
        }
    });

    // Função auxiliar para capturar a palavra clicada
    function getWordAtPoint(element, clientX, clientY) {
        const range = document.caretRangeFromPoint(clientX, clientY);
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
            const textNode = range.startContainer;
            const text = textNode.textContent;
            const offset = range.startOffset;

            // Encontra o início da palavra
            let start = offset;
            while (start > 0 && /\S/.test(text[start - 1])) {
                start--;
            }

            // Encontra o fim da palavra
            let end = offset;
            while (end < text.length && /\S/.test(text[end])) {
                end++;
            }
            return text.substring(start, end);
        }
        return null;
    }

    // --- Funções de Modo AB ---
    function playABSegment() {
        const paragraphs = getActiveParagraphs();
        if (abStartParagraphIndex !== -1 && abEndParagraphIndex !== -1) {
            let currentABIndex = abStartParagraphIndex;

            const speakNextABParagraph = () => {
                if (!abMode || isMuted || !loopMode) { // Adiciona !loopMode para parar se o loop for desativado
                    stopSpeaking();
                    return;
                }

                if (currentABIndex <= abEndParagraphIndex) {
                    const paragraph = paragraphs[currentABIndex];
                    if (paragraph) {
                        const originalTextSpan = paragraph.querySelector('.LGFran_original-text');
                        if (originalTextSpan) {
                            const textToSpeak = originalTextSpan.textContent;
                            highlightParagraph(paragraph);

                            currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
                            currentUtterance.lang = 'fr-FR';
                            if (preferredVoice) {
                                currentUtterance.voice = preferredVoice;
                            }
                            currentUtterance.onend = () => {
                                currentABIndex++;
                                if (delayMode) { // Aplica delay no modo AB se delayMode estiver ativo
                                    loopTimeout = setTimeout(() => {
                                        speakNextABParagraph();
                                    }, 4000);
                                } else {
                                    speakNextABParagraph();
                                }
                            };
                            currentUtterance.onerror = (event) => {
                                console.error('Erro na síntese de fala no modo AB:', event.error);
                                stopSpeaking();
                            };
                            speechSynthesis.speak(currentUtterance);
                            speaking = true;
                            paused = false;
                        }
                    }
                } else {
                    currentABIndex = abStartParagraphIndex; // Volta para o início do segmento AB
                    if (delayMode) { // Aplica delay antes de recomeçar o segmento AB inteiro
                        loopTimeout = setTimeout(() => {
                            speakNextABParagraph();
                        }, 4000);
                    } else {
                        speakNextABParagraph();
                    }
                }
            };
            stopSpeaking();
            currentParagraphIndex = abStartParagraphIndex;
            speakNextABParagraph();
        } else {
            alert('Por favor, selecione um início e fim válidos para o modo AB clicando nos parágrafos.');
            abMode = false;
            toggleABModeButton.classList.remove('LGFran_active');
        }
    }

    // Inicializa o primeiro diálogo ao carregar a página
    initializeDialog();
});