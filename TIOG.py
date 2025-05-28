import sqlite3
import telebot
from telebot import types
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Позволим фронту обращаться к этому API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn():
    return sqlite3.connect('game.db')


@app.post("/api/set_best_score/")
async def set_best_score(request: Request):
    data = await request.json()
    user_id = int(data['user_id'])
    game = data['game']  # 'snake' или 'modal'
    score = int(data['score'])

    conn = get_conn()
    cursor = conn.cursor()
    if game not in ('snake', 'modal'): return {"ok": False, "error": "wrong game"}
    field = 'snake_best_score' if game == 'snake' else 'modal_best_score'
    cursor.execute(f"SELECT {field} FROM users WHERE id=?", (user_id,))
    row = cursor.fetchone()
    if row is None:
        conn.close()
        return {"ok": False}
    old_score = row[0] or 0
    if score > old_score:
        cursor.execute(f"UPDATE users SET {field}=? WHERE id=?", (score, user_id))
        conn.commit()
    conn.close()
    return {"ok": True}


@app.post("/api/get_best_score/")
async def get_best_score(request: Request):
    data = await request.json()
    user_id = int(data['user_id'])
    game = data['game']
    conn = get_conn()
    field = 'snake_best_score' if game == 'snake' else 'modal_best_score'
    cursor = conn.cursor()
    cursor.execute(f"SELECT {field} FROM users WHERE id=?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return {"score": int(row[0]) if row and row[0] is not None else 0}


API_TOKEN = "8194023558:AAHVlbIPSv2ExcB8ZBg4nCl3XYBB2U5zf4g"
bot = telebot.TeleBot(API_TOKEN)


def init_db():
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        snake_best_score INTEGER DEFAULT 0,
        modal_best_score INTEGER DEFAULT 0
    )
    ''')
    conn.commit()
    conn.close()


def add_user(user_id, username):
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
    if cursor.fetchone() is None:
        cursor.execute('INSERT INTO users (id, username) VALUES (?, ?)', (user_id, username))
        conn.commit()
    conn.close()


def get_top_players():
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT
            username,
            (snake_best_score + modal_best_score) AS score
        FROM
            users
        ORDER BY score DESC LIMIT 5''')
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


@bot.message_handler(func=lambda message: True)
def handle_message(message):
    user_id = message.from_user.id
    username = message.from_user.username or f"user_{user_id}"

    add_user(user_id, username)

    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)

    web_app_button = types.KeyboardButton(
        "🇬🇧 Английский",
        web_app=types.WebAppInfo(url=f"https://mick3l.github.io/test_repo/?user_id={bot.user.id}")
    )

    rating_button = types.KeyboardButton("🏆 Рейтинг")

    markup.add(rating_button)

    bot.send_message(message.chat.id, "Привет! Выбери действие:", reply_markup=markup)


import threading
import uvicorn


def run_telegram():
    bot.polling(none_stop=True)


def run_api():
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    init_db()
    threading.Thread(target=run_api).start()
    run_telegram()
