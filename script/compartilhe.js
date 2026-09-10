document.addEventListener('DOMContentLoaded', function() {
    const shareFacebookButton = document.getElementById('shareFacebook');
    const shareWhatsappButton = document.getElementById('shareWhatsapp');
    const copyLinkButton = document.getElementById('copyLinkButton'); 
    const siteUrl = "https://idiomastxt.netlify.app/"; 
    const siteTitle = "Estudo de Idiomas"; 

    // Função para compartilhar no Facebook
    if (shareFacebookButton) {
        shareFacebookButton.addEventListener('click', function(event) {
            event.preventDefault();
            const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`;
            window.open(facebookShareUrl, '_blank', 'width=600,height=400');
        });
    }

    // Função para compartilhar no WhatsApp
    if (shareWhatsappButton) {
        shareWhatsappButton.addEventListener('click', function(event) {
            event.preventDefault();
            // MENSAGEM ATUALIZADA PARA O SEU SITE DE FRANCÊS
            const message = `Aprenda francês com diálogos interativos, leitor de áudio com repetição A-B e controle de áudio! Acesse gratuitamente: ${siteUrl}`;
            const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
            window.open(whatsappShareUrl, '_blank');
        });
    }

    // Função para copiar o link
    if (copyLinkButton) {
        copyLinkButton.addEventListener('click', function() {
            navigator.clipboard.writeText(siteUrl)
                .then(() => {
                    // Feedback visual
                    copyLinkButton.textContent = 'LINK COPIADO!';
                    copyLinkButton.style.backgroundColor = '#4CAF50'; 
                    setTimeout(() => {
                        copyLinkButton.textContent = 'COPIAR LINK';
                        copyLinkButton.style.backgroundColor = '#4681b6'; 
                    }, 2000);
                })
                .catch(err => {
                    console.error('Falha ao copiar o link: ', err);
                    alert('Erro ao copiar o link. Por favor, copie manualmente: ' + siteUrl);
                });
        });
    }
});