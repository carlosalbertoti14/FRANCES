document.addEventListener('DOMContentLoaded', function() {
    // Endereço de e-mail para onde as mensagens serão enviadas
    const recipientEmail = "suportecalp@gmail.com"; 

    // Pega o botão pelo seu ID
    const sendEmailButton = document.getElementById('sendEmailButton');

    // Adiciona um "ouvinte de evento" (event listener) para o clique do botão
    if (sendEmailButton) { // Garante que o botão existe antes de adicionar o listener
        sendEmailButton.addEventListener('click', function() {
            // Pega os valores dos campos de input
            const subject = document.getElementById('subjectInput').value;
            const message = document.getElementById('messageInput').value;

            // Codifica os valores para URL, garantindo que caracteres especiais e espaços funcionem corretamente
            const encodedSubject = encodeURIComponent(subject);
            const encodedMessage = encodeURIComponent(message);

            // Constrói o link mailto:
            const mailtoLink = `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedMessage}`;

            // Redireciona o navegador para o link mailto:
            window.location.href = mailtoLink;
        });
    } else {
       /*  console.error('Botão de enviar e-mail não encontrado! Verifique o ID "sendEmailButton".'); */
    }
});