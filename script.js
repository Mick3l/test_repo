// Инициализация Telegram Mini App
document.addEventListener('DOMContentLoaded', function() {
    // Получаем экземпляр Telegram WebApp
    const tg = window.Telegram.WebApp;

    // Сообщаем Telegram, что приложение готово
    tg.ready();

    // Устанавливаем основную кнопку, если нужно
    // tg.MainButton.setText('Начать игру').show();

    // Расширяем приложение на всю высоту экрана
    tg.expand();

    // Применяем цветовую тему Telegram
    applyTelegramTheme();

    // Добавляем эффект нажатия на кнопки
    const buttons = document.querySelectorAll('.game-button');
    buttons.forEach(button => {
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

// Функция применения темы Telegram
function applyTelegramTheme() {
    const tg = window.Telegram.WebApp;

    // Если тема темная, добавляем класс dark-theme
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}
