import sqlite3
import telebot
from telebot import types

API_TOKEN = "8194023558:AAHVlbIPSv2ExcB8ZBg4nCl3XYBB2U5zf4g"
bot = telebot.TeleBot(API_TOKEN)


# Подключение к БД
def init_db():
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        score INTEGER DEFAULT 0
    )
    ''')
    conn.commit()
    conn.close()


# Добавление пользователя в БД
def add_user(user_id, username):
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
    if cursor.fetchone() is None:
        cursor.execute('INSERT INTO users (id, username) VALUES (?, ?)', (user_id, username))
        conn.commit()
    conn.close()


# Получение топ-5 игроков
def get_top_players():
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    cursor.execute('SELECT username, score FROM users ORDER BY score DESC LIMIT 5')
    top_players = cursor.fetchall()
    conn.close()
    return top_players


@bot.message_handler(func=lambda message: message.text == "🏆 Рейтинг")
def show_rating(message):
    top_players = get_top_players()

    if not top_players:
        bot.send_message(message.chat.id, "Пока никто не играл. Будь первым! 🥇")
        return

    rating_text = "🏆 Топ-5 игроков:\n\n"
    for i, (username, score) in enumerate(top_players, 1):
        medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "🎖"
        rating_text += f"{medal} {i}. {username}: {score} очков\n"

    bot.send_message(message.chat.id, rating_text)

# Обработчик команды /start и любых сообщений
@bot.message_handler(func=lambda message: True)
def handle_message(message):
    user_id = message.from_user.id
    username = message.from_user.username or f"user_{user_id}"

    # Добавляем пользователя в базу, если его нет
    add_user(user_id, username)

    # Создаем клавиатуру с кнопками
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)

    # Кнопка для веб-приложения
    web_app_button = types.KeyboardButton("🇬🇧 Английский", web_app=types.WebAppInfo(url="https://your-webapp-url.com"))

    # Кнопка для рейтинга
    rating_button = types.KeyboardButton("🏆 Рейтинг")

    markup.add(web_app_button, rating_button)

    bot.send_message(message.chat.id, "Привет! Выбери действие:", reply_markup=markup)


if __name__ == "__main__":
    init_db()
    bot.polling(none_stop=True)
