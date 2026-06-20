"""
Авторизация: регистрация и вход пользователей.
POST /auth
body: { action: "register"|"login", username, password }
"""
import json
import os
import psycopg2

SCHEMA = 't_p51500523_user_profile_pass_sy'
OWNER = 'Lavrov1yList'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body)}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    data = json.loads(event.get('body') or '{}')
    action = data.get('action')
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return resp(400, {'error': 'Введите никнейм и пароль'})

    conn = get_conn()
    cur = conn.cursor()

    if action == 'register':
        cur.execute(f"SELECT username FROM {SCHEMA}.users WHERE lower(username) = lower(%s)", (username,))
        if cur.fetchone():
            conn.close()
            return resp(409, {'error': 'Этот никнейм уже занят'})
        is_admin = username == OWNER
        cur.execute(
            f"INSERT INTO {SCHEMA}.users (username, password, is_admin, admin_granted_by, coins) VALUES (%s, %s, %s, %s, 0)",
            (username, password, is_admin, None)
        )
        conn.commit()
        conn.close()
        return resp(200, {'username': username, 'isAdmin': is_admin, 'adminGrantedBy': None, 'coins': 0})

    elif action == 'login':
        cur.execute(f"SELECT username, password, is_admin, admin_granted_by, coins FROM {SCHEMA}.users WHERE username = %s", (username,))
        row = cur.fetchone()
        conn.close()
        if not row or row[1] != password:
            return resp(401, {'error': 'Неверный никнейм или пароль'})
        return resp(200, {'username': row[0], 'isAdmin': row[2], 'adminGrantedBy': row[3], 'coins': row[4]})

    return resp(400, {'error': 'Неизвестное действие'})
