
document.addEventListener('DOMContentLoaded', function() {
    
    const tg = window.Telegram.WebApp;
    
    tg.ready();
    tg.expand();

    let user_id = tg.initDataUnsafe?.user?.id || tg.initDataUnsafe?.user_id;
    if (!user_id) {
        alert("User not identified. Try launching from Telegram.");
        return;
    }
    
    applyTelegramTheme();

    const initData = encodeURIComponent(tg.initData || '');
    
    const buttons = document.querySelectorAll('.game-button');
    buttons.forEach(button => {
        let base = button.getAttribute('href');
        if (base && !base.match(/[?&]initData=/)) {
            button.setAttribute('href', base + (base.includes('?') ? '&' : '?') + 'initData=' + initData);
        }

        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
            this.style.opacity = '0.9';
        });

        button.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
            this.style.opacity = '1';
        });
    });
});


function applyTelegramTheme() {
    const tg = window.Telegram.WebApp;

    
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}
