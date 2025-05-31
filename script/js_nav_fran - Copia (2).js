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
    const time4Button = document.getElementById('LGFran_time4');
    const slowDownAudioButton = document.getElementById('LGFran_slowDownAudio'); // Novo botão para desacelerar

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
    let clickDelayTimeout = null; // Novo timeout para o atraso ao clicar

    let currentAudioRate = 1.0; // Velocidade inicial do áudio
    let isSlowed = false; // Para controlar se o áudio está desacelerado

    // Variáveis para armazenar a última palavra/frase clicada para repetição em loop
    let lastClickedWord = '';
    let lastClickedPhraseParagraph = null; // Armazena o elemento <p> da frase clicada

    const dialogues = [
        { id: 'LGFran_dialog_Dialogo_do_Cafe', title: 'Diálogo do Café' },
        { id: 'LGFran_dialog_Caio_et_Ayheon_Vieux_Amis', title: 'Caio e Ayheon - Velhos Amigos' },
        { id: 'LGFran_dialog_Caio_et_la_Francaise', title: 'Caio e a Francesa' },
        { id: 'LGFran_dialog_Parler_de_Relations_Amoureuses', title: 'Parler de Relations Amoureuses' }
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
    function speakText(text, rate = currentAudioRate, isRepetition = false) { // Usando currentAudioRate como padrão
        if (isMuted) {
            speaking = false;
            return;
        }

        speechSynthesis.cancel(); // Cancela qualquer fala anterior
        clearTimeout(loopTimeout); // Limpa o timeout de loop existente
        clearTimeout(clickDelayTimeout); // Limpa o timeout de clique, se houver

        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = 'fr-FR';
        currentUtterance.rate = rate; // Agora usa o rate passado (ou currentAudioRate por padrão)

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
                    }, 4000); // 4 segundos de espera entre as repetições do loop
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
        clearTimeout(clickDelayTimeout); // Limpa o timeout de clique também
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
            clearTimeout(clickDelayTimeout); // Limpa o timeout de clique ao pausar
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
                    // Ao retomar, respeita o delayMode se ele estiver ativo
                    if (delayMode) {
                        clearTimeout(clickDelayTimeout); // Garante que não haja outros pendentes
                        clickDelayTimeout = setTimeout(() => {
                            speakParagraph(paragraph, false, true); // O terceiro param força o delay
                        }, 4000);
                    } else {
                        speakParagraph(paragraph);
                    }
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
    // Adicionado `forceDelay` para forçar o atraso de 4s independentemente do loopMode
    function speakParagraph(paragraph, isRepetition = false, forceDelay = false) {
        if (paragraph) {
            const originalTextSpan = paragraph.querySelector('.LGFran_original-text');
            if (originalTextSpan) {
                const textToSpeak = originalTextSpan.textContent;
                highlightParagraph(paragraph);

                // Se delayMode está ativo OU forceDelay é true (para cliques), agende a fala
                if (delayMode && (loopMode || forceDelay)) { // `forceDelay` é a chave aqui para cliques
                    clearTimeout(clickDelayTimeout); // Limpa qualquer atraso de clique anterior
                    clickDelayTimeout = setTimeout(() => {
                        speakText(textToSpeak, currentAudioRate, isRepetition);
                    }, 4000); // Atraso de 4 segundos antes de falar
                } else {
                    speakText(textToSpeak, currentAudioRate, isRepetition);
                }
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
        speakParagraph(paragraphs[currentParagraphIndex], false, false); // Nao força delay aqui, o loopMode já trata
    }

    // Função para voltar para o parágrafo anterior
    function highlightPrevParagraph() {
        const paragraphs = getActiveParagraphs();
        if (paragraphs.length === 0) return;

        currentParagraphIndex--;
        if (currentParagraphIndex < 0) {
            currentParagraphIndex = paragraphs.length - 1;
        }
        speakParagraph(paragraphs[currentParagraphIndex], false, false); // Nao força delay aqui
    }

    // Inicializa o diálogo atual, esconde os outros e atualiza o título
    function initializeDialog() {
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
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
        slowDownAudioButton.classList.remove('LGFran_active'); // Desativa o botão de desacelerar
        isSlowed = false;
        currentAudioRate = 1.0; // Reinicia a velocidade do áudio
        toggleMuteButton.classList.remove('LGFran_active');
        isMuted = false;
        toggleMuteButton.innerHTML = '🔊'; // Resetar ícone
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
            // Atraso já é tratado dentro de speakText se delayMode for true
            speakText(lastClickedWord, currentAudioRate, true); // Usa currentAudioRate
        } else if (repetitionMode === 'phrase' && lastClickedPhraseParagraph) {
            // Atraso já é tratado dentro de speakParagraph se delayMode for true
            speakParagraph(lastClickedPhraseParagraph, true);
        } else if (abMode) {
            // Se AB está ativo e Loop também, o AB tem prioridade sobre o loop de parágrafo
            playABSegment(); // Chama a função de loop AB, que já lida com o delayMode
        }
        else {
            // Comportamento padrão de loop de parágrafo se nenhum modo de repetição de palavra/frase estiver ativo
            highlightNextParagraph(true); // True para isLooping, e delay é tratado em speakParagraph
        }
    }


    // --- Event Listeners ---

    playButton.addEventListener('click', () => {
        if (!speaking && !paused) {
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0) {
                // Se o delayMode está ativo E não é modo AB, adiciona o atraso inicial
                if (delayMode && !abMode && !(repetitionMode === 'word' && !lastClickedWord) && !(repetitionMode === 'phrase' && !lastClickedPhraseParagraph)) {
                    stopSpeaking(); // Limpa qualquer coisa anterior
                    clearTimeout(clickDelayTimeout); // Limpa o timeout de clique
                    clickDelayTimeout = setTimeout(() => {
                        if (loopMode && (repetitionMode === 'word' || repetitionMode === 'phrase')) {
                            handleLoopRepetition();
                        } else if (abMode) {
                            playABSegment();
                        } else {
                             if (currentParagraphIndex === -1) {
                                 currentParagraphIndex = 0;
                            }
                            speakParagraph(paragraphs[currentParagraphIndex]);
                        }
                    }, 4000); // Espera 4s antes de iniciar a primeira fala
                } else {
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
            }
        } else if (paused) {
            resumeSpeaking();
        } else if (speaking) {
            // Se já está falando, parar e reiniciar (comportamento de resetar para o início do parágrafo atual)
            stopSpeaking();
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0 && currentParagraphIndex !== -1) {
                // Ao reiniciar, se delayMode ativo, adicione o delay inicial
                if (delayMode && !abMode && (loopMode && (repetitionMode === 'word' || repetitionMode === 'phrase'))) {
                     clearTimeout(clickDelayTimeout);
                     clickDelayTimeout = setTimeout(() => {
                        handleLoopRepetition();
                     }, 4000);
                } else if (delayMode && !abMode) { // Reiniciar um parágrafo normal com delay
                    clearTimeout(clickDelayTimeout);
                    clickDelayTimeout = setTimeout(() => {
                        speakParagraph(paragraphs[currentParagraphIndex]);
                    }, 4000);
                }
                else if (loopMode && (repetitionMode === 'word' || repetitionMode === 'phrase')) {
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
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
        highlightNextParagraph();
        // Limpa o estado da última palavra/frase clicada ao avançar
        lastClickedWord = '';
        lastClickedPhraseParagraph = null;
    });

    prevSegmentButton.addEventListener('click', () => {
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
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
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
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
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
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
                // Chama speakParagraph, que vai lidar com o delayMode
                speakParagraph(paragraphs[currentParagraphIndex], false, true); // Força delay na primeira execução se delayMode ativo
            }
        }
        // Ao ativar/desativar o loop, desativa o modo AB
        toggleABModeButton.classList.remove('LGFran_active');
        abMode = false;
        abStartParagraphIndex = -1;
        abEndParagraphIndex = -1;
    });

    // Event Listener para o botão de 4 segundos
    time4Button.addEventListener('click', () => {
        delayMode = !delayMode;
        time4Button.classList.toggle('LGFran_active', delayMode);
        console.log('Modo de espera de 4s:', delayMode ? 'ativado' : 'desativado');

        // Se o loop já estiver ativo e houver uma repetição em andamento, reinicia para aplicar o delay
        if (loopMode && speaking) {
            stopSpeaking(); // Para a fala atual e limpa o timeout
            // A proxima fala do loop vai pegar o delayMode automaticamente
            handleLoopRepetition();
        } else if (loopMode && paused) {
            // Se estava pausado no loop, não inicia a fala, mas prepara o próximo resume com delay
            // A lógica de resume já lida com o delayMode
        }
    });

    // NOVO Event Listener para o botão de desacelerar o áudio
    slowDownAudioButton.addEventListener('click', () => {
        isSlowed = !isSlowed; // Alterna o estado de desaceleração
        currentAudioRate = isSlowed ? 0.70 : 1.0; // Define a taxa de acordo com o estado
        slowDownAudioButton.classList.toggle('LGFran_active', isSlowed); // Ativa/desativa a classe visual

        console.log('Velocidade do áudio definida para:', currentAudioRate);

        // Se algo estiver falando, para e reinicia para aplicar a nova velocidade imediatamente
        if (speechSynthesis.speaking) {
            stopSpeaking();
            if (loopMode) {
                handleLoopRepetition();
            } else if (abMode) {
                playABSegment();
            } else if (currentParagraphIndex !== -1) {
                const paragraphs = getActiveParagraphs();
                if (paragraphs[currentParagraphIndex]) {
                    speakParagraph(paragraphs[currentParagraphIndex], false, delayMode); // Re-fala o parágrafo atual com a nova taxa
                }
            }
        } else if (paused && currentParagraphIndex !== -1) {
            // Se pausado, apenas atualiza a taxa para quando for resumido
            // Nenhuma ação extra é necessária aqui, pois o resumeSpeaking usará a nova taxa
        } else if (!speechSynthesis.speaking && currentParagraphIndex !== -1 && (loopMode || abMode)) {
            // Se não estava falando, mas estava em modo loop ou AB (ex: após carregamento inicial ou pausa)
            // Reinicia o fluxo de fala para aplicar a nova velocidade.
            if (loopMode) {
                handleLoopRepetition();
            } else if (abMode) {
                playABSegment();
            }
        }
    });

    toggleABModeButton.addEventListener('click', () => {
        abMode = !abMode;
        toggleABModeButton.classList.toggle('LGFran_active', abMode);
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
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
        slowDownAudioButton.classList.remove('LGFran_active'); // Desativa o botão de desacelerar
        isSlowed = false;
        currentAudioRate = 1.0; // Reinicia a velocidade do áudio

        if (abMode) {
            alert('Modo AB ativado. Clique no início e no fim do trecho que deseja repetir.');
        } else {
            alert('Modo AB desativado.');
        }
    });

    toggleMuteButton.addEventListener('click', () => {
        isMuted = !isMuted;
        toggleMuteButton.innerHTML = isMuted ? '🔇' : '🔊'; // Altera o ícone
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
        initializeDialog(); // Garante que a fala anterior e o timeout sejam cancelados
    });

    // Clique em um parágrafo para iniciar a leitura ou definir o modo AB
    dialogContent.addEventListener('click', (event) => {
        const clickedParagraph = event.target.closest('p');
        if (!clickedParagraph) return;

        const paragraphs = getActiveParagraphs();
        const index = paragraphs.indexOf(clickedParagraph);

        if (index === -1) return;

        // Limpa tudo antes de processar o novo clique
        stopSpeaking();

        currentParagraphIndex = index;

        // Limpa lastClickedWord/PhraseParagraph para evitar repetição indesejada
        lastClickedWord = '';
        lastClickedPhraseParagraph = null;

        // Desativa modos de repetição e loop se um parágrafo é clicado para reprodução normal
        // Apenas se não estiver em modo AB ou de repetição (word/phrase)
        if (!abMode && repetitionMode === '' && !loopMode) {
            toggleLoopButton.classList.remove('LGFran_active');
            loopMode = false;
            time4Button.classList.remove('LGFran_active'); // Desativa o botão 4s visualmente
            delayMode = false; // Desativa o modo 4s logicamente
            repWordButton.classList.remove('LGFran_active');
            repFrasButton.classList.remove('LGFran_active');
            repetitionMode = '';
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
            // Se loopMode está ativo, handleLoopRepetition vai cuidar do delay.
            // Se não, speakParagraph vai aplicar o delay se delayMode estiver true.
            if (loopMode) {
                handleLoopRepetition();
            } else {
                speakParagraph(clickedParagraph, true, delayMode); // Passa delayMode como forceDelay
            }
        } else if (repetitionMode === 'word') {
            if (event.target.classList.contains('LGFran_original-text')) {
                const word = getWordAtPoint(event.target, event.clientX, event.clientY);
                if (word) {
                    lastClickedWord = word; // Salva a palavra para loop futuro
                    if (loopMode) {
                        handleLoopRepetition();
                    } else {
                        // speakText agora lida com o delayMode internamente,
                        // mas precisamos garantir que o delay seja aplicado no primeiro clique.
                        // A função speakText já possui a lógica de delayMode
                        speakText(word, currentAudioRate, true); // Usa currentAudioRate
                    }
                } else {
                    // Fallback para frase se palavra não for encontrada, mas ainda dentro do modo word
                    lastClickedPhraseParagraph = clickedParagraph;
                    if (loopMode) {
                        speakParagraph(clickedParagraph, true); // Inicia o loop de frase como fallback
                    } else {
                        speakParagraph(clickedParagraph, true, delayMode); // Fala a frase como fallback
                    }
                }
            } else {
                // Fallback para frase se clique não for em span, mas ainda dentro do modo word
                lastClickedPhraseParagraph = clickedParagraph;
                if (loopMode) {
                    speakParagraph(clickedParagraph, true); // Inicia o loop de frase como fallback
                } else {
                    speakParagraph(clickedParagraph, true, delayMode); // Fala a frase como fallback
                }
            }
        } else {
            // Comportamento padrão: apenas clica e começa a ler dali para a frente
            // Aqui é onde você queria o delay inicial se delayMode estiver ativo
            speakParagraph(clickedParagraph, false, delayMode); // Passa delayMode como forceDelay
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
        if (abStartParagraphIndex === -1 || abEndParagraphIndex === -1 || paragraphs.length === 0) {
            console.warn('Modo AB não configurado corretamente.');
            return;
        }

        let currentABIndex = abStartParagraphIndex;
        // Função interna para tocar o próximo parágrafo no segmento AB
        function playNextABParagraph() {
            if (currentABIndex <= abEndParagraphIndex) {
                const paragraph = paragraphs[currentABIndex];
                if (paragraph) {
                    highlightParagraph(paragraph);
                    const originalTextSpan = paragraph.querySelector('.LGFran_original-text');
                    const textToSpeak = originalTextSpan ? originalTextSpan.textContent : '';

                    speakText(textToSpeak, currentAudioRate, false); // Usa currentAudioRate

                    // Avança para o próximo parágrafo no segmento AB quando a fala termina
                    currentUtterance.onend = () => {
                        speaking = false;
                        paused = false;
                        currentABIndex++;
                        if (currentABIndex <= abEndParagraphIndex) {
                            if (delayMode) {
                                clearTimeout(loopTimeout);
                                loopTimeout = setTimeout(playNextABParagraph, 4000); // Adiciona delay
                            } else {
                                playNextABParagraph(); // Continua para o próximo sem delay
                            }
                        } else {
                            // Se o modo AB estiver em loop, reinicia o segmento
                            if (loopMode) {
                                if (delayMode) {
                                    clearTimeout(loopTimeout);
                                    loopTimeout = setTimeout(() => {
                                        currentABIndex = abStartParagraphIndex;
                                        playNextABParagraph();
                                    }, 4000); // Delay antes de recomeçar o loop AB
                                } else {
                                    currentABIndex = abStartParagraphIndex;
                                    playNextABParagraph();
                                }
                            } else {
                                stopSpeaking(); // Para a fala se não for para repetir
                                toggleABModeButton.classList.remove('LGFran_active'); // Desativa o modo AB visualmente
                                abMode = false;
                                abStartParagraphIndex = -1;
                                abEndParagraphIndex = -1;
                                currentParagraphIndex = -1; // Resetar para garantir o comportamento normal
                            }
                        }
                    };
                }
            }
        }

        // Inicia o playback do segmento AB
        stopSpeaking(); // Garante que qualquer fala anterior seja parada
        // O atraso inicial para o modo AB quando delayMode está ativo
        if (delayMode) {
            clearTimeout(clickDelayTimeout);
            clickDelayTimeout = setTimeout(playNextABParagraph, 4000);
        } else {
            playNextABParagraph();
        }
    }


    // --- Inicialização ---
    initializeDialog();
});